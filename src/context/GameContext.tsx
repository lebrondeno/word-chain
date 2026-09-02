import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { GameSession, GamePlayer, LocalPlayerSession, SessionStatus } from '../types/game';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { generateRoomCode, sanitizeRoomCode } from '../lib/roomCode';
import { validateWordSubmission, getLastLetter } from '../data';
import { soundManager } from '../lib/audio';

const STORAGE_SESSION_KEY = 'word_chain_player_session_v1';

interface GameContextType {
  session: GameSession | null;
  players: GamePlayer[];
  localPlayer: LocalPlayerSession | null;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  timeRemaining: number;
  isMyTurn: boolean;
  currentTurnPlayer: GamePlayer | null;
  activePlayers: GamePlayer[];
  winnerPlayer: GamePlayer | null;
  createGame: (displayName: string, category: string) => Promise<{ success: boolean; roomCode?: string; error?: string }>;
  joinGame: (roomCode: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  startGame: () => Promise<{ success: boolean; error?: string }>;
  submitWord: (word: string) => Promise<{ success: boolean; error?: string }>;
  handleTimeout: () => Promise<void>;
  resetGame: () => Promise<{ success: boolean; error?: string }>;
  leaveGame: () => void;
  refreshState: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [localPlayer, setLocalPlayer] = useState<LocalPlayerSession | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem(STORAGE_SESSION_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(15);

  const prevTurnIndexRef = useRef<number | null>(null);
  const prevStatusRef = useRef<SessionStatus | null>(null);
  const timeoutTriggeredRef = useRef<string | null>(null);

  // Save localPlayer to localStorage
  const updateLocalPlayer = useCallback((val: LocalPlayerSession | null) => {
    setLocalPlayer(val);
    if (val) {
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(val));
    } else {
      localStorage.removeItem(STORAGE_SESSION_KEY);
    }
  }, []);

  // Fetch full game state for session
  const fetchSessionState = useCallback(async (sessionId: string) => {
    const supabase = getSupabase();
    try {
      const [{ data: sessionData, error: sessionErr }, { data: playersData, error: playersErr }] =
        await Promise.all([
          supabase.from('game_sessions').select('*').eq('id', sessionId).single(),
          supabase.from('game_players').select('*').eq('session_id', sessionId).order('joined_at', { ascending: true }),
        ]);

      if (sessionErr || !sessionData) {
        console.warn('Session not found or error:', sessionErr);
        return false;
      }

      setSession(sessionData as GameSession);
      if (playersData && !playersErr) {
        setPlayers(playersData as GamePlayer[]);
      }
      return true;
    } catch (err: unknown) {
      console.error('Error fetching session state:', err);
      return false;
    }
  }, []);

  // Restore session from localStorage on initial load
  useEffect(() => {
    let isMounted = true;
    async function restore() {
      if (!isSupabaseConfigured() || !localPlayer?.sessionId) {
        if (isMounted) setLoading(false);
        return;
      }
      setLoading(true);
      const exists = await fetchSessionState(localPlayer.sessionId);
      if (!exists && isMounted) {
        updateLocalPlayer(null);
      }
      if (isMounted) setLoading(false);
    }
    restore();
    return () => {
      isMounted = false;
    };
  }, [fetchSessionState, localPlayer?.sessionId, updateLocalPlayer]);

  // Realtime subscription setup
  useEffect(() => {
    if (!session?.id || !isSupabaseConfigured()) return;

    const supabase = getSupabase();
    const channelName = `session_realtime_${session.id}_${Date.now()}`;

    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as GameSession;
            setSession(updated);
          } else if (payload.eventType === 'DELETE') {
            setSession(null);
            setError('The game session has been closed.');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `session_id=eq.${session.id}`,
        },
        async () => {
          const { data } = await supabase
            .from('game_players')
            .select('*')
            .eq('session_id', session.id)
            .order('joined_at', { ascending: true });
          if (data) {
            setPlayers(data as GamePlayer[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // Active players
  const activePlayers = players.filter((p) => !p.is_eliminated);

  // Current turn player ID
  const turnOrder = Array.isArray(session?.turn_order) ? session.turn_order : [];
  const currentTurnPlayerId =
    turnOrder.length > 0 && session
      ? turnOrder[session.current_turn_index % turnOrder.length]
      : null;

  const currentTurnPlayer = players.find((p) => p.id === currentTurnPlayerId) || null;
  const isMyTurn = Boolean(localPlayer?.playerId && currentTurnPlayerId === localPlayer.playerId && session?.status === 'playing');

  // Winner calculation
  let winnerPlayer: GamePlayer | null = null;
  if (session?.status === 'finished') {
    if (activePlayers.length === 1) {
      winnerPlayer = activePlayers[0];
    } else if (players.length > 0) {
      winnerPlayer = activePlayers[0] || players[0];
    }
  }

  // Sound effects & Turn change detector
  useEffect(() => {
    if (!session) return;

    if (session.status === 'playing' && prevStatusRef.current === 'lobby') {
      soundManager.playTurnStart();
    } else if (session.status === 'finished' && prevStatusRef.current === 'playing') {
      soundManager.playWinner();
    }

    if (session.status === 'playing' && session.current_turn_index !== prevTurnIndexRef.current) {
      if (isMyTurn) {
        soundManager.playTurnStart();
      }
      timeoutTriggeredRef.current = null;
    }

    prevStatusRef.current = session.status;
    prevTurnIndexRef.current = session.current_turn_index;
  }, [session, isMyTurn]);

  // Turn Countdown Timer & automatic elimination trigger
  useEffect(() => {
    if (session?.status !== 'playing' || !session.turn_deadline) {
      setTimeRemaining(15);
      return;
    }

    const interval = setInterval(() => {
      const deadline = new Date(session.turn_deadline!).getTime();
      const now = Date.now();
      const diffSec = Math.max(0, Math.ceil((deadline - now) / 1000));

      setTimeRemaining(diffSec);

      if (diffSec <= 3 && diffSec > 0) {
        soundManager.playTick(true);
      } else if (diffSec <= 5 && diffSec > 3) {
        soundManager.playTick(false);
      }

      // Check timeout
      if (diffSec === 0 && currentTurnPlayerId) {
        const timeoutKey = `${session.id}_${currentTurnPlayerId}_${session.current_turn_index}`;
        if (timeoutTriggeredRef.current !== timeoutKey) {
          timeoutTriggeredRef.current = timeoutKey;
          handleTimeout();
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [session?.status, session?.turn_deadline, session?.current_turn_index, currentTurnPlayerId, session?.id]);

  // Action: Create Game
  const createGame = async (displayName: string, category: string = 'cities') => {
    setError(null);
    setLoading(true);
    const supabase = getSupabase();

    try {
      const roomCode = generateRoomCode(4);

      const { data: sessionData, error: sessionErr } = await supabase
        .from('game_sessions')
        .insert({
          room_code: roomCode,
          category,
          game_type: 'word_chain',
          status: 'lobby',
          turn_order: [],
          current_turn_index: 0,
          used_words: [],
          last_letter: null,
          turn_deadline: null,
        })
        .select()
        .single();

      if (sessionErr || !sessionData) {
        throw new Error(sessionErr?.message || 'Failed to create room. Check Supabase connection.');
      }

      const { data: playerData, error: playerErr } = await supabase
        .from('game_players')
        .insert({
          session_id: sessionData.id,
          display_name: displayName.trim() || 'Host',
          is_eliminated: false,
        })
        .select()
        .single();

      if (playerErr || !playerData) {
        throw new Error(playerErr?.message || 'Failed to register host player.');
      }

      const local: LocalPlayerSession = {
        playerId: playerData.id,
        sessionId: sessionData.id,
        roomCode: sessionData.room_code,
        displayName: playerData.display_name,
        isHost: true,
      };

      updateLocalPlayer(local);
      setSession(sessionData as GameSession);
      setPlayers([playerData as GamePlayer]);

      return { success: true, roomCode: sessionData.room_code };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error creating game';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Action: Join Game
  const joinGame = async (roomCode: string, displayName: string) => {
    setError(null);
    setLoading(true);
    const supabase = getSupabase();
    const cleanCode = sanitizeRoomCode(roomCode);

    try {
      const { data: sessionData, error: sessionErr } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('room_code', cleanCode)
        .single();

      if (sessionErr || !sessionData) {
        throw new Error('Room not found. Check the code and try again.');
      }

      if (sessionData.status !== 'lobby') {
        throw new Error('Game has already started in this room.');
      }

      const { data: playerData, error: playerErr } = await supabase
        .from('game_players')
        .insert({
          session_id: sessionData.id,
          display_name: displayName.trim() || 'Player',
          is_eliminated: false,
        })
        .select()
        .single();

      if (playerErr || !playerData) {
        throw new Error(playerErr?.message || 'Failed to join room.');
      }

      const { data: allPlayers } = await supabase
        .from('game_players')
        .select('*')
        .eq('session_id', sessionData.id)
        .order('joined_at', { ascending: true });

      const isHost = allPlayers && allPlayers.length > 0 && allPlayers[0].id === playerData.id;

      const local: LocalPlayerSession = {
        playerId: playerData.id,
        sessionId: sessionData.id,
        roomCode: sessionData.room_code,
        displayName: playerData.display_name,
        isHost: Boolean(isHost),
      };

      updateLocalPlayer(local);
      setSession(sessionData as GameSession);
      setPlayers((allPlayers || [playerData]) as GamePlayer[]);

      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error joining room';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Action: Start Game
  const startGame = async () => {
    if (!session || !localPlayer) return { success: false, error: 'No active session' };
    setError(null);
    const supabase = getSupabase();

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('start_game', {
        p_session_id: session.id,
      });

      if (!rpcErr && rpcData) {
        await fetchSessionState(session.id);
        return { success: true };
      }

      // Fallback direct mutation
      const { data: activeJoined } = await supabase
        .from('game_players')
        .select('id')
        .eq('session_id', session.id);

      if (!activeJoined || activeJoined.length < 1) {
        throw new Error('At least 1 player is required to start.');
      }

      const shuffledIds = activeJoined.map((p) => p.id).sort(() => Math.random() - 0.5);
      const deadline = new Date(Date.now() + 15000).toISOString();

      await supabase.from('game_players').update({ is_eliminated: false }).eq('session_id', session.id);

      const { data: updatedSession, error: updateErr } = await supabase
        .from('game_sessions')
        .update({
          status: 'playing',
          turn_order: shuffledIds,
          current_turn_index: 0,
          used_words: [],
          last_letter: null,
          turn_deadline: deadline,
        })
        .eq('id', session.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      setSession(updatedSession as GameSession);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start game';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Action: Submit Word
  const submitWord = async (inputWord: string) => {
    if (!session || !localPlayer) {
      return { success: false, error: 'Session not active' };
    }

    if (!isMyTurn) {
      soundManager.playError();
      return { success: false, error: 'It is not your turn!' };
    }

    const valResult = validateWordSubmission(
      inputWord,
      session.category,
      session.last_letter,
      session.used_words
    );

    if (!valResult.valid) {
      soundManager.playError();
      return { success: false, error: valResult.error || 'Invalid word' };
    }

    const formattedWord = valResult.formattedWord || inputWord.trim();
    const nextLastLetter = valResult.nextLastLetter || getLastLetter(formattedWord);
    const supabase = getSupabase();

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_word', {
        p_session_id: session.id,
        p_player_id: localPlayer.playerId,
        p_word: formattedWord,
      });

      if (!rpcErr && rpcData) {
        soundManager.playCorrect();
        await fetchSessionState(session.id);
        return { success: true };
      }

      // Direct fallback mutation
      const newWordEntry = {
        word: formattedWord.toLowerCase(),
        display_word: formattedWord,
        player_id: localPlayer.playerId,
        player_name: localPlayer.displayName,
        submitted_at: new Date().toISOString(),
      };

      const updatedUsedWords = [...(session.used_words || []), newWordEntry];

      const totalInOrder = turnOrder.length;
      let nextIndex = session.current_turn_index;
      for (let i = 1; i <= totalInOrder; i++) {
        const candidateIndex = (session.current_turn_index + i) % totalInOrder;
        const candidateId = turnOrder[candidateIndex];
        const isElim = players.find((p) => p.id === candidateId)?.is_eliminated;
        if (!isElim) {
          nextIndex = candidateIndex;
          break;
        }
      }

      const activeCount = players.filter((p) => !p.is_eliminated).length;
      const isFinished = activeCount <= 1 && totalInOrder > 1;

      const deadline = new Date(Date.now() + 15000).toISOString();

      const { data: updatedSession, error: updateErr } = await supabase
        .from('game_sessions')
        .update({
          used_words: updatedUsedWords,
          last_letter: nextLastLetter,
          current_turn_index: nextIndex,
          turn_deadline: isFinished ? null : deadline,
          status: isFinished ? 'finished' : 'playing',
        })
        .eq('id', session.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      soundManager.playCorrect();
      setSession(updatedSession as GameSession);
      return { success: true };
    } catch (err: unknown) {
      soundManager.playError();
      const message = err instanceof Error ? err.message : 'Failed to submit word';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Action: Handle Timeout
  const handleTimeout = async () => {
    if (!session || session.status !== 'playing' || !currentTurnPlayerId) return;
    const supabase = getSupabase();

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('handle_timeout', {
        p_session_id: session.id,
        p_timed_out_player_id: currentTurnPlayerId,
      });

      if (!rpcErr && rpcData) {
        if (currentTurnPlayerId === localPlayer?.playerId) {
          soundManager.playEliminated();
        }
        await fetchSessionState(session.id);
        return;
      }

      // Fallback direct mutation
      soundManager.playEliminated();

      await supabase
        .from('game_players')
        .update({ is_eliminated: true })
        .eq('id', currentTurnPlayerId)
        .eq('session_id', session.id);

      const { data: currentPlayers } = await supabase
        .from('game_players')
        .select('*')
        .eq('session_id', session.id)
        .order('joined_at', { ascending: true });

      const updatedPlayersList = (currentPlayers || players) as GamePlayer[];
      const remainingActive = updatedPlayersList.filter((p) => !p.is_eliminated);

      if (remainingActive.length <= 1 && turnOrder.length > 1) {
        await supabase
          .from('game_sessions')
          .update({
            status: 'finished',
            turn_deadline: null,
          })
          .eq('id', session.id);
      } else {
        let nextIndex = session.current_turn_index;
        const total = turnOrder.length;
        for (let i = 1; i <= total; i++) {
          const candidateIndex = (session.current_turn_index + i) % total;
          const candidateId = turnOrder[candidateIndex];
          const isElim = updatedPlayersList.find((p) => p.id === candidateId)?.is_eliminated;
          if (!isElim) {
            nextIndex = candidateIndex;
            break;
          }
        }

        const deadline = new Date(Date.now() + 15000).toISOString();
        await supabase
          .from('game_sessions')
          .update({
            current_turn_index: nextIndex,
            turn_deadline: deadline,
          })
          .eq('id', session.id);
      }

      await fetchSessionState(session.id);
    } catch (err) {
      console.error('Error handling timeout:', err);
    }
  };

  // Action: Reset Game
  const resetGame = async () => {
    if (!session) return { success: false, error: 'No active session' };
    const supabase = getSupabase();

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('reset_game', {
        p_session_id: session.id,
      });

      if (!rpcErr && rpcData) {
        await fetchSessionState(session.id);
        return { success: true };
      }

      // Direct fallback
      await supabase
        .from('game_players')
        .update({ is_eliminated: false })
        .eq('session_id', session.id);

      const { data: resetSession, error: resetErr } = await supabase
        .from('game_sessions')
        .update({
          status: 'lobby',
          turn_order: [],
          current_turn_index: 0,
          used_words: [],
          last_letter: null,
          turn_deadline: null,
        })
        .eq('id', session.id)
        .select()
        .single();

      if (resetErr) throw resetErr;

      setSession(resetSession as GameSession);
      await fetchSessionState(session.id);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset game';
      setError(message);
      return { success: false, error: message };
    }
  };

  const leaveGame = () => {
    updateLocalPlayer(null);
    setSession(null);
    setPlayers([]);
    setError(null);
  };

  const refreshState = async () => {
    if (session?.id) {
      await fetchSessionState(session.id);
    }
  };

  return (
    <GameContext.Provider
      value={{
        session,
        players,
        localPlayer,
        loading,
        error,
        setError,
        timeRemaining,
        isMyTurn,
        currentTurnPlayer,
        activePlayers,
        winnerPlayer,
        createGame,
        joinGame,
        startGame,
        submitWord,
        handleTimeout,
        resetGame,
        leaveGame,
        refreshState,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

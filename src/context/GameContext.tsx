import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type {
  GameSession,
  GamePlayer,
  GameVote,
  LocalPlayerSession,
  SessionStatus,
  VoteRevealPrompt,
} from '../types/game';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { generateRoomCode, sanitizeRoomCode } from '../lib/roomCode';
import { validateWordSubmission, getLastLetter } from '../data';
import { SEED_PROMPTS } from '../data/prompts';
import { soundManager } from '../lib/audio';

const STORAGE_SESSION_KEY = 'word_chain_player_session_v1';

interface GameContextType {
  session: GameSession | null;
  players: GamePlayer[];
  votes: GameVote[];
  localPlayer: LocalPlayerSession | null;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  timeRemaining: number;
  isMyTurn: boolean;
  currentTurnPlayer: GamePlayer | null;
  activePlayers: GamePlayer[];
  winnerPlayer: GamePlayer | null;
  localVote: string | null;
  createGame: (
    displayName: string,
    category?: string,
    gameType?: string
  ) => Promise<{ success: boolean; roomCode?: string; error?: string }>;
  joinGame: (roomCode: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  setGameSettings: (gameType: string, category: string) => Promise<{ success: boolean; error?: string }>;
  startGame: () => Promise<{ success: boolean; error?: string }>;
  submitWord: (word: string) => Promise<{ success: boolean; error?: string }>;
  submitVote: (choice: string) => Promise<{ success: boolean; error?: string }>;
  nextVoteRound: () => Promise<{ success: boolean; error?: string }>;
  revealVotes: () => Promise<{ success: boolean; error?: string }>;
  handleTimeout: () => Promise<void>;
  resetGame: () => Promise<{ success: boolean; error?: string }>;
  leaveGame: () => void;
  refreshState: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [votes, setVotes] = useState<GameVote[]>([]);
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
  const [timeRemaining, setTimeRemaining] = useState<number>(30);

  const prevTurnIndexRef = useRef<number | null>(null);
  const prevStatusRef = useRef<SessionStatus | null>(null);
  const prevVotingPhaseRef = useRef<string | null>(null);
  const timeoutTriggeredRef = useRef<string | null>(null);
  const realtimeChannelStateRef = useRef<{
    sessionId: string;
    channels: ReturnType<ReturnType<typeof getSupabase>['channel']>[];
    refCount: number;
  } | null>(null);

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
      const [
        { data: sessionData, error: sessionErr },
        { data: playersData, error: playersErr },
        { data: votesData, error: votesErr },
      ] = await Promise.all([
        supabase.from('game_sessions').select('*').eq('id', sessionId).single(),
        supabase.from('game_players').select('*').eq('session_id', sessionId).order('joined_at', { ascending: true }),
        supabase.from('game_votes').select('*').eq('session_id', sessionId),
      ]);

      if (sessionErr || !sessionData) {
        console.warn('Session not found or error:', sessionErr);
        return false;
      }

      setSession(sessionData as GameSession);
      if (playersData && !playersErr) {
        setPlayers(playersData as GamePlayer[]);
      }
      if (votesData && !votesErr) {
        setVotes(votesData as GameVote[]);
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
    const sessionId = session.id;

    // React StrictMode runs this effect's cleanup and then re-runs the effect
    // again synchronously in dev. A ref persists across that synchronous
    // mount/cleanup/mount, so we reuse the same channels instead of creating
    // new ones, with a ref count to know when they're genuinely no longer
    // needed. The cleanup's decrement is deferred to a microtask so a
    // same-tick remount (StrictMode) increments the count again first.
    //
    // Each table gets its OWN channel rather than being multiplexed onto one
    // shared channel via multiple .on('postgres_changes', ...) calls. If any
    // single table's postgres_changes registration is rejected by the server
    // (e.g. that table isn't in the `supabase_realtime` publication), a
    // shared channel's entire bind silently fails and NONE of its tables
    // deliver events - even though .subscribe() still reports "SUBSCRIBED".
    // Splitting channels means a misconfigured table can't take the others
    // down with it.
    const existing = realtimeChannelStateRef.current;

    if (existing && existing.sessionId === sessionId) {
      existing.refCount += 1;
    } else {
      if (existing) {
        existing.channels.forEach((ch) => supabase.removeChannel(ch));
      }

      const sessionsChannel = supabase
        .channel(`session_realtime_sessions_${sessionId}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'game_sessions',
            filter: `id=eq.${sessionId}`,
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
        .subscribe();

      const playersChannel = supabase
        .channel(`session_realtime_players_${sessionId}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'game_players',
            filter: `session_id=eq.${sessionId}`,
          },
          async () => {
            const { data } = await supabase
              .from('game_players')
              .select('*')
              .eq('session_id', sessionId)
              .order('joined_at', { ascending: true });
            if (data) {
              setPlayers(data as GamePlayer[]);
            }
          }
        )
        .subscribe();

      const votesChannel = supabase
        .channel(`session_realtime_votes_${sessionId}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'game_votes',
            filter: `session_id=eq.${sessionId}`,
          },
          async () => {
            const { data } = await supabase
              .from('game_votes')
              .select('*')
              .eq('session_id', sessionId);
            if (data) {
              setVotes(data as GameVote[]);
            }
          }
        )
        .subscribe();

      realtimeChannelStateRef.current = {
        sessionId,
        channels: [sessionsChannel, playersChannel, votesChannel],
        refCount: 1,
      };
    }

    return () => {
      queueMicrotask(() => {
        const state = realtimeChannelStateRef.current;
        if (state && state.sessionId === sessionId) {
          state.refCount -= 1;
          if (state.refCount <= 0) {
            state.channels.forEach((ch) => supabase.removeChannel(ch));
            realtimeChannelStateRef.current = null;
          }
        }
      });
    };
  }, [session?.id]);

  // Active players
  const activePlayers = players.filter((p) => !p.is_eliminated);

  // Current turn player ID (for word_chain)
  const turnOrder = Array.isArray(session?.turn_order) ? session.turn_order : [];
  const currentTurnPlayerId =
    turnOrder.length > 0 && session
      ? turnOrder[session.current_turn_index % turnOrder.length]
      : null;

  const currentTurnPlayer = players.find((p) => p.id === currentTurnPlayerId) || null;
  const isMyTurn = Boolean(
    localPlayer?.playerId &&
      currentTurnPlayerId === localPlayer.playerId &&
      session?.status === 'playing' &&
      session?.game_type !== 'vote_reveal'
  );

  // Winner calculation for word chain
  let winnerPlayer: GamePlayer | null = null;
  if (session?.status === 'finished') {
    if (activePlayers.length === 1) {
      winnerPlayer = activePlayers[0];
    } else if (players.length > 0) {
      winnerPlayer = activePlayers[0] || players[0];
    }
  }

  // Local player's vote in current round
  const currentRoundNumber = session?.game_config?.round_number || 1;
  const localVote =
    votes.find(
      (v) => v.player_id === localPlayer?.playerId && v.round_number === currentRoundNumber
    )?.choice || null;

  // Sound effects & state change detector
  useEffect(() => {
    if (!session) return;

    if (session.status === 'playing' && prevStatusRef.current === 'lobby') {
      soundManager.playTurnStart();
    } else if (session.status === 'finished' && prevStatusRef.current === 'playing') {
      soundManager.playWinner();
    }

    if (session.game_type === 'word_chain') {
      if (session.status === 'playing' && session.current_turn_index !== prevTurnIndexRef.current) {
        if (isMyTurn) {
          soundManager.playTurnStart();
        }
        timeoutTriggeredRef.current = null;
      }
    } else if (session.game_type === 'vote_reveal') {
      const currentPhase = session.game_config?.voting_phase;
      if (currentPhase === 'revealed' && prevVotingPhaseRef.current === 'voting') {
        soundManager.playReveal();
      }
      prevVotingPhaseRef.current = currentPhase || null;
    }

    prevStatusRef.current = session.status;
    prevTurnIndexRef.current = session.current_turn_index;
  }, [session, isMyTurn]);

  // Turn / Round Countdown Timer & automatic timeout trigger
  useEffect(() => {
    const isVoteReveal = session?.game_type === 'vote_reveal';
    const defaultTimer = isVoteReveal ? 20 : 30;

    if (session?.status !== 'playing' || !session.turn_deadline) {
      setTimeRemaining(defaultTimer);
      return;
    }

    const deadlineMs = new Date(session.turn_deadline).getTime();
    const anchorStart = Date.now();
    // The client and Postgres server clocks are not guaranteed to be in sync
    // (observed drift of multiple hours in some environments). A raw
    // `deadlineMs - Date.now()` diff is only meaningful when both clocks
    // roughly agree; when they don't, it can show wildly wrong values like
    // "10760s" instead of counting down from the intended 20/30s. Detect that
    // and fall back to a countdown anchored on our own clock instead.
    const initialServerDiffSec = (deadlineMs - anchorStart) / 1000;
    const clockSkewed = initialServerDiffSec < -5 || initialServerDiffSec > defaultTimer + 5;

    const tick = () => {
      const diffSec = clockSkewed
        ? Math.max(0, Math.ceil(defaultTimer - (Date.now() - anchorStart) / 1000))
        : Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));

      setTimeRemaining(diffSec);

      if (diffSec <= 3 && diffSec > 0) {
        soundManager.playTick(true);
      } else if (diffSec <= 6 && diffSec > 3) {
        soundManager.playTick(false);
      }

      // Check timeout
      if (diffSec === 0) {
        if (isVoteReveal) {
          const timeoutKey = `vote_${session.id}_round_${session.game_config?.round_number || 1}`;
          if (
            timeoutTriggeredRef.current !== timeoutKey &&
            session.game_config?.voting_phase === 'voting'
          ) {
            timeoutTriggeredRef.current = timeoutKey;
            handleTimeout();
          }
        } else if (currentTurnPlayerId) {
          const timeoutKey = `${session.id}_${currentTurnPlayerId}_${session.current_turn_index}`;
          if (timeoutTriggeredRef.current !== timeoutKey) {
            timeoutTriggeredRef.current = timeoutKey;
            handleTimeout();
          }
        }
      }
    };

    tick();
    const interval = setInterval(tick, 500);

    return () => clearInterval(interval);
  }, [
    session?.status,
    session?.turn_deadline,
    session?.current_turn_index,
    session?.game_type,
    session?.game_config?.round_number,
    session?.game_config?.voting_phase,
    currentTurnPlayerId,
    session?.id,
  ]);

  // Helper to pick random prompt from DB or fallback
  const pickRandomPrompt = async (
    category: string,
    usedIds: string[] = []
  ): Promise<VoteRevealPrompt> => {
    const supabase = getSupabase();
    try {
      const { data: prompts } = await supabase
        .from('game_prompts')
        .select('*')
        .eq('engine', 'vote_reveal')
        .eq('category', category);

      if (prompts && prompts.length > 0) {
        const unused = prompts.filter((p) => !usedIds.includes(p.id));
        const pool = unused.length > 0 ? unused : prompts;
        const selected = pool[Math.floor(Math.random() * pool.length)];
        return {
          id: selected.id,
          prompt_text: selected.prompt_text,
          options: selected.options as [string, string],
          category: selected.category,
        };
      }
    } catch (e) {
      console.warn('Could not query game_prompts from DB, using fallback prompts:', e);
    }

    // Local fallback from SEED_PROMPTS
    const catPrompts = SEED_PROMPTS.filter((p) => p.category === category);
    const pool = catPrompts.length > 0 ? catPrompts : SEED_PROMPTS;
    const unused = pool.filter((p) => !usedIds.includes(p.id));
    const finalPool = unused.length > 0 ? unused : pool;
    const selected = finalPool[Math.floor(Math.random() * finalPool.length)];
    return {
      id: selected.id,
      prompt_text: selected.prompt_text,
      options: selected.options,
      category: selected.category,
    };
  };

  // Action: Create Game
  const createGame = async (
    displayName: string,
    category: string = 'cities',
    gameType: string = 'word_chain'
  ) => {
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
          game_type: gameType,
          status: 'lobby',
          turn_order: [],
          current_turn_index: 0,
          used_words: [],
          last_letter: null,
          turn_deadline: null,
          game_config: {},
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
      setVotes([]);

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

  // Action: Update Game Settings (Type & Category) in Lobby
  const setGameSettings = async (gameType: string, category: string) => {
    if (!session || !localPlayer?.isHost) return { success: false, error: 'Host only' };
    setError(null);
    const supabase = getSupabase();

    try {
      const { data: updated, error: updateErr } = await supabase
        .from('game_sessions')
        .update({
          game_type: gameType,
          category,
        })
        .eq('id', session.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      setSession(updated as GameSession);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update game settings';
      setError(message);
      return { success: false, error: message };
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

      await supabase.from('game_players').update({ is_eliminated: false }).eq('session_id', session.id);

      if (session.game_type === 'vote_reveal') {
        const prompt = await pickRandomPrompt(session.category || 'general');
        const deadline = new Date(Date.now() + 20000).toISOString();
        const config = {
          round_number: 1,
          voting_phase: 'voting',
          current_prompt: prompt,
          used_prompt_ids: [prompt.id],
        };

        const { data: updatedSession, error: updateErr } = await supabase
          .from('game_sessions')
          .update({
            status: 'playing',
            turn_order: shuffledIds,
            current_turn_index: 0,
            turn_deadline: deadline,
            game_config: config,
          })
          .eq('id', session.id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        setSession(updatedSession as GameSession);
        return { success: true };
      } else {
        // Word Chain fallback (30s timer)
        const deadline = new Date(Date.now() + 30000).toISOString();

        const { data: updatedSession, error: updateErr } = await supabase
          .from('game_sessions')
          .update({
            status: 'playing',
            turn_order: shuffledIds,
            current_turn_index: 0,
            used_words: [],
            last_letter: null,
            turn_deadline: deadline,
            game_config: {},
          })
          .eq('id', session.id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        setSession(updatedSession as GameSession);
        return { success: true };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start game';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Action: Submit Word (Word Chain)
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

      // Direct fallback mutation (30s deadline)
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

      const deadline = new Date(Date.now() + 30000).toISOString();

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

  // Action: Submit Vote (Vote & Reveal)
  const submitVote = async (choice: string) => {
    if (!session || !localPlayer) return { success: false, error: 'No active session' };
    const roundNumber = session.game_config?.round_number || 1;
    const supabase = getSupabase();

    try {
      soundManager.playVote();

      const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_vote', {
        p_session_id: session.id,
        p_player_id: localPlayer.playerId,
        p_round_number: roundNumber,
        p_choice: choice,
      });

      if (!rpcErr && rpcData) {
        await fetchSessionState(session.id);
        return { success: true };
      }

      // Fallback direct upsert
      const { error: upsertErr } = await supabase.from('game_votes').upsert(
        {
          session_id: session.id,
          player_id: localPlayer.playerId,
          round_number: roundNumber,
          choice,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,player_id,round_number' }
      );

      if (upsertErr) throw upsertErr;

      // Check if all players voted
      const { data: roundVotes } = await supabase
        .from('game_votes')
        .select('*')
        .eq('session_id', session.id)
        .eq('round_number', roundNumber);

      const activePlayersCount = players.filter((p) => !p.is_eliminated).length;

      if (roundVotes && roundVotes.length >= activePlayersCount && activePlayersCount > 0) {
        const updatedConfig = {
          ...(session.game_config || {}),
          voting_phase: 'revealed',
        };
        await supabase
          .from('game_sessions')
          .update({ game_config: updatedConfig })
          .eq('id', session.id);
      }

      await fetchSessionState(session.id);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit vote';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Action: Next Vote Round (Vote & Reveal)
  const nextVoteRound = async () => {
    if (!session || !localPlayer?.isHost) return { success: false, error: 'Host only' };
    setError(null);
    const supabase = getSupabase();

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('next_vote_round', {
        p_session_id: session.id,
      });

      if (!rpcErr && rpcData) {
        await fetchSessionState(session.id);
        return { success: true };
      }

      // Fallback direct mutation
      const nextRound = (session.game_config?.round_number || 1) + 1;
      const usedIds = (session.game_config?.used_prompt_ids as string[]) || [];
      const nextPrompt = await pickRandomPrompt(session.category || 'general', usedIds);
      const deadline = new Date(Date.now() + 20000).toISOString();

      const newConfig = {
        round_number: nextRound,
        voting_phase: 'voting',
        current_prompt: nextPrompt,
        used_prompt_ids: [...usedIds, nextPrompt.id],
      };

      const { data: updated, error: updateErr } = await supabase
        .from('game_sessions')
        .update({
          turn_deadline: deadline,
          game_config: newConfig,
        })
        .eq('id', session.id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      setSession(updated as GameSession);
      await fetchSessionState(session.id);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to advance round';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Action: Reveal Votes (Manual or Timeout Trigger)
  const revealVotes = async () => {
    if (!session) return { success: false, error: 'No active session' };
    const supabase = getSupabase();

    try {
      const updatedConfig = {
        ...(session.game_config || {}),
        voting_phase: 'revealed',
      };

      await supabase
        .from('game_sessions')
        .update({ game_config: updatedConfig })
        .eq('id', session.id);

      await fetchSessionState(session.id);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reveal votes';
      return { success: false, error: message };
    }
  };

  // Action: Handle Timeout
  const handleTimeout = async () => {
    if (!session || session.status !== 'playing') return;
    const supabase = getSupabase();

    try {
      if (session.game_type === 'vote_reveal') {
        // Vote & Reveal timeout: reveal the results
        await revealVotes();
        return;
      }

      // Word Chain timeout handling
      if (!currentTurnPlayerId) return;

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

      // Fallback direct mutation (30s)
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

        const deadline = new Date(Date.now() + 30000).toISOString();
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

  // Action: Reset Game (For "Play Again" or returning to lobby)
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
          game_config: {},
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
    setVotes([]);
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
        votes,
        localPlayer,
        loading,
        error,
        setError,
        timeRemaining,
        isMyTurn,
        currentTurnPlayer,
        activePlayers,
        winnerPlayer,
        localVote,
        createGame,
        joinGame,
        setGameSettings,
        startGame,
        submitWord,
        submitVote,
        nextVoteRound,
        revealVotes,
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

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type {
  GameSession,
  GamePlayer,
  GameVote,
  GameAnswer,
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
  answers: GameAnswer[];
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
  localAnswer: string | null;
  createGame: (
    displayName: string,
    category?: string,
    gameType?: string
  ) => Promise<{ success: boolean; roomCode?: string; error?: string }>;
  joinGame: (
    roomCode: string,
    displayName: string,
    rejoinMode?: 'reuse' | 'new'
  ) => Promise<{ success: boolean; error?: string; needsRejoinConfirm?: boolean; existingPlayerName?: string }>;
  setGameSettings: (gameType: string, category: string) => Promise<{ success: boolean; error?: string }>;
  startGame: () => Promise<{ success: boolean; error?: string }>;
  submitWord: (word: string) => Promise<{ success: boolean; error?: string }>;
  submitGuess: (guess: 'higher' | 'lower') => Promise<{ success: boolean; error?: string }>;
  submitVote: (choice: string) => Promise<{ success: boolean; error?: string }>;
  nextVoteRound: () => Promise<{ success: boolean; error?: string }>;
  revealVotes: () => Promise<{ success: boolean; error?: string }>;
  submitAnswer: (answer: string) => Promise<{ success: boolean; error?: string }>;
  nextTriviaRound: () => Promise<{ success: boolean; error?: string }>;
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
  const [answers, setAnswers] = useState<GameAnswer[]>([]);
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
  // Set synchronously (before any network round trip) the instant the local
  // player votes/answers, so the countdown tick sound can stop immediately
  // rather than waiting for the vote/answer to round-trip through the DB and
  // land back in `votes`/`answers` state. Reset whenever a fresh round's
  // deadline is issued (see the effect below).
  const hasActedThisRoundRef = useRef<boolean>(false);
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
        { data: answersData, error: answersErr },
      ] = await Promise.all([
        supabase.from('game_sessions').select('*').eq('id', sessionId).single(),
        supabase.from('game_players').select('*').eq('session_id', sessionId).order('joined_at', { ascending: true }),
        supabase.from('game_votes').select('*').eq('session_id', sessionId),
        supabase.from('game_answers').select('*').eq('session_id', sessionId),
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
      if (answersData && !answersErr) {
        setAnswers(answersData as GameAnswer[]);
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

  // Resync on tab resume (e.g. a phone locked mid-game). Mobile browsers
  // routinely suspend JS execution - and the realtime socket with it - while
  // a tab is backgrounded; most reconnect their websocket automatically on
  // resume, but this is a belt-and-suspenders fetch so a player always sees
  // fresh, correct state the instant the tab becomes visible again rather
  // than trusting that reconnect timing. localStorage already carries the
  // session across the background/foreground cycle (see the restore effect
  // above), so this only needs to refresh data, never re-establish identity.
  useEffect(() => {
    if (!localPlayer?.sessionId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchSessionState(localPlayer.sessionId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchSessionState, localPlayer?.sessionId]);

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

      const answersChannel = supabase
        .channel(`session_realtime_answers_${sessionId}_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'game_answers',
            filter: `session_id=eq.${sessionId}`,
          },
          async () => {
            const { data } = await supabase
              .from('game_answers')
              .select('*')
              .eq('session_id', sessionId);
            if (data) {
              setAnswers(data as GameAnswer[]);
            }
          }
        )
        .subscribe();

      realtimeChannelStateRef.current = {
        sessionId,
        channels: [sessionsChannel, playersChannel, votesChannel, answersChannel],
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
      session?.game_type !== 'vote_reveal' &&
      session?.game_type !== 'most_likely' &&
      session?.game_type !== 'trivia'
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

  // Local player's vote / answer in current round
  const currentRoundNumber = session?.game_config?.round_number || 1;
  const localVote =
    votes.find(
      (v) => v.player_id === localPlayer?.playerId && v.round_number === currentRoundNumber
    )?.choice || null;
  const localAnswer =
    answers.find(
      (a) => a.player_id === localPlayer?.playerId && a.round_number === currentRoundNumber
    )?.selected_answer || null;

  // Sound effects & state change detector
  useEffect(() => {
    if (!session) return;

    if (session.status === 'playing' && prevStatusRef.current === 'lobby') {
      soundManager.playTurnStart();
    } else if (session.status === 'finished' && prevStatusRef.current === 'playing') {
      soundManager.playWinner();
    }

    if (session.game_type === 'word_chain' || session.game_type === 'higher_lower') {
      // Both are per-player turn-order games (as opposed to the simultaneous
      // vote_reveal/most_likely/trivia rounds below) - a turn-chime on
      // current_turn_index change applies identically to either
      if (session.status === 'playing' && session.current_turn_index !== prevTurnIndexRef.current) {
        if (isMyTurn) {
          soundManager.playTurnStart();
        }
        timeoutTriggeredRef.current = null;
      }
    } else if (session.game_type === 'vote_reveal' || session.game_type === 'most_likely') {
      const currentPhase = session.game_config?.voting_phase;
      if (currentPhase === 'revealed' && prevVotingPhaseRef.current === 'voting') {
        soundManager.playReveal();
      }
      prevVotingPhaseRef.current = currentPhase || null;
    } else if (session.game_type === 'trivia') {
      // Trivia uses game_config.phase ('answering' | 'revealed') rather than
      // voting_phase, but reuses the same ref to track the previous value
      const currentPhase = session.game_config?.phase;
      if (currentPhase === 'revealed' && prevVotingPhaseRef.current === 'answering') {
        soundManager.playReveal();
      }
      prevVotingPhaseRef.current = currentPhase || null;
    }

    prevStatusRef.current = session.status;
    prevTurnIndexRef.current = session.current_turn_index;
  }, [session, isMyTurn]);

  // A fresh turn_deadline means a new turn/round has begun (start_game,
  // next_vote_round/next_trivia_round, and each word_chain turn all issue a
  // brand new deadline) - re-arm the "already acted" gate below for it. Kept
  // as its own effect so it fires precisely on a new deadline, not on every
  // other change (e.g. voting_phase/phase flipping to 'revealed') that the
  // timer effect below also depends on.
  useEffect(() => {
    hasActedThisRoundRef.current = false;
  }, [session?.turn_deadline]);

  // Turn / Round Countdown Timer & automatic timeout trigger
  useEffect(() => {
    // vote_reveal, most_likely, and trivia all run simultaneous rounds (20s),
    // as opposed to word_chain's per-player turn timer (30s). higher_lower is
    // per-player turn-order like word_chain (falls into the same generic
    // "else if (currentTurnPlayerId)" timeout branch below), just with a
    // shorter 20s-per-turn timer.
    const isVoteReveal = session?.game_type === 'vote_reveal' || session?.game_type === 'most_likely';
    const isTrivia = session?.game_type === 'trivia';
    const isHigherLower = session?.game_type === 'higher_lower';
    const defaultTimer = isTrivia || isVoteReveal || isHigherLower ? 20 : 30;

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

      // Keep the visible countdown running for everyone regardless (above),
      // but silence the tick sound once this player has locked in a choice
      // for the round, or the round has already been revealed - otherwise it
      // keeps ticking toward a deadline that's no longer relevant to them.
      const roundAlreadyRevealed =
        (isVoteReveal && session.game_config?.voting_phase === 'revealed') ||
        (isTrivia && session.game_config?.phase === 'revealed');
      const shouldSilenceTick = hasActedThisRoundRef.current || roundAlreadyRevealed;

      if (!shouldSilenceTick) {
        if (diffSec <= 3 && diffSec > 0) {
          soundManager.playTick(true);
        } else if (diffSec <= 6 && diffSec > 3) {
          soundManager.playTick(false);
        }
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
        } else if (isTrivia) {
          const timeoutKey = `trivia_${session.id}_round_${session.game_config?.round_number || 1}`;
          if (
            timeoutTriggeredRef.current !== timeoutKey &&
            session.game_config?.phase === 'answering'
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
    session?.game_config?.phase,
    currentTurnPlayerId,
    session?.id,
  ]);

  // A null options column means "vote for a player" (most_likely): build the
  // option list from the session's currently active players instead of fixed text
  const resolvePromptOptions = (
    options: VoteRevealPrompt['options']
  ): VoteRevealPrompt['options'] => {
    if (options) return options;
    return players
      .filter((p) => !p.is_eliminated)
      .map((p) => ({ id: p.id, display_name: p.display_name }));
  };

  // Helper to pick random prompt from DB or fallback
  const pickRandomPrompt = async (
    category: string,
    usedIds: string[] = [],
    engine: string = 'vote_reveal'
  ): Promise<VoteRevealPrompt> => {
    const supabase = getSupabase();
    try {
      const { data: prompts } = await supabase
        .from('game_prompts')
        .select('*')
        .eq('engine', engine)
        .eq('category', category);

      if (prompts && prompts.length > 0) {
        const unused = prompts.filter((p) => !usedIds.includes(p.id));
        const pool = unused.length > 0 ? unused : prompts;
        const selected = pool[Math.floor(Math.random() * pool.length)];
        return {
          id: selected.id,
          prompt_text: selected.prompt_text,
          // A null options column means "vote for a player" only for
          // most_likely - higher_lower also has null options, but those mean
          // "compare numeric_value instead", not "fall back to the player
          // roster", so resolvePromptOptions must not run for it
          options:
            engine === 'most_likely'
              ? resolvePromptOptions(selected.options as VoteRevealPrompt['options'])
              : (selected.options as VoteRevealPrompt['options']),
          category: selected.category,
          correct_answer: selected.correct_answer || undefined,
          numeric_value: selected.numeric_value ?? undefined,
        };
      }
    } catch (e) {
      console.warn('Could not query game_prompts from DB, using fallback prompts:', e);
    }

    // Local fallback from SEED_PROMPTS. Trivia and higher_lower have no
    // bundled fallback content (seeded server-side only, via
    // scripts/seed-trivia.ts and supabase/schema.sql respectively), so this
    // pool is empty for those engines - surface a clear error instead of
    // crashing on an undefined `selected` below.
    const enginePrompts = SEED_PROMPTS.filter((p) => p.engine === engine);
    const catPrompts = enginePrompts.filter((p) => p.category === category);
    const pool = catPrompts.length > 0 ? catPrompts : enginePrompts;
    const unused = pool.filter((p) => !usedIds.includes(p.id));
    const finalPool = unused.length > 0 ? unused : pool;
    if (finalPool.length === 0) {
      throw new Error(
        engine === 'trivia'
          ? 'No trivia prompts available. Run `npx tsx scripts/seed-trivia.ts` first.'
          : engine === 'higher_lower'
          ? 'No higher_lower prompts available. Re-run supabase/schema.sql to seed them.'
          : `No ${engine} prompts available for category "${category}".`
      );
    }
    const selected = finalPool[Math.floor(Math.random() * finalPool.length)];
    return {
      id: selected.id,
      prompt_text: selected.prompt_text,
      options: engine === 'most_likely' ? resolvePromptOptions(selected.options) : selected.options,
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
      setAnswers([]);

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
  //
  // A player whose local session got wiped (private browsing, a different
  // device, a cleared tab, or - the mobile-lock-screen case in section 4 of
  // the polish pass - a browser that fully evicted the page while
  // backgrounded) comes back through this same join form instead of the
  // localStorage-backed restore effect above. Without a name-based lookup,
  // every such rejoin used to INSERT a brand new game_players row (a
  // duplicate entry in the roster) and, once the game had left 'lobby', was
  // rejected outright by the status check below - a dead end with no way
  // back into an in-progress game.
  //
  // rejoinMode is undefined on the form's first submit: if an existing
  // non-eliminated player with the same (trimmed, case-insensitive) name is
  // found in this session, we return needsRejoinConfirm instead of mutating
  // anything, so the UI can ask "Rejoin as [name]?" before deciding. The
  // caller then resubmits with 'reuse' (attach to that existing row, no
  // insert - this is what makes an in-progress-game rejoin work at all,
  // since new inserts stay blocked once status isn't 'lobby') or 'new'
  // (two different people sharing a display name; insert a fresh row, only
  // allowed pre-start same as before).
  const joinGame = async (roomCode: string, displayName: string, rejoinMode?: 'reuse' | 'new') => {
    setError(null);
    setLoading(true);
    const supabase = getSupabase();
    const cleanCode = sanitizeRoomCode(roomCode);
    const cleanName = displayName.trim() || 'Player';

    try {
      const { data: sessionData, error: sessionErr } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('room_code', cleanCode)
        .single();

      if (sessionErr || !sessionData) {
        throw new Error('Room not found. Check the code and try again.');
      }

      const { data: existingPlayers } = await supabase
        .from('game_players')
        .select('*')
        .eq('session_id', sessionData.id)
        .eq('is_eliminated', false);

      const existingMatch = (existingPlayers || []).find(
        (p) => p.display_name.trim().toLowerCase() === cleanName.toLowerCase()
      );

      if (existingMatch && rejoinMode !== 'new') {
        if (!rejoinMode) {
          // Ask before silently merging into someone else's row - two
          // different people at the table may share a first name.
          setLoading(false);
          return { success: false, needsRejoinConfirm: true, existingPlayerName: existingMatch.display_name };
        }

        // rejoinMode === 'reuse': attach to the existing row instead of
        // inserting. Deliberately does not touch is_eliminated/score here -
        // reconnecting shouldn't un-eliminate a player or reset their
        // progress, just restore their view of the game.
        const { data: allPlayers } = await supabase
          .from('game_players')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('joined_at', { ascending: true });

        const isHost = allPlayers && allPlayers.length > 0 && allPlayers[0].id === existingMatch.id;

        const local: LocalPlayerSession = {
          playerId: existingMatch.id,
          sessionId: sessionData.id,
          roomCode: sessionData.room_code,
          displayName: existingMatch.display_name,
          isHost: Boolean(isHost),
        };

        updateLocalPlayer(local);
        setSession(sessionData as GameSession);
        setPlayers((allPlayers || [existingMatch]) as GamePlayer[]);

        return { success: true };
      }

      if (sessionData.status !== 'lobby') {
        throw new Error('Game has already started in this room.');
      }

      const { data: playerData, error: playerErr } = await supabase
        .from('game_players')
        .insert({
          session_id: sessionData.id,
          display_name: cleanName,
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

      if (session.game_type === 'vote_reveal' || session.game_type === 'most_likely') {
        const prompt = await pickRandomPrompt(session.category || 'general', [], session.game_type);
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
      } else if (session.game_type === 'trivia') {
        const prompt = await pickRandomPrompt(session.category || 'general_knowledge', [], 'trivia');
        const deadline = new Date(Date.now() + 20000).toISOString();
        const config = {
          round_number: 1,
          phase: 'answering',
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
      } else if (session.game_type === 'higher_lower') {
        const prompt = await pickRandomPrompt(session.category || 'population', [], 'higher_lower');
        const deadline = new Date(Date.now() + 20000).toISOString();
        const config = {
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

      if (isFinished) {
        // localPlayer is the sole remaining active player - award Game Night
        // points: +3 for winning, +1 per round survived (words they
        // personally landed this game, including this final one)
        const winnerRounds = updatedUsedWords.filter(
          (w) => typeof w !== 'string' && w.player_id === localPlayer.playerId
        ).length;
        const winner = players.find((p) => p.id === localPlayer.playerId);
        await supabase
          .from('game_players')
          .update({ total_score: (winner?.total_score || 0) + 3 + winnerRounds })
          .eq('id', localPlayer.playerId);
      }

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

  // Action: Submit Guess (Higher or Lower). Turn/elimination shape mirrors
  // submitWord above (verify turn, mutate, advance/finish) minus the word
  // validation - the only new piece is comparing numeric_value against the
  // freshly-drawn prompt.
  const submitGuess = async (guess: 'higher' | 'lower') => {
    if (!session || !localPlayer) {
      return { success: false, error: 'Session not active' };
    }

    if (!isMyTurn) {
      soundManager.playError();
      return { success: false, error: 'It is not your turn!' };
    }

    const supabase = getSupabase();

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_guess', {
        p_session_id: session.id,
        p_player_id: localPlayer.playerId,
        p_guess: guess,
      });

      if (!rpcErr && rpcData) {
        if (rpcData.correct) {
          soundManager.playCorrect();
        } else {
          soundManager.playEliminated();
        }
        await fetchSessionState(session.id);
        return { success: true };
      }

      // Direct fallback mutation (20s deadline)
      const currentPrompt = session.game_config?.current_prompt;
      if (!currentPrompt || currentPrompt.numeric_value === undefined) {
        throw new Error('No active number for this round');
      }
      const currentValue = currentPrompt.numeric_value;

      const usedIds = (session.game_config?.used_prompt_ids as string[]) || [];
      const newPrompt = await pickRandomPrompt(session.category || 'population', usedIds, 'higher_lower');
      const newValue = newPrompt.numeric_value ?? 0;

      let isCorrect: boolean;
      if (newValue > currentValue) isCorrect = guess === 'higher';
      else if (newValue < currentValue) isCorrect = guess === 'lower';
      else isCorrect = false;

      const guessEntry = {
        player_id: localPlayer.playerId,
        player_name: localPlayer.displayName,
        guess,
        correct: isCorrect,
        previous_prompt_text: currentPrompt.prompt_text,
        previous_value: currentValue,
        new_prompt_text: newPrompt.prompt_text,
        new_value: newValue,
        guessed_at: new Date().toISOString(),
      };

      const newHistory = [...(session.game_config?.guess_history || []), guessEntry];
      const newConfig = {
        current_prompt: {
          id: newPrompt.id,
          prompt_text: newPrompt.prompt_text,
          numeric_value: newValue,
          category: newPrompt.category,
        },
        last_guess: guessEntry,
        guess_history: newHistory,
        used_prompt_ids: [...usedIds, newPrompt.id],
      };

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

      const deadline = new Date(Date.now() + 20000).toISOString();

      if (!isCorrect) {
        soundManager.playEliminated();

        await supabase
          .from('game_players')
          .update({ is_eliminated: true })
          .eq('id', localPlayer.playerId);

        const { data: currentPlayers } = await supabase
          .from('game_players')
          .select('*')
          .eq('session_id', session.id)
          .order('joined_at', { ascending: true });

        const updatedPlayersList = (currentPlayers || players) as GamePlayer[];
        const remainingActive = updatedPlayersList.filter((p) => !p.is_eliminated);
        const isFinished = remainingActive.length <= 1 && totalInOrder > 1;

        if (isFinished) {
          const winner = remainingActive[0];
          if (winner) {
            // Award Game Night points: +3 for winning, +1 per round survived
            // (correct guesses they personally landed this game)
            const winnerRounds = newHistory.filter(
              (g) => g.player_id === winner.id && g.correct
            ).length;
            await supabase
              .from('game_players')
              .update({ total_score: (winner.total_score || 0) + 3 + winnerRounds })
              .eq('id', winner.id);
          }

          const { data: updatedSession, error: updateErr } = await supabase
            .from('game_sessions')
            .update({ status: 'finished', turn_deadline: null, game_config: newConfig })
            .eq('id', session.id)
            .select()
            .single();

          if (updateErr) throw updateErr;
          setSession(updatedSession as GameSession);
          return { success: true };
        }

        // Re-derive next index against the post-elimination roster, not the
        // stale `players` snapshot used for the first pass above
        let elimAdjustedIndex = session.current_turn_index;
        for (let i = 1; i <= totalInOrder; i++) {
          const candidateIndex = (session.current_turn_index + i) % totalInOrder;
          const candidateId = turnOrder[candidateIndex];
          const isElim = updatedPlayersList.find((p) => p.id === candidateId)?.is_eliminated;
          if (!isElim) {
            elimAdjustedIndex = candidateIndex;
            break;
          }
        }

        const { data: updatedSession, error: updateErr } = await supabase
          .from('game_sessions')
          .update({ current_turn_index: elimAdjustedIndex, turn_deadline: deadline, game_config: newConfig })
          .eq('id', session.id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        setSession(updatedSession as GameSession);
        return { success: true };
      }

      // Correct guess: nobody eliminated, advance to the next active player
      soundManager.playCorrect();
      const { data: updatedSession, error: updateErr } = await supabase
        .from('game_sessions')
        .update({ current_turn_index: nextIndex, turn_deadline: deadline, game_config: newConfig })
        .eq('id', session.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      setSession(updatedSession as GameSession);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit guess';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Action: Submit Vote (Vote & Reveal)
  const submitVote = async (choice: string) => {
    if (!session || !localPlayer) return { success: false, error: 'No active session' };
    // Silence the countdown tick immediately, before the RPC round-trip
    hasActedThisRoundRef.current = true;
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
      const nextPrompt = await pickRandomPrompt(session.category || 'general', usedIds, session.game_type);
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

  // Action: Submit Answer (Trivia / "20-Second Challenge")
  const submitAnswer = async (answer: string) => {
    if (!session || !localPlayer) return { success: false, error: 'No active session' };
    // Silence the countdown tick immediately, before the RPC round-trip
    hasActedThisRoundRef.current = true;
    const roundNumber = session.game_config?.round_number || 1;
    const supabase = getSupabase();

    try {
      soundManager.playVote();

      const { data: rpcData, error: rpcErr } = await supabase.rpc('submit_answer', {
        p_session_id: session.id,
        p_player_id: localPlayer.playerId,
        p_round_number: roundNumber,
        p_answer: answer,
      });

      if (!rpcErr && rpcData) {
        await fetchSessionState(session.id);
        return { success: true };
      }

      // Fallback direct upsert + score adjustment (mirrors the RPC's delta
      // logic so a changed answer before reveal can't double-count a score)
      const correctAnswer = session.game_config?.current_prompt?.correct_answer;
      const isCorrect = Boolean(correctAnswer) && answer === correctAnswer;

      const previousAnswer = answers.find(
        (a) => a.player_id === localPlayer.playerId && a.round_number === roundNumber
      );
      const wasCorrect = previousAnswer?.is_correct || false;

      const { error: upsertErr } = await supabase.from('game_answers').upsert(
        {
          session_id: session.id,
          player_id: localPlayer.playerId,
          round_number: roundNumber,
          selected_answer: answer,
          is_correct: isCorrect,
          answered_at: new Date().toISOString(),
        },
        { onConflict: 'session_id,player_id,round_number' }
      );

      if (upsertErr) throw upsertErr;

      if (isCorrect !== wasCorrect) {
        const currentPlayer = players.find((p) => p.id === localPlayer.playerId);
        const currentScore = currentPlayer?.score || 0;
        const nextScore = isCorrect ? currentScore + 1 : Math.max(currentScore - 1, 0);
        await supabase.from('game_players').update({ score: nextScore }).eq('id', localPlayer.playerId);
      }

      // Check if all players answered
      const { data: roundAnswers } = await supabase
        .from('game_answers')
        .select('*')
        .eq('session_id', session.id)
        .eq('round_number', roundNumber);

      const activePlayersCount = players.filter((p) => !p.is_eliminated).length;

      if (roundAnswers && roundAnswers.length >= activePlayersCount && activePlayersCount > 0) {
        const updatedConfig = {
          ...(session.game_config || {}),
          phase: 'revealed',
        };
        await supabase
          .from('game_sessions')
          .update({ game_config: updatedConfig })
          .eq('id', session.id);
      }

      await fetchSessionState(session.id);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit answer';
      setError(message);
      return { success: false, error: message };
    }
  };

  // Action: Next Trivia Round (Trivia / "20-Second Challenge")
  const nextTriviaRound = async () => {
    if (!session || !localPlayer?.isHost) return { success: false, error: 'Host only' };
    setError(null);
    const supabase = getSupabase();

    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('next_trivia_round', {
        p_session_id: session.id,
      });

      if (!rpcErr && rpcData) {
        await fetchSessionState(session.id);
        return { success: true };
      }

      // Fallback direct mutation
      const nextRound = (session.game_config?.round_number || 1) + 1;
      const usedIds = (session.game_config?.used_prompt_ids as string[]) || [];
      const nextPrompt = await pickRandomPrompt(session.category || 'general_knowledge', usedIds, 'trivia');
      const deadline = new Date(Date.now() + 20000).toISOString();

      const newConfig = {
        round_number: nextRound,
        phase: 'answering',
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

  // Action: Reveal Trivia Round (Manual or Timeout Trigger)
  const revealTriviaRound = async () => {
    if (!session) return { success: false, error: 'No active session' };
    const supabase = getSupabase();

    try {
      const updatedConfig = {
        ...(session.game_config || {}),
        phase: 'revealed',
      };

      await supabase
        .from('game_sessions')
        .update({ game_config: updatedConfig })
        .eq('id', session.id);

      await fetchSessionState(session.id);
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reveal trivia round';
      return { success: false, error: message };
    }
  };

  // Action: Handle Timeout
  const handleTimeout = async () => {
    if (!session || session.status !== 'playing') return;
    const supabase = getSupabase();

    try {
      if (session.game_type === 'vote_reveal' || session.game_type === 'most_likely') {
        // Vote & Reveal / Most Likely timeout: reveal the results
        await revealVotes();
        return;
      }

      if (session.game_type === 'trivia') {
        // Trivia timeout: reveal the round - no answer just means 0 points
        await revealTriviaRound();
        return;
      }

      // Word Chain / Higher-or-Lower timeout handling: both are elimination-
      // based, turn-order games where a timeout eliminates whoever's turn it
      // was, just like a wrong submission/guess would
      if (!currentTurnPlayerId) return;
      const isHigherLower = session.game_type === 'higher_lower';
      const turnDeadlineMs = isHigherLower ? 20000 : 30000;

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

      // Fallback direct mutation (30s). Only the eliminated player's own
      // client plays the sound, matching the RPC-success path above - every
      // connected client independently runs this timeout handler, so an
      // unconditional play here would sound the elimination cue for everyone
      // in the room, not just the player it happened to.
      if (currentTurnPlayerId === localPlayer?.playerId) {
        soundManager.playEliminated();
      }

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
        const winner = remainingActive[0];
        if (winner) {
          // Award Game Night points: +3 for winning, +1 per round survived -
          // word_chain counts words landed (used_words), higher_lower counts
          // correct guesses landed (game_config.guess_history)
          const winnerRounds = isHigherLower
            ? (session.game_config?.guess_history || []).filter(
                (g) => g.player_id === winner.id && g.correct
              ).length
            : (session.used_words || []).filter(
                (w) => typeof w !== 'string' && w.player_id === winner.id
              ).length;
          await supabase
            .from('game_players')
            .update({ total_score: (winner.total_score || 0) + 3 + winnerRounds })
            .eq('id', winner.id);
        }

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

        const deadline = new Date(Date.now() + turnDeadlineMs).toISOString();
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

      // Trivia's round-set is ending here - roll each player's per-game
      // `score` into the persistent Game Night `total_score` before it gets
      // zeroed below. word_chain already awarded its winner at the moment
      // the game finished (see submitWord/handleTimeout above); vote_reveal/
      // most_likely are non-competitive and never touch total_score.
      if (session.game_type === 'trivia') {
        await Promise.all(
          players.map((p) =>
            supabase
              .from('game_players')
              .update({ total_score: (p.total_score || 0) + (p.score || 0) })
              .eq('id', p.id)
          )
        );
      }

      await supabase
        .from('game_players')
        .update({ is_eliminated: false, score: 0 })
        .eq('session_id', session.id);

      await supabase.from('game_answers').delete().eq('session_id', session.id);

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
    setAnswers([]);
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
        answers,
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
        localAnswer,
        createGame,
        joinGame,
        setGameSettings,
        startGame,
        submitWord,
        submitGuess,
        submitVote,
        nextVoteRound,
        revealVotes,
        submitAnswer,
        nextTriviaRound,
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

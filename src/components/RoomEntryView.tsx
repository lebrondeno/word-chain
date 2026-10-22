import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_TYPES, ALL_GAMES_COUNT } from '../data/prompts';
import { sanitizeRoomCode } from '../lib/roomCode';
import { getMySavedQuizzes, type UserSavedQuiz } from '../lib/savedQuizzes';
import { TicTacToeGameView } from './TicTacToeGameView';
import { useHistoryLayer } from '../hooks/useHistoryLayer';
import { getSavedAvatar, saveAvatar, formatPlayerNameWithAvatar, extractPlayerAvatar } from '../lib/avatars';
import { AvatarPicker } from './AvatarPicker';
import { haptics } from '../lib/haptics';
import {
  Play,
  ArrowRight,
  AlertCircle,
  Trophy,
  Copy,
  Check,
  Bot,
  Gamepad2,
  KeyRound,
  X,
  Sparkles,
} from 'lucide-react';

interface RoomEntryViewProps {
  initialRoomCode?: string;
  onOpenFriendshipQuiz?: (code?: string, view?: 'results' | 'play') => void;
}

export type MultiplayerGameType =
  | 'word_chain'
  | 'vote_reveal'
  | 'tic_tac_toe'
  | 'trivia'
  | 'higher_lower'
  | 'most_likely';

type HubTab = 'games' | 'join' | 'results';
type GameFilter = 'all' | 'party' | 'fast' | 'duel';

interface HubGame {
  id: MultiplayerGameType | 'friendship_test';
  name: string;
  badge: string;
  players: string;
  filter: Exclude<GameFilter, 'all'>;
  accent: string;
  solo?: boolean;
  art: React.ReactNode;
}

// Compact SVG art for each game card (viewBox 0 0 100 48)
const ART: Record<HubGame['id'], React.ReactNode> = {
  word_chain: (
    <svg viewBox="0 0 100 48" className="w-full h-full">
      <rect x="8" y="8" width="30" height="30" rx="9" fill="#4f46e5" />
      <text x="23" y="30" fill="#fff" fontSize="20" fontWeight="900" textAnchor="middle">W</text>
      <rect x="34" y="18" width="20" height="11" rx="5.5" fill="none" stroke="#fbbf24" strokeWidth="3.5" />
      <rect x="62" y="8" width="30" height="30" rx="9" fill="#10b981" />
      <text x="77" y="30" fill="#fff" fontSize="20" fontWeight="900" textAnchor="middle">C</text>
    </svg>
  ),
  vote_reveal: (
    <svg viewBox="0 0 100 48" className="w-full h-full">
      <rect x="6" y="6" width="40" height="36" rx="10" fill="#3b82f6" />
      <text x="26" y="30" fill="#fff" fontSize="16" fontWeight="900" textAnchor="middle">A</text>
      <rect x="54" y="6" width="40" height="36" rx="10" fill="#f43f5e" />
      <text x="74" y="30" fill="#fff" fontSize="16" fontWeight="900" textAnchor="middle">B</text>
      <circle cx="50" cy="24" r="9" fill="#fff" stroke="#f59e0b" strokeWidth="2" />
      <polygon points="51,17 46,25 50,25 49,31 55,23 51,23" fill="#f59e0b" />
    </svg>
  ),
  friendship_test: (
    <svg viewBox="0 0 100 48" className="w-full h-full">
      <circle cx="30" cy="24" r="17" fill="#0b2545" />
      <text x="30" y="30" fill="#fff" fontSize="16" fontWeight="900" textAnchor="middle">9/10</text>
      <text x="62" y="32" fontSize="26">🏆</text>
      <text x="82" y="18" fontSize="14">✨</text>
    </svg>
  ),
  tic_tac_toe: (
    <svg viewBox="0 0 100 48" className="w-full h-full">
      <g stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round">
        <line x1="42" y1="4" x2="42" y2="44" />
        <line x1="58" y1="4" x2="58" y2="44" />
        <line x1="28" y1="17" x2="72" y2="17" />
        <line x1="28" y1="31" x2="72" y2="31" />
      </g>
      <g stroke="#4f46e5" strokeWidth="3" strokeLinecap="round">
        <path d="M31 6l8 8M39 6l-8 8M45 6l8 8M53 6l-8 8M61 6l8 8M69 6l-8 8" />
      </g>
      <g fill="none" stroke="#e11d6a" strokeWidth="3">
        <circle cx="35" cy="38" r="4" />
        <circle cx="50" cy="38" r="4" />
        <circle cx="65" cy="38" r="4" />
      </g>
    </svg>
  ),
  trivia: (
    <svg viewBox="0 0 100 48" className="w-full h-full">
      <circle cx="26" cy="24" r="17" fill="#fff" stroke="#f59e0b" strokeWidth="3" />
      <polygon points="28,11 20,25 26,25 24,37 33,22 27,22" fill="#f59e0b" />
      <rect x="50" y="6" width="44" height="16" rx="6" fill="#0b2545" />
      <text x="72" y="18" fill="#fff" fontSize="9" fontWeight="800" textAnchor="middle">Canberra</text>
      <rect x="50" y="27" width="44" height="16" rx="6" fill="#10b981" />
      <text x="72" y="39" fill="#fff" fontSize="9" fontWeight="800" textAnchor="middle">Correct ✓</text>
    </svg>
  ),
  higher_lower: (
    <svg viewBox="0 0 100 48" className="w-full h-full">
      <rect x="6" y="6" width="34" height="36" rx="9" fill="#fff" stroke="#cbd5e1" strokeWidth="2" />
      <text x="23" y="30" fill="#0b2545" fontSize="13" fontWeight="900" textAnchor="middle">37M</text>
      <circle cx="52" cy="14" r="8" fill="#10b981" />
      <text x="52" y="18" fill="#fff" fontSize="10" fontWeight="900" textAnchor="middle">▲</text>
      <circle cx="52" cy="34" r="8" fill="#f43f5e" />
      <text x="52" y="38" fill="#fff" fontSize="10" fontWeight="900" textAnchor="middle">▼</text>
      <rect x="64" y="6" width="30" height="36" rx="9" fill="#0b2545" />
      <text x="79" y="31" fill="#38bdf8" fontSize="20" fontWeight="900" textAnchor="middle">?</text>
    </svg>
  ),
  most_likely: (
    <svg viewBox="0 0 100 48" className="w-full h-full">
      <circle cx="50" cy="14" r="11" fill="#4f46e5" />
      <text x="50" y="19" fontSize="13" textAnchor="middle">👑</text>
      <circle cx="26" cy="34" r="9" fill="#10b981" />
      <text x="26" y="38" fill="#fff" fontSize="10" fontWeight="900" textAnchor="middle">A</text>
      <circle cx="74" cy="34" r="9" fill="#f43f5e" />
      <text x="74" y="38" fill="#fff" fontSize="10" fontWeight="900" textAnchor="middle">B</text>
      <path d="M33 29 Q42 22 44 22M67 29 Q58 22 56 22" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
    </svg>
  ),
};

const HUB_GAMES: HubGame[] = [
  { id: 'vote_reveal', name: 'Would You Rather', badge: 'Vote & Reveal', players: '2-12', filter: 'party', accent: 'from-sky-100 to-pink-100', art: ART.vote_reveal },
  { id: 'most_likely', name: "Who's Most Likely", badge: 'Group Vote', players: '2-12', filter: 'party', accent: 'from-purple-100 to-rose-100', art: ART.most_likely },
  { id: 'friendship_test', name: 'Friendship Test', badge: 'Quiz Link', players: 'Async', filter: 'party', accent: 'from-emerald-100 to-cyan-100', art: ART.friendship_test },
  { id: 'trivia', name: '20-Second Challenge', badge: 'Trivia', players: 'Solo-12', filter: 'fast', accent: 'from-amber-100 to-indigo-100', solo: true, art: ART.trivia },
  { id: 'higher_lower', name: 'Higher or Lower', badge: 'Sudden Death', players: 'Solo-8', filter: 'fast', accent: 'from-emerald-100 to-cyan-100', solo: true, art: ART.higher_lower },
  { id: 'tic_tac_toe', name: 'Tic Tac Toe', badge: 'Tactical Shift', players: 'Solo-2', filter: 'duel', accent: 'from-cyan-100 to-indigo-100', solo: true, art: ART.tic_tac_toe },
  { id: 'word_chain', name: 'Word Chain', badge: 'Elimination', players: '2-8', filter: 'duel', accent: 'from-blue-100 to-indigo-100', art: ART.word_chain },
];

const FILTERS: { id: GameFilter; label: string }[] = [
  { id: 'all', label: '✨ All' },
  { id: 'party', label: '🔥 Party' },
  { id: 'fast', label: '⚡ Fast Play' },
  { id: 'duel', label: '🧠 Duel' },
];

export const RoomEntryView: React.FC<RoomEntryViewProps> = ({
  initialRoomCode,
  onOpenFriendshipQuiz,
}) => {
  const { createGame, joinGame, loading, error, setError } = useGame();

  const [tab, setTab] = useState<HubTab>(() => (initialRoomCode ? 'join' : 'games'));
  const [filter, setFilter] = useState<GameFilter>('all');
  const [createFor, setCreateFor] = useState<MultiplayerGameType | null>(null);
  const [category, setCategory] = useState<string>('cities');
  const [avatar, setAvatar] = useState<string>(() => getSavedAvatar());
  const [displayName, setDisplayName] = useState(() => {
    if (typeof window === 'undefined') return '';
    const raw = localStorage.getItem('word_chain_saved_name') || '';
    return extractPlayerAvatar(raw).cleanName;
  });
  const [inputCode, setInputCode] = useState(() => (initialRoomCode ? sanitizeRoomCode(initialRoomCode) : ''));
  const [savedQuizzes] = useState<UserSavedQuiz[]>(() => getMySavedQuizzes());
  const [copiedQuizCode, setCopiedQuizCode] = useState<string | null>(null);
  const [isLocalTicTacToeOpen, setIsLocalTicTacToeOpen] = useState(false);

  // Hardware Back closes sub-screens one step at a time instead of exiting the app
  useHistoryLayer(tab !== 'games', () => setTab('games'));
  useHistoryLayer(createFor !== null, () => setCreateFor(null));
  useHistoryLayer(isLocalTicTacToeOpen, () => setIsLocalTicTacToeOpen(false));

  const handleCopyQuizLink = (code: string) => {
    if (typeof window === 'undefined') return;
    haptics.tap();
    const url = `${window.location.origin}/?quiz=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedQuizCode(code);
    setTimeout(() => setCopiedQuizCode(null), 2000);
  };

  const saveName = (name: string) => {
    const clean = extractPlayerAvatar(name).cleanName;
    setDisplayName(clean);
    if (typeof window !== 'undefined') {
      localStorage.setItem('word_chain_saved_name', clean.trim());
    }
  };

  const handleAvatarSelect = (em: string) => {
    haptics.tap();
    setAvatar(em);
    saveAvatar(em);
  };

  const handleSelectGame = (game: HubGame) => {
    haptics.tap();
    setError(null);
    if (game.id === 'friendship_test') {
      onOpenFriendshipQuiz?.();
      return;
    }
    const type = game.id as MultiplayerGameType;
    const firstCategory = GAME_TYPES[type]?.categories[0]?.id;
    setCategory(type === 'tic_tac_toe' ? 'classic' : firstCategory || 'cities');
    setCreateFor(type);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFor) return;
    if (!displayName.trim()) {
      setError('Please enter your name to create the room');
      return;
    }
    haptics.pulse();
    const finalName = formatPlayerNameWithAvatar(displayName.trim(), avatar);
    await createGame(finalName, category, createFor);
  };

  const handleQuickJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim().toUpperCase();
    if (!clean) {
      setError('Please enter a room or quiz code');
      return;
    }

    // If code looks like a friendship quiz code (5+ chars)
    if (clean.length >= 5 && onOpenFriendshipQuiz) {
      haptics.tap();
      onOpenFriendshipQuiz(clean);
      return;
    }

    // Otherwise standard 4-letter room code
    if (!displayName.trim()) {
      setTab('join');
      setError('Please enter your display name to join the room');
      return;
    }

    haptics.pulse();
    const finalName = formatPlayerNameWithAvatar(displayName.trim(), avatar);
    await joinGame(clean, finalName);
  };

  // Local Tic-Tac-Toe (bot / pass & play) launched from the Hub
  if (isLocalTicTacToeOpen) {
    return <TicTacToeGameView forceLocal onExitLocal={() => setIsLocalTicTacToeOpen(false)} />;
  }

  const visibleGames = HUB_GAMES.filter((g) => filter === 'all' || g.filter === filter);
  const createInfo = createFor ? GAME_TYPES[createFor] : null;

  return (
    <div className="relative flex flex-col h-full min-h-0 w-full max-w-2xl mx-auto text-slate-800 animate-fade-in">
      {/* Top: sleek Join Room Code bar */}
      <form onSubmit={handleQuickJoin} className="px-3 pt-3 pb-2 shrink-0">
        <div className="glass-card glow-border rounded-full p-1.5 pl-3 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-600 shrink-0" />
          <input
            type="text"
            placeholder="Room code or quiz code"
            aria-label="Room code or quiz code"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            maxLength={12}
            className="flex-1 min-w-0 bg-transparent text-sm font-mono font-bold tracking-wider text-[#0b2545] placeholder-slate-400 placeholder:font-sans placeholder:tracking-normal placeholder:font-semibold focus:outline-none uppercase"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-full btn-neon-emerald font-bold text-xs flex items-center gap-1 shrink-0"
          >
            <span>Join</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {error && tab === 'games' && (
          <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="break-words">{error}</span>
          </div>
        )}
      </form>

      {/* Middle: scrollable tab content (page itself never scrolls) */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 pb-2">
        {tab === 'games' && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    haptics.tap();
                    setFilter(f.id);
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border shrink-0 ${
                    filter === f.id
                      ? 'bg-[#0b2545] text-white border-[#0b2545] shadow-md'
                      : 'bg-white/60 text-slate-700 border-white hover:bg-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-black text-cyan-800 bg-cyan-50 border border-cyan-200 px-2 py-1 rounded-full animate-badge-pulse">
                <Sparkles className="w-3 h-3" />
                {ALL_GAMES_COUNT} Games
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {visibleGames.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => handleSelectGame(game)}
                  className="glass-card glow-border rounded-2xl p-2.5 text-left flex flex-col gap-1.5 hover:-translate-y-0.5 transition-all active:scale-[0.97]"
                >
                  <div
                    className={`h-12 rounded-xl bg-gradient-to-br ${game.accent} border border-white/80 px-1.5 py-1 overflow-hidden`}
                  >
                    {game.art}
                  </div>
                  <div className="font-black text-[13px] leading-tight text-[#0b2545] break-words">{game.name}</div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-100 leading-tight">
                      {game.badge}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border leading-tight ${
                        game.solo
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 animate-badge-pulse'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {game.solo ? '⚡ ' : ''}
                      {game.players}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'join' && (
          <form onSubmit={handleQuickJoin} className="glass-card glow-border rounded-3xl p-4 space-y-3 animate-fade-in">
            <h2 className="text-base font-black text-[#0b2545]">Join a Room</h2>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Room Code
              </label>
              <input
                type="text"
                placeholder="ABCD"
                maxLength={12}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 bg-white/70 border border-white rounded-2xl text-center text-xl font-mono font-bold tracking-widest text-[#0b2545] placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 uppercase"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Your Nickname &amp; Avatar
                </label>
              </div>
              <div className="flex items-center gap-2">
                <AvatarPicker
                  selectedEmoji={avatar}
                  onSelect={handleAvatarSelect}
                  compact
                />
                <input
                  type="text"
                  placeholder="e.g. GameMaster"
                  maxLength={20}
                  value={displayName}
                  onChange={(e) => saveName(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/70 border border-white rounded-2xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                />
              </div>
            </div>
            {error && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="break-words">{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full btn-neon-emerald font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ArrowRight className="w-4 h-4" />
              <span>{loading ? 'Joining Room...' : 'Enter Game Lobby'}</span>
            </button>
          </form>
        )}

        {tab === 'results' && (
          <div className="space-y-2.5 animate-fade-in">
            <div className="glass-card rounded-3xl p-3.5 flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-sm text-[#0b2545]">My Quizzes &amp; Live Results</h2>
                <p className="text-[11px] text-slate-500 font-medium">Saved in this browser</p>
              </div>
              <button
                type="button"
                onClick={() => onOpenFriendshipQuiz?.()}
                className="ml-auto px-3 py-2 rounded-full btn-neon text-[11px] font-bold shrink-0"
              >
                + New Quiz
              </button>
            </div>

            {savedQuizzes.length === 0 ? (
              <div className="glass-card rounded-3xl p-5 text-center text-xs text-slate-600 leading-relaxed">
                No quizzes yet. Create a Friendship Test, share it, and your friends&apos; scores will show up here.
              </div>
            ) : (
              savedQuizzes.map((q) => (
                <div key={q.code} className="glass-card rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm text-[#0b2545] tracking-wider">{q.code}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyQuizLink(q.code)}
                      className="p-1.5 text-slate-500 hover:text-emerald-700"
                      title="Copy share link"
                      aria-label="Copy share link"
                    >
                      {copiedQuizCode === q.code ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenFriendshipQuiz?.(q.code, 'results')}
                    className="w-full py-2 rounded-full btn-neon-emerald text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-200" />
                    <span>View Results &amp; Leaderboard</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom app navigation */}
      <nav className="shrink-0 px-3 pt-1 safe-bottom">
        <div className="glass-card rounded-full p-1 grid grid-cols-3 gap-1">
          {(
            [
              { id: 'games', label: 'Games', icon: <Gamepad2 className="w-4 h-4" />, emoji: '🎮' },
              { id: 'join', label: 'Join Code', icon: <KeyRound className="w-4 h-4" />, emoji: '🔑' },
              { id: 'results', label: 'My Results', icon: <Trophy className="w-4 h-4" />, emoji: '🏆' },
            ] as { id: HubTab; label: string; icon: React.ReactNode; emoji: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                haptics.tap();
                setError(null);
                setTab(item.id);
              }}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`py-2 rounded-full text-[11px] font-bold flex items-center justify-center gap-1.5 ${
                tab === item.id ? 'btn-neon' : 'text-slate-700 hover:bg-white/70'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Create-room bottom sheet */}
      {createFor && createInfo && (
        <div className="absolute inset-0 z-30 flex items-end sm:items-center justify-center bg-[#0b2545]/45 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateRoom}
            className="glass-card glow-border w-full max-w-md rounded-t-3xl sm:rounded-3xl p-4 space-y-3 max-h-full overflow-y-auto no-scrollbar bg-white/85"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-2xl btn-neon flex items-center justify-center text-lg shrink-0">
                  {createInfo.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase text-indigo-600 tracking-wider">New Room</div>
                  <h3 className="text-base font-black text-[#0b2545] leading-tight break-words">{createInfo.name}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateFor(null)}
                className="p-2 rounded-full bg-white/80 border border-white text-slate-600 shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Your Nickname &amp; Avatar
                </label>
              </div>
              <div className="flex items-center gap-2">
                <AvatarPicker
                  selectedEmoji={avatar}
                  onSelect={handleAvatarSelect}
                  compact
                />
                <input
                  type="text"
                  placeholder="e.g. MasterWordsmith"
                  maxLength={20}
                  value={displayName}
                  onChange={(e) => saveName(e.target.value)}
                  required
                  className="flex-1 px-4 py-3 bg-white/80 border border-white rounded-2xl text-slate-900 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                />
              </div>
            </div>

            {createFor === 'tic_tac_toe' ? (
              <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-xs text-slate-700 space-y-1">
                <div className="font-bold text-[#0b2545] text-sm">⚡ Tactical Shift (default)</div>
                <p className="text-[11px] leading-relaxed">
                  3 X and 3 O start on the board — move your pieces to line up 3. Switch to Classic Empty in the
                  lobby. Play online with a friend, or jump straight into a solo game vs the AI bot.
                </p>
              </div>
            ) : (
              createInfo.categories.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Choose Category
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {createInfo.categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-2 rounded-2xl border text-left flex items-start gap-1.5 ${
                          category === cat.id
                            ? 'bg-cyan-50 border-cyan-400 ring-2 ring-cyan-100'
                            : 'bg-white/70 border-white hover:bg-white'
                        }`}
                      >
                        <span className="text-lg shrink-0">{cat.icon}</span>
                        <span className="min-w-0">
                          <span className="block font-bold text-xs text-[#0b2545] leading-tight break-words">
                            {cat.name}
                          </span>
                          <span className="block text-[10px] text-slate-500 leading-snug break-words">
                            {cat.description}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}

            {error && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="break-words">{error}</span>
              </div>
            )}

            <div className="space-y-2">
              {createFor === 'tic_tac_toe' && (
                <button
                  type="button"
                  onClick={() => {
                    setCreateFor(null);
                    setIsLocalTicTacToeOpen(true);
                  }}
                  className="w-full py-3 rounded-full bg-[#0b2545] text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Bot className="w-4 h-4 text-cyan-300" />
                  <span>Play Solo vs AI / Pass &amp; Play</span>
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-full btn-neon-emerald font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{loading ? 'Creating Room...' : 'Start Game Room'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

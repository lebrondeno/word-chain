import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { CATEGORIES } from '../data';
import { VOTE_REVEAL_CATEGORIES } from '../data/prompts';
import { sanitizeRoomCode } from '../lib/roomCode';
import {
  Play,
  Sparkles,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface RoomEntryViewProps {
  initialRoomCode?: string;
  onOpenSupabaseModal?: () => void;
  onOpenFriendshipQuiz?: (code?: string) => void;
}

export const RoomEntryView: React.FC<RoomEntryViewProps> = ({
  initialRoomCode,
  onOpenSupabaseModal,
  onOpenFriendshipQuiz,
}) => {
  const { createGame, joinGame, loading, error, setError } = useGame();

  const [activeTab, setActiveTab] = useState<'hub' | 'create_room' | 'join'>('hub');
  const [selectedGameType, setSelectedGameType] = useState<'word_chain' | 'vote_reveal'>('word_chain');
  const [category, setCategory] = useState<string>('cities');
  const [displayName, setDisplayName] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('word_chain_saved_name') || '' : '';
  });
  const [inputCode, setInputCode] = useState(() => (initialRoomCode ? sanitizeRoomCode(initialRoomCode) : ''));

  const saveName = (name: string) => {
    setDisplayName(name);
    if (typeof window !== 'undefined') {
      localStorage.setItem('word_chain_saved_name', name.trim());
    }
  };

  const handleSelectGameToCreate = (gameType: 'word_chain' | 'vote_reveal') => {
    setSelectedGameType(gameType);
    if (gameType === 'vote_reveal') {
      setCategory('general');
    } else {
      setCategory('cities');
    }
    setActiveTab('create_room');
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your name to create the room');
      return;
    }
    await createGame(displayName.trim(), category, selectedGameType);
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
      onOpenFriendshipQuiz(clean);
      return;
    }

    // Otherwise standard 4-letter room code
    if (!displayName.trim()) {
      setActiveTab('join');
      setError('Please enter your display name to join the room');
      return;
    }

    await joinGame(clean, displayName.trim());
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-8 animate-fade-in text-slate-800">
      {/* 1. Header Hero Banner */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-blue-200/80 text-[#3b4cca] text-xs font-bold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Party Game Hub • Instant Browser Play</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-[#0b2545] tracking-tight leading-tight">
          Play Together. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#3b4cca] via-[#1f9d55] to-[#f43f5e] bg-clip-text text-transparent">
            Fast, Social &amp; Real-Time.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
          No sign-ups or app downloads needed. Pick a game, share the invite on WhatsApp, and start playing in seconds!
        </p>
      </div>

      {/* Supabase Notice if not configured */}
      {!configured && onOpenSupabaseModal && (
        <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm flex items-start gap-3 text-xs text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold text-amber-950 block mb-0.5">Database Setup Recommended</span>
            Connect your Supabase credentials to enable cross-device live multiplayer rooms and real-time syncing.
          </div>
          <button
            type="button"
            onClick={onOpenSupabaseModal}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-300 transition shrink-0"
          >
            Configure
          </button>
        </div>
      )}

      {/* 2. Universal "Join Room or Quiz Code" Bar with thumbnail icon */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 max-w-2xl mx-auto">
        <form onSubmit={handleQuickJoin} className="flex flex-col sm:flex-row items-center gap-3">
          {/* Small Thumbnail Icon */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-[#eef4fa] border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#0b2545" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="M7 15h2M15 15h2M9 9h6" strokeLinecap="round" />
              </svg>
            </div>
            <div className="sm:hidden text-xs font-bold text-[#0b2545]">Join by Code:</div>
          </div>

          {/* Code Input */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="Enter Room Code (e.g. ABCD) or Quiz Link"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              maxLength={12}
              className="w-full px-4 py-2.5 sm:py-3 bg-[#f8fafc] border border-slate-300 rounded-2xl text-sm font-mono font-bold tracking-wider text-[#0b2545] placeholder-slate-400 focus:outline-none focus:border-[#3b4cca] focus:ring-2 focus:ring-blue-100 uppercase transition"
            />
          </div>

          {/* Join Button */}
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-1.5 shrink-0 active:scale-[0.98]"
          >
            <span>Join Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 3. Main View Switching (Game Hub vs Create Room vs Join Form) */}
      {activeTab === 'hub' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg sm:text-xl font-black text-[#0b2545] flex items-center gap-2">
              <span>Choose a Game Mode</span>
            </h2>
            <span className="text-xs font-bold text-slate-400">3 Games Available</span>
          </div>

          {/* 3 Interactive Game Mode Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ---------------- CARD 1: WORD CHAIN ---------------- */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              {/* Custom Inline SVG Banner Artwork: Letter tiles, chain links, 30s stopwatch */}
              <div className="w-full h-40 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/80 p-3 relative overflow-hidden flex items-center justify-center mb-4">
                <svg viewBox="0 0 280 140" className="w-full h-full">
                  <defs>
                    <linearGradient id="tileW" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#3b4cca" />
                      <stop offset="100%" stop-color="#1e2a78" />
                    </linearGradient>
                    <linearGradient id="tileO" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#1f9d55" />
                      <stop offset="100%" stop-color="#0b6e27" />
                    </linearGradient>
                  </defs>

                  {/* Interlocking Letter Tiles */}
                  <rect x="25" y="35" width="58" height="58" rx="14" fill="url(#tileW)" filter="drop-shadow(0 4px 6px rgba(59,76,202,0.3))" />
                  <text x="54" y="75" fill="#ffffff" fontSize="34" fontWeight="900" textAnchor="middle" fontFamily="system-ui, sans-serif">W</text>

                  {/* Glowing Chain Links */}
                  <rect x="75" y="55" width="34" height="18" rx="9" fill="none" stroke="#fbbf24" strokeWidth="5" />
                  <rect x="97" y="55" width="34" height="18" rx="9" fill="none" stroke="#60a5fa" strokeWidth="5" />

                  {/* Second Tile */}
                  <rect x="122" y="35" width="58" height="58" rx="14" fill="url(#tileO)" filter="drop-shadow(0 4px 6px rgba(31,157,85,0.3))" />
                  <text x="151" y="75" fill="#ffffff" fontSize="34" fontWeight="900" textAnchor="middle" fontFamily="system-ui, sans-serif">C</text>

                  {/* 30s Stopwatch Illustration */}
                  <g transform="translate(200, 30)">
                    <circle cx="35" cy="38" r="28" fill="#ffffff" stroke="#f59e0b" strokeWidth="4.5" />
                    <rect x="31" y="4" width="8" height="8" rx="2" fill="#d97706" />
                    <line x1="35" y1="38" x2="35" y2="22" stroke="#d97706" strokeWidth="4" strokeLinecap="round" />
                    <line x1="35" y1="38" x2="48" y2="38" stroke="#d97706" strokeWidth="4" strokeLinecap="round" />
                    <text x="35" y="56" fill="#b45309" fontSize="13" fontWeight="900" textAnchor="middle" fontFamily="monospace">30s</text>
                  </g>
                </svg>
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#3b4cca] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    Live Elimination
                  </span>
                  <span className="text-xs font-bold text-slate-500">2-8 Players</span>
                </div>

                <h3 className="text-xl font-black text-[#0b2545]">Word Chain</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pass the letter, hold the chain! Link words by their final letter against the ticking <strong>30-second stopwatch</strong>.
                </p>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSelectGameToCreate('word_chain')}
                  className="w-full py-3 px-4 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Create Word Chain Room</span>
                </button>
              </div>
            </div>

            {/* ---------------- CARD 2: WOULD YOU RATHER ---------------- */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              {/* Custom Inline SVG Banner Artwork: Split electric-blue vs crimson-coral cards with lightning divider */}
              <div className="w-full h-40 rounded-2xl bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 border border-slate-200/80 p-3 relative overflow-hidden flex items-center justify-center mb-4">
                <svg viewBox="0 0 280 140" className="w-full h-full">
                  <defs>
                    <linearGradient id="splitBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#3b82f6" />
                      <stop offset="100%" stop-color="#1d4ed8" />
                    </linearGradient>
                    <linearGradient id="splitCoral" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#f43f5e" />
                      <stop offset="100%" stop-color="#be123c" />
                    </linearGradient>
                  </defs>

                  {/* Split Electric-Blue Choice Card */}
                  <rect x="18" y="25" width="105" height="85" rx="16" fill="url(#splitBlue)" filter="drop-shadow(0 4px 6px rgba(59,130,246,0.3))" />
                  <text x="70" y="58" fill="#ffffff" fontSize="16" fontWeight="900" textAnchor="middle" fontFamily="system-ui, sans-serif">OPTION A</text>
                  <text x="70" y="80" fill="#dbeafe" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">Unlimited Food</text>

                  {/* Central Lightning Bolt Divider */}
                  <circle cx="140" cy="67" r="22" fill="#ffffff" stroke="#f59e0b" strokeWidth="3" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.15))" />
                  <polygon points="141,50 132,68 140,68 139,84 149,65 140,65" fill="#f59e0b" />

                  {/* Split Crimson-Coral Choice Card */}
                  <rect x="157" y="25" width="105" height="85" rx="16" fill="url(#splitCoral)" filter="drop-shadow(0 4px 6px rgba(244,63,94,0.3))" />
                  <text x="210" y="58" fill="#ffffff" fontSize="16" fontWeight="900" textAnchor="middle" fontFamily="system-ui, sans-serif">OPTION B</text>
                  <text x="210" y="80" fill="#ffe4e6" fontSize="11" fontWeight="700" textAnchor="middle" fontFamily="system-ui, sans-serif">Free Flights</text>
                </svg>
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#3b4cca] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    Social Vote &amp; Reveal
                  </span>
                  <span className="text-xs font-bold text-slate-500">2-12 Players</span>
                </div>

                <h3 className="text-xl font-black text-[#0b2545]">Would You Rather</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Vote privately on tough dilemmas within 20s, then reveal the hilarious group split and who chose what!
                </p>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSelectGameToCreate('vote_reveal')}
                  className="w-full py-3 px-4 rounded-full bg-[#3b4cca] hover:bg-[#2f3da7] text-white font-bold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Create Vote &amp; Reveal Room</span>
                </button>
              </div>
            </div>

            {/* ---------------- CARD 3: FRIENDSHIP TEST ---------------- */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              {/* Custom Inline SVG Banner Artwork: Circular score chart, trophy, star-eyed emoji */}
              <div className="w-full h-40 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border border-emerald-100/80 p-3 relative overflow-hidden flex items-center justify-center mb-4">
                <svg viewBox="0 0 280 140" className="w-full h-full">
                  {/* Two-tone royal-blue & forest-green circular score chart */}
                  <g transform="translate(65, 70)">
                    <circle cx="0" cy="0" r="42" fill="#0b2545" />
                    <circle cx="0" cy="0" r="35" fill="none" stroke="#3b4cca" strokeWidth="8" strokeDasharray="140 80" />
                    <circle cx="0" cy="0" r="35" fill="none" stroke="#0b6e27" strokeWidth="8" strokeDasharray="90 130" strokeDashoffset="-40" />
                    <text x="0" y="-3" fill="#ffffff" fontSize="16" fontWeight="900" textAnchor="middle" fontFamily="system-ui, sans-serif">9</text>
                    <line x1="-12" y1="3" x2="12" y2="3" stroke="#ffffff" strokeWidth="1.5" />
                    <text x="0" y="18" fill="#93c5fd" fontSize="13" fontWeight="800" textAnchor="middle" fontFamily="system-ui, sans-serif">10</text>
                  </g>

                  {/* Golden Trophy */}
                  <g transform="translate(160, 42)">
                    <circle cx="28" cy="28" r="28" fill="#fef3c7" stroke="#fbbf24" strokeWidth="2" />
                    <text x="28" y="38" fontSize="30" textAnchor="middle">🏆</text>
                  </g>

                  {/* Star-Eyed Emojis */}
                  <text x="215" y="48" fontSize="26">🤩</text>
                  <text x="228" y="85" fontSize="20">✨</text>
                </svg>
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1f9d55] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Asynchronous Quiz
                  </span>
                  <span className="text-xs font-bold text-slate-500">10-20 Questions</span>
                </div>

                <h3 className="text-xl font-black text-[#0b2545]">Friendship Test</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Personalized <strong>"Know Me Better"</strong> quiz. Build your answers, share on WhatsApp, and see friends battle on your live leaderboard!
                </p>
              </div>

              <div className="pt-5 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onOpenFriendshipQuiz && onOpenFriendshipQuiz()}
                  className="w-full py-3 px-4 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Create Friendship Quiz</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'create_room' ? (
        /* CREATE ROOM FORM */
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 max-w-lg mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase text-[#3b4cca]">Room Creator</span>
              <h3 className="text-xl font-black text-[#0b2545]">
                Create {selectedGameType === 'vote_reveal' ? 'Would You Rather' : 'Word Chain'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('hub')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition py-1 px-2 rounded-lg bg-slate-100"
            >
              ✕ Back
            </button>
          </div>

          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0b2545] mb-1.5">
                Your Nickname
              </label>
              <input
                type="text"
                placeholder="e.g. MasterWordsmith"
                maxLength={20}
                value={displayName}
                onChange={(e) => saveName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:border-[#3b4cca] text-sm"
              />
            </div>

            {/* Category / Theme Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0b2545] mb-1.5">
                {selectedGameType === 'vote_reveal' ? 'Choose Dilemma Theme' : 'Choose Word Category'}
              </label>

              {selectedGameType === 'vote_reveal' ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {Object.values(VOTE_REVEAL_CATEGORIES).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-2xl border text-left transition ${
                        category === cat.id
                          ? 'bg-blue-50 border-[#3b4cca] text-[#0b2545] font-bold shadow-2xs'
                          : 'bg-[#f8fafc] border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <div className="font-bold text-xs mt-1 text-[#0b2545]">{cat.name}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{cat.description}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.values(CATEGORIES).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2.5 rounded-2xl border text-left transition ${
                        category === cat.id
                          ? 'bg-emerald-50 border-[#1f9d55] text-emerald-950 font-bold shadow-2xs'
                          : 'bg-[#f8fafc] border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <div className="font-bold text-xs mt-1 text-slate-900 truncate">{cat.name}</div>
                      <div className="text-[10px] text-slate-500">{cat.words.length}+ words</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-6 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{loading ? 'Creating Room...' : 'Start Game Room'}</span>
            </button>
          </form>
        </div>
      ) : (
        /* JOIN ROOM FORM */
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 max-w-md mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-xl font-black text-[#0b2545]">Join Active Room</h3>
            <button
              type="button"
              onClick={() => setActiveTab('hub')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition py-1 px-2 rounded-lg bg-slate-100"
            >
              ✕ Back
            </button>
          </div>

          <form onSubmit={handleQuickJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0b2545] mb-1.5">
                Room Code
              </label>
              <input
                type="text"
                placeholder="ABCD"
                maxLength={4}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                required
                className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-300 rounded-2xl text-center text-2xl font-mono font-bold tracking-widest text-[#0b2545] uppercase focus:outline-none focus:border-[#3b4cca]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#0b2545] mb-1.5">
                Your Nickname
              </label>
              <input
                type="text"
                placeholder="e.g. WordNinja"
                maxLength={20}
                value={displayName}
                onChange={(e) => saveName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-300 rounded-2xl text-slate-900 font-semibold focus:outline-none focus:border-[#3b4cca] text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
            >
              <span>{loading ? 'Joining Room...' : 'Enter Game Lobby'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

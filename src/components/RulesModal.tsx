import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Clock,
  Zap,
  Trophy,
  Vote,
  Sparkles,
  HeartHandshake,
  HelpCircle,
  TrendingUp,
  CircleDot,
  Users,
} from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType =
  | 'word_chain'
  | 'vote_reveal'
  | 'friendship_test'
  | 'tic_tac_toe'
  | 'trivia'
  | 'higher_lower'
  | 'most_likely';

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('word_chain');

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'word_chain', label: 'Word Chain', icon: '⛓️' },
    { id: 'vote_reveal', label: 'Would You Rather', icon: '🗳️' },
    { id: 'friendship_test', label: 'Friendship Quiz', icon: '🤝' },
    { id: 'tic_tac_toe', label: 'Tic Tac Toe', icon: '⭕' },
    { id: 'trivia', label: '20s Trivia', icon: '⚡' },
    { id: 'higher_lower', label: 'Higher/Lower', icon: '📈' },
    { id: 'most_likely', label: 'Most Likely', icon: '👀' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-slate-800">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-[#3b4cca] rounded-2xl border border-indigo-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-[#0b2545]">How to Play</h3>
              <p className="text-xs text-slate-500">Rules &amp; Game Guides for all 7 modes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons (Horizontal Scrollable) */}
        <div className="flex px-4 pt-3 gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 no-scrollbar">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-3 rounded-full text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-[#0b2545] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Rules Content */}
        <div className="p-6 overflow-y-auto space-y-3.5 text-xs leading-relaxed text-slate-600">
          {activeTab === 'word_chain' && (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">1. Link the Last Letter</h4>
                  <p>
                    Each word must start with the <strong className="text-amber-600">last letter</strong> of the previous word.
                    For example: Toky<u className="text-[#3b4cca] font-bold">o</u> ➔ <u className="text-[#3b4cca] font-bold">O</u>sl<u className="text-[#3b4cca] font-bold">o</u>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <BookOpen className="w-5 h-5 text-[#3b4cca] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">2. Match the Category &amp; No Repeats</h4>
                  <p>
                    Words must exist in the curated category list (e.g. Cities, Animals, Countries, Food, Movies) and cannot be repeated within the same game!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Clock className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">3. 30-Second Turn Countdown</h4>
                  <p>
                    Players have <strong className="text-rose-600">30 seconds</strong> to submit a valid word on their turn. If the countdown expires before submitting, the player is eliminated.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Trophy className="w-5 h-5 text-[#1f9d55] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">4. Last Player Standing Wins</h4>
                  <p>
                    Turns cycle through active players until the last standing champion is crowned!
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'vote_reveal' && (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Vote className="w-5 h-5 text-[#3b4cca] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">1. Secret Voting</h4>
                  <p>
                    Read the dilemma prompt and choose between <strong className="text-[#3b4cca]">Option A</strong> or <strong className="text-rose-600">Option B</strong>. Your choice stays secret until voting ends.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">2. 20-Second Voting Window</h4>
                  <p>
                    Everyone has 20 seconds to cast their vote. Once all players submit (or timer expires), the results are instantly revealed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Sparkles className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">3. The Big Reveal</h4>
                  <p>
                    See the percentage split and discover exactly which players picked Option A vs Option B!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Trophy className="w-5 h-5 text-[#1f9d55] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">4. Pure Social Fun</h4>
                  <p>
                    No eliminations or losers — it's all about lively discussions, surprising reactions, and multiple rounds of fun.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'friendship_test' && (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <HeartHandshake className="w-5 h-5 text-[#1f9d55] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">1. Build Your Personalized Quiz</h4>
                  <p>
                    Choose 10, 15, or 20 questions true to yourself. Swap prompts from our 100-question bank across categories like Besties, Couples, Gen Z, Food, and Chaos!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <HelpCircle className="w-5 h-5 text-[#3b4cca] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">2. Instant Per-Question Feedback</h4>
                  <p>
                    Friends open your quiz link and answer one question at a time. Each selection reveals green (correct) or red (wrong) for 900ms before advancing!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Trophy className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">3. Live Leaderboard</h4>
                  <p>
                    Scores are ranked automatically. If a friend takes your quiz more than once, only their best score is kept!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Sparkles className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">4. Asynchronous &amp; Viral</h4>
                  <p>
                    No need to be online at the same time! Share to WhatsApp and challenge your friend circle anytime.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'tic_tac_toe' && (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <CircleDot className="w-5 h-5 text-[#3b4cca] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">1. Classic 3x3 Grid</h4>
                  <p>
                    Players take turns placing their mark (<strong className="text-[#3b4cca]">X</strong> or <strong className="text-[#f43f5e]">O</strong>). First to line up 3 marks horizontally, vertically, or diagonally wins! In the default <strong>Tactical Shift</strong> mode the board starts with 3 X on the top row and 3 O on the bottom row: tap one of your pieces, then tap a glowing open square to move it. Line up your 3 pieces on any row, column or diagonal <strong>except your own starting home row</strong> to win.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Zap className="w-5 h-5 text-[#1f9d55] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">2. Multiplayer &amp; Solo vs Bot</h4>
                  <p>
                    Play live head-to-head in a room with room codes, or play locally on one phone (Pass &amp; Play) or against our Smart Minimax AI Bot!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">3. 20s Turn Countdown</h4>
                  <p>
                    In multiplayer rooms, turns expire after 20 seconds. If time runs out, the turn automatically passes to your opponent without elimination.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Trophy className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">4. Game Night Points</h4>
                  <p>
                    A win awards <strong className="text-[#1f9d55]">+2 points</strong> to your room standings; a draw awards <strong className="text-amber-600">+1 point</strong> to each player!
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'trivia' && (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Clock className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">1. 20 Seconds on the Clock</h4>
                  <p>
                    Each question features 4 multiple choice answers. Lock in your choice before the 20-second timer hits zero!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Trophy className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">2. Score +1 Per Correct Answer</h4>
                  <p>
                    Every correct answer earns +1 point on your live room scoreboard. Fast-paced knowledge battle across Sports, Geography, History, and General Trivia!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Sparkles className="w-5 h-5 text-[#3b4cca] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">3. The Reveal Phase</h4>
                  <p>
                    Once everyone answers (or the timer expires), the correct answer is revealed in vibrant green, with player stats updated in real-time.
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'higher_lower' && (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">1. Higher or Lower?</h4>
                  <p>
                    Look at the benchmark value (e.g. population of Tokyo: 37.4M). On your turn, decide whether the next hidden item is higher or lower!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Zap className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">2. Sudden Death Elimination</h4>
                  <p>
                    One wrong guess and you are immediately eliminated from the match. Surviving players continue until one champion remains!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Trophy className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">3. Bonus Championship Points</h4>
                  <p>
                    The winner earns <strong className="text-[#1f9d55]">+3 points</strong> plus <strong className="text-amber-600">+1 point</strong> for every correct guess made!
                  </p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'most_likely' && (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Users className="w-5 h-5 text-[#3b4cca] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">1. Vote on Your Friends</h4>
                  <p>
                    Read humorous scenarios like "Who's most likely to sleep through an important meeting?" and pick the friend in the room who best fits!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Vote className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">2. Secret Voting</h4>
                  <p>
                    Everyone casts their vote privately within 20 seconds.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#0b2545] text-sm mb-1">3. Crown the Group Favorite</h4>
                  <p>
                    See full vote tallies, percentage breakdowns, and who crowned whom!
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="w-full bg-[#0b2545] hover:bg-[#13315c] text-white font-bold py-3 rounded-full transition shadow-sm text-xs sm:text-sm"
          >
            Got it, let's play!
          </button>
        </div>
      </div>
    </div>
  );
};

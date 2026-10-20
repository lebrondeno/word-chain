import React, { useState } from 'react';
import { X, BookOpen, Clock, Zap, Trophy, Vote, Sparkles, HeartHandshake, HelpCircle } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'word_chain' | 'vote_reveal' | 'friendship_test';

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('word_chain');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl text-slate-900 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-[#3b4cca] rounded-xl border border-indigo-100">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">How to Play</h3>
              <p className="text-xs text-slate-500">Rules & Game Guides</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex px-6 pt-4 gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('word_chain')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'word_chain'
                ? 'bg-[#0b2545] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>⛓️ Word Chain</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vote_reveal')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'vote_reveal'
                ? 'bg-[#3b4cca] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>🗳️ Would You Rather</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('friendship_test')}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'friendship_test'
                ? 'bg-[#1f9d55] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>🤝 Friendship Test</span>
          </button>
        </div>

        {/* Rules Content */}
        <div className="p-6 overflow-y-auto space-y-3.5 text-xs leading-relaxed text-slate-600">
          {activeTab === 'word_chain' && (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">1. Link the Last Letter</h4>
                  <p>
                    Each submitted word must start with the <strong className="text-amber-600">last letter</strong> of the previous word.
                    For example: Toky<u className="text-[#3b4cca] font-bold">o</u> ➔ <u className="text-[#3b4cca] font-bold">O</u>sl<u className="text-[#3b4cca] font-bold">o</u>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <BookOpen className="w-5 h-5 text-[#3b4cca] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">2. Match the Category & No Repeats</h4>
                  <p>
                    Words must exist in the curated category list (e.g. Cities, Animals, Countries, Food, Movies) and cannot be repeated within the same game!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Clock className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">3. 30-Second Turn Countdown</h4>
                  <p>
                    Players have <strong className="text-rose-600">30 seconds</strong> to submit a valid word on their turn. If the countdown expires before submitting, the player is eliminated.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Trophy className="w-5 h-5 text-[#1f9d55] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">4. Last Player Standing Wins</h4>
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
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">1. Secret Voting</h4>
                  <p>
                    Read the dilemma prompt and choose between <strong className="text-[#3b4cca]">Option A</strong> or <strong className="text-rose-600">Option B</strong>. Your choice stays secret until voting ends.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">2. 20-Second Voting Window</h4>
                  <p>
                    Everyone has 20 seconds to cast their vote. Once all players submit (or timer expires), the results are instantly revealed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Sparkles className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">3. The Big Reveal</h4>
                  <p>
                    See the percentage split and discover exactly which players picked Option A vs Option B!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Trophy className="w-5 h-5 text-[#1f9d55] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">4. Pure Social Fun</h4>
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
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">1. Build Your Personalized Quiz</h4>
                  <p>
                    Choose 10, 15, or 20 questions true to yourself. Swap prompts from our 30+ question bank or write up to 3 custom questions!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <HelpCircle className="w-5 h-5 text-[#3b4cca] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">2. Instant Per-Question Feedback</h4>
                  <p>
                    Friends open your quiz link and answer one question at a time. Each selection reveals green (correct) or red (wrong) for 900ms before advancing!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Trophy className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">3. Live Leaderboard</h4>
                  <p>
                    Scores are ranked automatically. If a friend takes your quiz more than once, only their best score is kept!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <Sparkles className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">4. Asynchronous & Viral</h4>
                  <p>
                    No need to be online at the same time! Share to WhatsApp and challenge your friend circle anytime.
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
            className="w-full bg-[#0b2545] hover:bg-[#13315c] text-white font-bold py-3 rounded-full transition shadow-sm"
          >
            Got it, let's play!
          </button>
        </div>
      </div>
    </div>
  );
};

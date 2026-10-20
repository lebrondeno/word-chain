import React, { useState } from 'react';
import { X, BookOpen, Clock, Zap, Trophy, Vote, Sparkles } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'word_chain' | 'vote_reveal'>('word_chain');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">How to Play</h3>
              <p className="text-xs text-slate-400">Rules & Game Guides</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex px-6 pt-4 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('word_chain')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'word_chain'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <span>⛓️ Word Chain</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('vote_reveal')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'vote_reveal'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <span>🗳️ Would You Rather</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-300">
          {activeTab === 'word_chain' ? (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">1. Link the Last Letter</h4>
                  <p>
                    Each submitted word must start with the <strong className="text-amber-300">last letter</strong> of the previous word.
                    For example: Toky<u className="text-indigo-400 font-bold">o</u> ➔ <u className="text-indigo-400 font-bold">O</u>sl<u className="text-indigo-400 font-bold">o</u>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                <BookOpen className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">2. Match the Category & No Repeats</h4>
                  <p>
                    Words must exist in the curated category list (e.g. Cities, Animals, Countries, Food, Movies) and cannot be repeated within the same game!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                <Clock className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">3. 30-Second Turn Countdown</h4>
                  <p>
                    Players have <strong className="text-rose-300">30 seconds</strong> to submit a valid word on their turn. If the countdown expires before submitting, the player is eliminated.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                <Trophy className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">4. Last Player Standing Wins</h4>
                  <p>
                    Turns cycle through active players until the last standing champion is crowned!
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                <Vote className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">1. Secret Voting</h4>
                  <p>
                    Read the dilemma prompt and choose between <strong className="text-purple-300">Option A</strong> or <strong className="text-pink-300">Option B</strong>. Your choice stays secret until the voting phase ends.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">2. 20-Second Voting Window</h4>
                  <p>
                    Everyone has 20 seconds to cast their vote. Once all players submit (or timer expires), the results are instantly revealed.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                <Sparkles className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">3. The Big Reveal</h4>
                  <p>
                    See the percentage split and discover exactly which players picked Option A vs Option B!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/50">
                <Trophy className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-1">4. Pure Social Fun</h4>
                  <p>
                    No eliminations or losers — it's all about lively discussions, surprising reactions, and multiple rounds of fun.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl transition"
          >
            Got it, let's play!
          </button>
        </div>
      </div>
    </div>
  );
};

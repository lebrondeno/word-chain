import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { CATEGORIES, getFirstLetter, getLastLetter } from '../data';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  Crown,
  History,
  LogOut,
} from 'lucide-react';

export const FinishedView: React.FC = () => {
  const { session, localPlayer, winnerPlayer, resetGame, leaveGame } = useGame();
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    // Launch celebratory confetti bursts
    const end = Date.now() + 3 * 1000;
    const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b'];

    (function frame() {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }, []);

  if (!session) return null;

  const categoryInfo = CATEGORIES[session.category] || CATEGORIES['cities'];
  const usedWordsList = session.used_words || [];
  const isMeWinner = winnerPlayer?.id === localPlayer?.playerId;

  const handlePlayAgain = async () => {
    setResetting(true);
    await resetGame();
    setResetting(false);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-5 animate-fade-in">
      {/* 1. Victory Celebration Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Crown Icon */}
        <div className="relative inline-block mb-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-md shadow-amber-400/25 mx-auto">
            <Trophy className="w-10 h-10" />
          </div>
          <div className="absolute -top-2 -right-2 p-1.5 bg-yellow-400 rounded-full text-slate-950 shadow">
            <Crown className="w-4 h-4 fill-current" />
          </div>
        </div>

        <div className="text-xs uppercase tracking-widest font-bold text-amber-600 mb-1">
          {isMeWinner ? '🎉 Victory Is Yours!' : '🏆 Game Champion'}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">
          {winnerPlayer ? winnerPlayer.display_name : 'Winner!'}
        </h2>

        <p className="text-xs text-slate-600 max-w-xs mx-auto mb-5">
          {isMeWinner
            ? 'You outlasted all opponents and kept the word chain alive!'
            : `${winnerPlayer?.display_name || 'The champion'} held the chain to the very end.`}
        </p>

        {/* Game Highlights Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
              Words Linked
            </div>
            <div className="text-2xl font-black text-[#0b2545]">
              {usedWordsList.length}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
              Category
            </div>
            <div className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 mt-1">
              <span>{categoryInfo.icon}</span>
              <span className="truncate">{categoryInfo.name}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handlePlayAgain}
            disabled={resetting}
            className="w-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold py-3.5 rounded-full shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {resetting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Resetting to Lobby...
              </span>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Play Again (Keep Lobby)</span>
              </>
            )}
          </button>

          <button
            onClick={leaveGame}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-full text-xs font-semibold transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Game</span>
          </button>
        </div>
      </div>

      {/* 2. Full Word Chain Recap */}
      {usedWordsList.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#3b4cca]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Full Word Chain Recap
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
              {usedWordsList.length} words
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {usedWordsList.map((item, idx) => {
              const wordText = typeof item === 'string' ? item : item.display_word || item.word;
              const playerName = typeof item === 'string' ? null : item.player_name;
              const firstChar = getFirstLetter(wordText);
              const lastChar = getLastLetter(wordText);

              return (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400 w-4">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">
                      <span className="text-[#3b4cca] font-bold">{firstChar}</span>
                      <span>{wordText.slice(1, -1)}</span>
                      <span className="text-amber-600 font-bold underline">
                        {lastChar}
                      </span>
                    </span>
                  </div>

                  {playerName && (
                    <span className="text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                      {playerName}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

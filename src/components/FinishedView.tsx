import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { CATEGORIES, getFirstLetter, getLastLetter } from '../data';
import { HIGHER_LOWER_CATEGORIES } from '../data/prompts';
import confetti from 'canvas-confetti';
import {
  Trophy,
  RotateCcw,
  Crown,
  History,
  LogOut,
  CheckCircle2,
  XCircle,
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

  // word_chain is the only game type this screen was originally built for;
  // higher_lower also reaches status 'finished' the same way (elimination
  // down to one player), so its stats/recap need their own branch rather
  // than showing word-chain's used_words-based content for a game that
  // never touches that column
  const isHigherLower = session.game_type === 'higher_lower';
  const categoryInfo = isHigherLower
    ? HIGHER_LOWER_CATEGORIES[session.category] || HIGHER_LOWER_CATEGORIES['population']
    : CATEGORIES[session.category] || CATEGORIES['cities'];
  const usedWordsList = session.used_words || [];
  const guessHistory = session.game_config?.guess_history || [];
  const correctGuessCount = guessHistory.filter((g) => g.correct).length;
  const isMeWinner = winnerPlayer?.id === localPlayer?.playerId;

  const handlePlayAgain = async () => {
    setResetting(true);
    await resetGame();
    setResetting(false);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-5 animate-fade-in">
      {/* 1. Victory Celebration Card */}
      <div className="bg-gradient-to-b from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/40 rounded-3xl p-6 text-center shadow-2xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Crown Icon */}
        <div className="relative inline-block mb-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-300 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/30 mx-auto">
            <Trophy className="w-10 h-10" />
          </div>
          <div className="absolute -top-2 -right-2 p-1.5 bg-yellow-400 rounded-full text-slate-950 shadow">
            <Crown className="w-4 h-4 fill-current" />
          </div>
        </div>

        <div className="text-xs uppercase tracking-widest font-bold text-amber-400 mb-1">
          {isMeWinner ? '🎉 Victory Is Yours!' : '🏆 Game Champion'}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">
          {winnerPlayer ? winnerPlayer.display_name : 'Winner!'}
        </h2>

        <p className="text-xs text-slate-400 max-w-xs mx-auto mb-5">
          {isHigherLower
            ? isMeWinner
              ? 'You called every guess right and outlasted everyone else!'
              : `${winnerPlayer?.display_name || 'The champion'} never guessed wrong.`
            : isMeWinner
            ? 'You outlasted all opponents and kept the word chain alive!'
            : `${winnerPlayer?.display_name || 'The champion'} held the chain to the very end.`}
        </p>

        {/* Game Highlights Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
              {isHigherLower ? 'Correct Guesses' : 'Words Linked'}
            </div>
            <div className="text-xl font-black text-indigo-400">
              {isHigherLower ? correctGuessCount : usedWordsList.length}
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">
              Category
            </div>
            <div className="text-xs font-bold text-slate-200 flex items-center justify-center gap-1 mt-1">
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
            className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
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
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-xs font-medium transition flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Game</span>
          </button>
        </div>
      </div>

      {/* 2. Full Recap - word chain's word chain, or higher_lower's guess history */}
      {isHigherLower ? (
        guessHistory.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">
                  Full Guess History
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                {guessHistory.length} guesses
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {guessHistory.map((g, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-mono text-slate-500 w-4 shrink-0">
                      #{idx + 1}
                    </span>
                    {g.correct ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-200 truncate">
                      {g.player_name} guessed {g.guess.toUpperCase()}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 shrink-0">
                    {g.previous_value.toLocaleString()} → {g.new_value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        usedWordsList.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">
                  Full Word Chain Recap
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
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
                    className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500 w-4">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-slate-200">
                        <span className="text-indigo-400 font-bold">{firstChar}</span>
                        <span>{wordText.slice(1, -1)}</span>
                        <span className="text-amber-400 font-bold underline">
                          {lastChar}
                        </span>
                      </span>
                    </div>

                    {playerName && (
                      <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {playerName}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { CATEGORIES, getFirstLetter, getLastLetter } from '../data';
import { HIGHER_LOWER_CATEGORIES } from '../data/prompts';
import confetti from 'canvas-confetti';
import {
  RotateCcw,
  Crown,
  History,
  LogOut,
  CheckCircle2,
  XCircle,
  Scale,
  Share2,
  Sparkles,
} from 'lucide-react';
import { CountUp } from './CountUp';
import { shareOrDownloadScorecard } from '../lib/scorecardGenerator';
import { getAvatarForPlayer, extractPlayerAvatar } from '../lib/avatars';
import { AvatarMedallion } from './AvatarMedallion';
import { haptics } from '../lib/haptics';

export const FinishedView: React.FC = () => {
  const { session, localPlayer, winnerPlayer, resetGame, leaveGame } = useGame();
  const [resetting, setResetting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => {
    haptics.celebrate();
    // Launch celebratory confetti bursts
    const end = Date.now() + 3 * 1000;
    const colors = ['#3b4cca', '#1f9d55', '#f43f5e', '#f59e0b', '#8b5cf6'];

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

  const isHigherLower = session.game_type === 'higher_lower';
  const isTicTacToe = session.game_type === 'tic_tac_toe';
  const categoryInfo = isHigherLower
    ? HIGHER_LOWER_CATEGORIES[session.category] || HIGHER_LOWER_CATEGORIES['random_numbers']
    : CATEGORIES[session.category] || CATEGORIES['cities'];

  const usedWordsList = session.used_words || [];
  const guessHistory = session.game_config?.guess_history || [];
  const isMeWinner = winnerPlayer?.id === localPlayer?.playerId;

  // Tic-Tac-Toe specific properties
  const ticTacToeWinnerMark = session.game_config?.winner;
  const isTicTacToeDraw = isTicTacToe && ticTacToeWinnerMark === 'draw';
  const ticTacToeBoard = session.game_config?.board || Array(9).fill(null);
  const ticTacToeWinningLine: number[] = session.game_config?.winning_line || [];
  const ticTacToeMovesPlaced = ticTacToeBoard.filter((c) => c != null).length;

  const handlePlayAgain = async () => {
    setResetting(true);
    await resetGame();
    setResetting(false);
  };

  const handleShareBragCard = async () => {
    haptics.tap();
    setIsSharing(true);
    setShareFeedback(null);

    const title = isTicTacToe ? 'Tic-Tac-Toe' : isHigherLower ? 'Higher or Lower' : 'Word Chain';
    const rawWinner = winnerPlayer?.display_name || (isTicTacToe ? `Player ${ticTacToeWinnerMark}` : 'Champion');
    const { cleanName, avatar } = extractPlayerAvatar(rawWinner);
    const scoreVal = isTicTacToe
      ? `${ticTacToeMovesPlaced} moves`
      : isHigherLower
      ? `${guessHistory.length} guesses`
      : `${usedWordsList.length} words`;

    const res = await shareOrDownloadScorecard({
      gameTitle: title,
      playerName: cleanName,
      avatarEmoji: avatar.emoji,
      scoreText: isTicTacToeDraw ? '🤝 Stalemate' : '🏆 1st Place',
      subtitle: `${scoreVal} • Room ${session.room_code}`,
      roomCode: session.room_code,
    });

    setIsSharing(false);
    if (res.method === 'share') {
      setShareFeedback('Scorecard shared successfully!');
    } else if (res.method === 'download') {
      setShareFeedback('Scorecard saved to downloads & link copied!');
    } else {
      setShareFeedback('Share link copied to clipboard!');
    }
    setTimeout(() => setShareFeedback(null), 3000);
  };

  const winnerAvatar = getAvatarForPlayer(winnerPlayer?.display_name || 'Champion');

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 space-y-5 animate-fade-in text-slate-800">
      {/* 1. Victory Celebration Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
        {/* Subtle accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />

        {/* Winner Avatar Medallion with Crown */}
        <div className="relative inline-block mb-3">
          <AvatarMedallion avatar={winnerAvatar} size="xl" showGlow />
          {!isTicTacToeDraw && (
            <div className="absolute -top-1 -right-1 p-1 bg-amber-400 rounded-full text-slate-950 shadow-md ring-2 ring-white">
              <Crown className="w-4 h-4 fill-current" />
            </div>
          )}
        </div>

        <div className="text-xs uppercase tracking-widest font-bold text-amber-600 mb-1">
          {isTicTacToeDraw ? '🤝 Stalemate!' : isMeWinner ? '🎉 Victory Is Yours!' : '🏆 Game Champion'}
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-[#0b2545] mb-1 font-heading">
          {isTicTacToeDraw
            ? "It's a Draw!"
            : winnerPlayer
            ? extractPlayerAvatar(winnerPlayer.display_name).cleanName
            : isTicTacToe
            ? `Player ${ticTacToeWinnerMark} Won!`
            : 'Winner!'}
        </h2>

        <p className="text-xs text-slate-600 max-w-xs mx-auto mb-5 leading-relaxed">
          {isTicTacToeDraw
            ? 'Neither side gave an inch — perfectly matched tactical minds!'
            : isTicTacToe
            ? isMeWinner
              ? 'You aligned 3 marks on the grid and claimed the board!'
              : `${winnerPlayer?.display_name || `Player ${ticTacToeWinnerMark}`} struck 3 in a row for the win!`
            : isHigherLower
            ? isMeWinner
              ? 'You read the numbers like a pro and outlasted the table!'
              : `${winnerPlayer?.display_name || 'The champion'} made the right calls and survived!`
            : isMeWinner
            ? 'You outlasted all opponents and kept the word chain alive!'
            : `${winnerPlayer?.display_name || 'The champion'} held the chain to the very end.`}
        </p>

        {/* Game Highlights Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-6">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
              {isTicTacToe ? 'Marks Placed' : isHigherLower ? 'Guesses Made' : 'Words Linked'}
            </div>
            <div className="text-2xl font-black text-[#0b2545] font-heading">
              <CountUp
                end={isTicTacToe ? ticTacToeMovesPlaced : isHigherLower ? guessHistory.length : usedWordsList.length}
                duration={700}
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
              Category / Mode
            </div>
            <div className="text-sm font-bold text-[#0b2545] flex items-center justify-center gap-1.5 mt-1">
              <span>{isTicTacToe ? '⭕ Classic' : categoryInfo.name}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* Share Brag Card Button */}
          <button
            type="button"
            onClick={handleShareBragCard}
            disabled={isSharing}
            className="w-full py-3.5 px-4 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isSharing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Share2 className="w-4 h-4 text-cyan-200" />
                <span>📸 Share Brag Card</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </>
            )}
          </button>

          {shareFeedback && (
            <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-2 px-3 animate-fade-in">
              {shareFeedback}
            </div>
          )}

          {localPlayer?.isHost && (
            <button
              onClick={handlePlayAgain}
              disabled={resetting}
              className="w-full bg-[#1f9d55] hover:bg-[#178044] text-white font-bold py-3.5 rounded-full shadow-sm transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-xs sm:text-sm"
            >
              {resetting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Play Again (Same Room)</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={leaveGame}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>Return to Home Hub</span>
          </button>
        </div>
      </div>

      {/* 2. Tic Tac Toe Board Recap */}
      {isTicTacToe && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-center">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
            Final Board
          </h3>
          <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto">
            {ticTacToeBoard.map((cell, idx) => {
              const isWinCell = ticTacToeWinningLine.includes(idx);
              return (
                <div
                  key={idx}
                  className={`aspect-square rounded-xl border flex items-center justify-center font-black text-lg ${
                    isWinCell
                      ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-xs ring-2 ring-amber-300'
                      : cell != null
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {cell === 'X' ? (
                    <span className="text-[#3b4cca]">X</span>
                  ) : cell === 'O' ? (
                    <span className="text-[#f43f5e]">O</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Higher or Lower Recap */}
      {isHigherLower && guessHistory.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#3b4cca]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                Guess History
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-bold">
              {guessHistory.length} Guesses
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {guessHistory.map((g, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-slate-400 w-4 shrink-0">
                    #{idx + 1}
                  </span>
                  {g.outcome === 'correct' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1f9d55] shrink-0" />
                  ) : g.outcome === 'incorrect' ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  ) : (
                    <Scale className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="font-bold text-[#0b2545] break-words">
                    {g.player_name} guessed {g.guess.toUpperCase()}
                  </span>
                </div>

                <span className="text-[11px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0 font-mono">
                  {g.previous_value.toLocaleString()} → {g.new_value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Word Chain Recap */}
      {!isHigherLower && !isTicTacToe && usedWordsList.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#3b4cca]" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                Full Word Chain Recap
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-bold">
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
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs"
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

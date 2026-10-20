import React from 'react';
import type { UsedWordItem } from '../types/game';
import { History, User } from 'lucide-react';
import { getLastLetter, getFirstLetter } from '../data';

interface WordHistoryDrawerProps {
  usedWords: (string | UsedWordItem)[];
  category: string;
}

export const WordHistoryDrawer: React.FC<WordHistoryDrawerProps> = ({ usedWords }) => {
  if (usedWords.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center text-xs text-slate-500 shadow-sm">
        No words played yet. The chain begins with the first turn!
      </div>
    );
  }

  // Reverse so newest words are on top for easy scrolling
  const reversedList = [...usedWords].reverse();

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#3b4cca]" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
            Word Chain ({usedWords.length})
          </h4>
        </div>
        <span className="text-[10px] text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full font-semibold">
          Latest on top
        </span>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {reversedList.map((item, idx) => {
          const originalIndex = usedWords.length - 1 - idx;
          const wordText = typeof item === 'string' ? item : item.display_word || item.word;
          const playerName = typeof item === 'string' ? null : item.player_name;
          const firstChar = getFirstLetter(wordText);
          const lastChar = getLastLetter(wordText);

          return (
            <div
              key={idx}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <span className="text-[10px] font-mono text-slate-400 w-4 shrink-0 text-right">
                  #{originalIndex + 1}
                </span>

                <div className="font-semibold text-slate-800 truncate">
                  <span className="text-[#3b4cca] font-bold">{firstChar}</span>
                  <span>{wordText.slice(1, -1)}</span>
                  <span className="text-amber-600 font-bold underline decoration-amber-500/50">
                    {lastChar}
                  </span>
                </div>
              </div>

              {playerName && (
                <div className="flex items-center gap-1 text-[11px] text-slate-600 shrink-0 bg-white px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="max-w-[80px] truncate">{playerName}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

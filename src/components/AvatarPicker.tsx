import React, { useState } from 'react';
import { AVATAR_LIST, type AvatarMedallionData } from '../lib/avatars';
import { AvatarMedallion } from './AvatarMedallion';
import { haptics } from '../lib/haptics';
import { X, Check } from 'lucide-react';

interface AvatarPickerProps {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
  compact?: boolean;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  selectedEmoji,
  onSelect,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const currentAvatar: AvatarMedallionData =
    AVATAR_LIST.find((a) => a.emoji === selectedEmoji) || AVATAR_LIST[0];

  const handlePick = (emoji: string) => {
    haptics.tap();
    onSelect(emoji);
    if (compact) setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => {
            haptics.tap();
            setIsOpen((prev) => !prev);
          }}
          className="group flex items-center gap-2 p-1.5 rounded-2xl bg-white/70 hover:bg-white border border-slate-200 shadow-sm transition active:scale-95"
          title="Change player avatar"
        >
          <AvatarMedallion avatar={currentAvatar} size="md" showGlow />
          <span className="text-xs font-bold text-slate-700 pr-1 group-hover:text-[#3b4cca] transition">
            Change
          </span>
        </button>

        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-sm glass-card bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👑</span>
                  <h3 className="font-heading font-black text-slate-900 text-sm">
                    Choose Your Avatar
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 py-4">
                {AVATAR_LIST.map((av) => {
                  const isSelected = av.emoji === selectedEmoji;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => handlePick(av.emoji)}
                      className={`relative flex flex-col items-center justify-center p-2 rounded-2xl border transition ${
                        isSelected
                          ? 'border-[#3b4cca] bg-blue-50/80 shadow-md ring-2 ring-[#3b4cca]/20'
                          : 'border-slate-200/80 hover:border-slate-300 bg-white/50 hover:bg-white'
                      }`}
                    >
                      <AvatarMedallion avatar={av} size="md" showGlow={isSelected} />
                      <span className="text-[10px] font-bold text-slate-600 mt-1 truncate max-w-full">
                        {av.label}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-[#3b4cca] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-2.5 rounded-full bg-[#0b2545] hover:bg-[#13315c] text-white font-bold text-xs transition"
                >
                  Confirm Avatar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Inline grid layout
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <span>Avatar Medallion</span>
        </label>
        <span className="text-[11px] text-slate-500 font-medium">
          {currentAvatar.label}
        </span>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 p-2 bg-white/60 rounded-2xl border border-slate-200/80 backdrop-blur-sm">
        {AVATAR_LIST.map((av) => {
          const isSelected = av.emoji === selectedEmoji;
          return (
            <button
              key={av.id}
              type="button"
              onClick={() => handlePick(av.emoji)}
              className={`p-1.5 rounded-xl border flex items-center justify-center transition ${
                isSelected
                  ? 'border-[#3b4cca] bg-blue-50 scale-105 shadow-sm ring-2 ring-[#3b4cca]/30'
                  : 'border-transparent hover:border-slate-200 hover:bg-white/80'
              }`}
              title={av.label}
            >
              <AvatarMedallion avatar={av} size="sm" showGlow={isSelected} />
            </button>
          );
        })}
      </div>
    </div>
  );
};

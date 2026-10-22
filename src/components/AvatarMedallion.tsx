import React from 'react';
import type { AvatarMedallionData } from '../lib/avatars';

interface AvatarMedallionProps {
  avatar: AvatarMedallionData;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showGlow?: boolean;
}

const SIZE_MAP = {
  xs: {
    outer: 'w-6 h-6',
    text: 'text-xs',
    border: 'p-[1.5px]',
  },
  sm: {
    outer: 'w-8 h-8',
    text: 'text-sm',
    border: 'p-[2px]',
  },
  md: {
    outer: 'w-10 h-10',
    text: 'text-base',
    border: 'p-[2px]',
  },
  lg: {
    outer: 'w-12 h-12',
    text: 'text-xl',
    border: 'p-[2.5px]',
  },
  xl: {
    outer: 'w-16 h-16',
    text: 'text-3xl',
    border: 'p-[3px]',
  },
};

export const AvatarMedallion: React.FC<AvatarMedallionProps> = ({
  avatar,
  size = 'md',
  className = '',
  showGlow = false,
}) => {
  const cfg = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      title={avatar.label}
    >
      {showGlow && (
        <div
          className="absolute inset-0 rounded-full blur-md opacity-60 pointer-events-none"
          style={{ backgroundColor: avatar.hex }}
        />
      )}
      <div
        className={`${cfg.outer} ${cfg.border} rounded-full bg-gradient-to-tr ${avatar.ringGradient} shadow-sm flex items-center justify-center relative z-10 transition-transform active:scale-95`}
      >
        <div className="w-full h-full rounded-full bg-[#0b2545]/90 border border-white/20 flex items-center justify-center shadow-inner overflow-hidden backdrop-blur-sm">
          <span className={`${cfg.text} select-none leading-none`} role="img" aria-label={avatar.label}>
            {avatar.emoji}
          </span>
        </div>
      </div>
    </div>
  );
};

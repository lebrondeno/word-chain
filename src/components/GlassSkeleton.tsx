import React from 'react';

interface GlassSkeletonProps {
  className?: string;
  lines?: number;
  variant?: 'card' | 'row' | 'avatar' | 'text';
}

export const GlassSkeleton: React.FC<GlassSkeletonProps> = ({
  className = '',
  lines = 1,
  variant = 'row',
}) => {
  if (variant === 'avatar') {
    return (
      <div
        className={`w-10 h-10 rounded-full bg-white/30 border border-white/40 animate-pulse relative overflow-hidden ${className}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`glass-card rounded-3xl p-5 border border-white/40 shadow-sm relative overflow-hidden space-y-3 ${className}`}
      >
        <div className="w-1/3 h-5 rounded-xl bg-white/40 animate-pulse" />
        <div className="w-full h-12 rounded-2xl bg-white/30 animate-pulse" />
        <div className="w-2/3 h-4 rounded-lg bg-white/25 animate-pulse" />
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className={`space-y-2.5 w-full ${className}`}>
        {Array.from({ length: lines }).map((_, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white/40 border border-white/50 backdrop-blur-md relative overflow-hidden animate-pulse"
          >
            <div className="w-9 h-9 rounded-full bg-white/50 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="w-2/5 h-3.5 rounded bg-white/60" />
              <div className="w-1/4 h-2.5 rounded bg-white/40" />
            </div>
            <div className="w-12 h-6 rounded-full bg-white/50" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className="h-4 rounded-lg bg-white/40 border border-white/30 animate-pulse"
          style={{ width: idx === lines - 1 && lines > 1 ? '70%' : '100%' }}
        />
      ))}
    </div>
  );
};

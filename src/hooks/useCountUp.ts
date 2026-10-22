import { useState, useEffect } from 'react';
import { easeOutCubic } from '../lib/animation';

export const useCountUp = (target: number, duration: number = 700): number => {
  const [count, setCount] = useState<number>(() => {
    if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
      return target;
    }
    return 0;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
      return;
    }

    if (target <= 0) {
      setCount(0);
      return;
    }

    let startTimestamp: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const currentVal = Math.round(easeOutCubic(progress) * target);
      setCount(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [target, duration]);

  return count;
};

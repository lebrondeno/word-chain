import React from 'react';
import { useCountUp } from '../hooks/useCountUp';

interface CountUpProps {
  end: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

export const CountUp: React.FC<CountUpProps> = ({
  end,
  duration = 700,
  className = '',
  suffix = '',
  prefix = '',
}) => {
  const value = useCountUp(end, duration);

  return (
    <span className={className}>
      {prefix}
      {value}
      {suffix}
    </span>
  );
};

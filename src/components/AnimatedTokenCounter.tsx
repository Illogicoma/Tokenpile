import React, { useState, useEffect, useRef } from 'react';
import { soundEffects } from '../services/soundEffects';

export interface AnimatedTokenCounterProps {
  value: number;
  isWin?: boolean;
  formatCompact?: boolean;
  className?: string;
  onShineComplete?: () => void;
  onLerpStateChange?: (isLerping: boolean, hasShine: boolean) => void;
}

export const formatCompactTokens = (val: number): string => {
  if (val >= 1_000_000) {
    const m = (val / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${m}M`;
  }
  if (val >= 10_000) {
    const k = (val / 1_000).toFixed(0);
    return `${k}k`;
  }
  if (val >= 1_000) {
    const k = (val / 1_000).toFixed(1).replace(/\.0$/, '');
    return `${k}k`;
  }
  return val.toLocaleString();
};

export const AnimatedTokenCounter: React.FC<AnimatedTokenCounterProps> = ({
  value,
  isWin = false,
  formatCompact = false,
  className = '',
  onShineComplete,
  onLerpStateChange,
}) => {
  const [displayedValue, setDisplayedValue] = useState<number>(value);
  const [isLerping, setIsLerping] = useState<boolean>(false);
  const [hasShine, setHasShine] = useState<boolean>(false);

  const prevValueRef = useRef<number>(value);
  const animFrameRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(0);

  useEffect(() => {
    onLerpStateChange?.(isLerping, hasShine);
  }, [isLerping, hasShine, onLerpStateChange]);

  useEffect(() => {
    const startVal = prevValueRef.current;
    const targetVal = value;

    // If value didn't change, sync and exit
    if (startVal === targetVal) {
      setDisplayedValue(targetVal);
      return;
    }

    // Only lerp up if value increased (e.g. from win payout or points added)
    if (targetVal > startVal && (isWin || targetVal - startVal >= 50)) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      setIsLerping(true);
      setHasShine(false);

      const startTime = performance.now();
      const diff = targetVal - startVal;
      // Duration scales slightly with payout size: 1000ms up to 1600ms
      const duration = Math.min(1600, Math.max(1000, 1000 + Math.log10(diff + 1) * 120));

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const rawProgress = Math.min(1, elapsed / duration);
        // easeOutCubic: fast initial count, soft anticipation landing
        const ease = 1 - Math.pow(1 - rawProgress, 3);
        const current = Math.round(startVal + diff * ease);

        setDisplayedValue(current);

        // Procedural audio tally ticks every ~85ms
        if (now - lastTickTimeRef.current >= 85 && rawProgress < 0.95) {
          lastTickTimeRef.current = now;
          soundEffects.playTallyTick();
        }

        if (rawProgress < 1) {
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          // Animation finished: trigger dopamine shine flash and audio chime!
          setDisplayedValue(targetVal);
          setIsLerping(false);
          setHasShine(true);
          soundEffects.playShineSound();

          prevValueRef.current = targetVal;
          animFrameRef.current = null;

          setTimeout(() => {
            setHasShine(false);
            onShineComplete?.();
          }, 850);
        }
      };

      animFrameRef.current = requestAnimationFrame(tick);

      return () => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      };
    } else {
      // Immediate update for deductions (placing bets) or negative adjustments
      setDisplayedValue(targetVal);
      prevValueRef.current = targetVal;
      setIsLerping(false);
      setHasShine(false);
    }
  }, [value, isWin, onShineComplete]);

  const formatted = formatCompact
    ? formatCompactTokens(displayedValue)
    : displayedValue.toLocaleString();

  return (
    <span
      className={`animated-token-val ${isLerping ? 'capsule-is-lerping' : ''} ${hasShine ? 'capsule-just-shined' : ''} ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
    >
      <span>{formatted}</span>
      {hasShine && <span className="lerp-shine-star">✨</span>}
    </span>
  );
};

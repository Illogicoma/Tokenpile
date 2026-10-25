import { useEffect, useRef, useState, useCallback } from 'react';

export interface UseAutoScrollOptions {
  speed?: number; // Cruising speed in pixels per 60fps frame (default ~0.35)
  direction?: 'horizontal' | 'vertical';
  pauseOnHover?: boolean;
  enabled?: boolean;
  edgePauseMs?: number; // Dwell time at ends in milliseconds (default ~1300ms)
  easeDistance?: number; // Distance in pixels over which ease in/out occurs (default ~75px)
}

export function useAutoScroll<T extends HTMLElement = HTMLDivElement>({
  speed = 0.35,
  direction = 'horizontal',
  pauseOnHover = true,
  enabled = false,
  edgePauseMs = 1300,
  easeDistance = 75,
}: UseAutoScrollOptions) {
  const containerRef = useRef<T | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isForwardRef = useRef(true);
  const isUserInteractingRef = useRef(false);
  const userInteractionTimeoutRef = useRef<number | null>(null);
  const posRef = useRef<number>(0);
  const edgePauseUntilRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const resetUserInteractionDelay = useCallback(() => {
    isUserInteractingRef.current = true;
    if (userInteractionTimeoutRef.current !== null) {
      window.clearTimeout(userInteractionTimeoutRef.current);
    }
    userInteractionTimeoutRef.current = window.setTimeout(() => {
      isUserInteractingRef.current = false;
      lastTimeRef.current = performance.now();
    }, 1500);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    let animId: number;
    let resumeTimeout: number;

    // Initialize subpixel position to current element scroll offset
    posRef.current = direction === 'horizontal' ? el.scrollLeft : el.scrollTop;
    lastTimeRef.current = performance.now();

    const onMouseEnter = () => {
      if (pauseOnHover) setIsHovered(true);
    };

    const onMouseLeave = () => {
      if (pauseOnHover) {
        resumeTimeout = window.setTimeout(() => {
          lastTimeRef.current = performance.now();
          setIsHovered(false);
        }, 500);
      }
    };

    const syncPosFromEl = () => {
      if (el) {
        posRef.current = direction === 'horizontal' ? el.scrollLeft : el.scrollTop;
      }
    };

    const onWheel = () => {
      syncPosFromEl();
      resetUserInteractionDelay();
    };

    const onTouchStart = () => {
      syncPosFromEl();
      resetUserInteractionDelay();
    };

    const onScroll = () => {
      if (isUserInteractingRef.current) {
        syncPosFromEl();
      }
    };

    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('scroll', onScroll, { passive: true });

    const step = (timestamp: number) => {
      if (!isHovered && !isUserInteractingRef.current && el) {
        const dt = lastTimeRef.current ? Math.min(64, timestamp - lastTimeRef.current) : 16.667;
        lastTimeRef.current = timestamp;
        const dtRatio = dt / 16.667;

        const maxScroll = direction === 'horizontal'
          ? el.scrollWidth - el.clientWidth
          : el.scrollHeight - el.clientHeight;

        if (maxScroll > 2) {
          const now = performance.now();

          // If in dwell pause at start or end, wait until pause finishes
          if (now < edgePauseUntilRef.current) {
            animId = requestAnimationFrame(step);
            return;
          }

          let currentPos = posRef.current;

          // Keep in bounds if container size changed
          if (currentPos > maxScroll) currentPos = maxScroll;
          if (currentPos < 0) currentPos = 0;

          // Compute ease in / out multiplier based on distance to nearest edge
          const easeZone = Math.min(easeDistance, Math.max(16, maxScroll * 0.35));
          const distFromStart = Math.max(0, currentPos);
          const distFromEnd = Math.max(0, maxScroll - currentPos);
          const distToNearestEdge = Math.min(distFromStart, distFromEnd);

          const easeRatio = Math.max(0, Math.min(1, distToNearestEdge / easeZone));
          // Cosine smooth curve (0 at boundary -> 1 at cruise distance)
          const easeFactor = (1 - Math.cos(Math.PI * easeRatio)) / 2;
          const minFactor = 0.2; // Smooth minimal creep near turnaround
          const effectiveSpeed = speed * (minFactor + (1 - minFactor) * easeFactor) * dtRatio;

          if (isForwardRef.current) {
            currentPos += effectiveSpeed;
            if (currentPos >= maxScroll) {
              currentPos = maxScroll;
              isForwardRef.current = false;
              edgePauseUntilRef.current = now + edgePauseMs;
            }
          } else {
            currentPos -= effectiveSpeed;
            if (currentPos <= 0) {
              currentPos = 0;
              isForwardRef.current = true;
              edgePauseUntilRef.current = now + edgePauseMs;
            }
          }

          posRef.current = currentPos;
          if (direction === 'horizontal') {
            el.scrollLeft = currentPos;
          } else {
            el.scrollTop = currentPos;
          }
        }
      } else {
        lastTimeRef.current = timestamp;
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
      window.clearTimeout(resumeTimeout);
      if (userInteractionTimeoutRef.current !== null) {
        window.clearTimeout(userInteractionTimeoutRef.current);
      }
      el.removeEventListener('mouseenter', onMouseEnter);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('scroll', onScroll);
    };
  }, [enabled, isHovered, speed, direction, pauseOnHover, edgePauseMs, easeDistance, resetUserInteractionDelay]);

  return { containerRef, isHovered };
}

import React, { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number | undefined | null;
  formatter?: (val: number) => string;
  duration?: number;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  formatter = (v) => Math.round(v).toLocaleString("id-ID"),
  duration = 550,
  className,
}) => {
  const target = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const [displayValue, setDisplayValue] = useState<number>(target);
  const previousRef = useRef<number>(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || duration <= 0) {
      previousRef.current = target;
      setDisplayValue(target);
      return;
    }

    const startValue = previousRef.current;
    if (startValue === target) return;

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (target - startValue) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        previousRef.current = target;
        setDisplayValue(target);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      previousRef.current = target;
    };
  }, [target, duration]);

  return <span className={`tabular-nums ${className || ""}`}>{formatter(displayValue)}</span>;
};

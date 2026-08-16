import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring } from "motion/react";
import usePrefersReducedMotion from "../../hooks/usePrefersReducedMotion";
import { cn } from "../../lib/utils";

function formatNumber(value, decimalPlaces) {
  return Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(Number(value));
}

export default function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  ...props
}) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const motionValue = useMotionValue(direction === "down" ? value : startValue);
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  useEffect(() => {
    if (reduced) return undefined;
    let timer = null;
    if (isInView) {
      timer = setTimeout(() => {
        motionValue.set(direction === "down" ? startValue : value);
      }, delay * 1000);
    }
    return () => {
      if (timer !== null) clearTimeout(timer);
    };
  }, [motionValue, isInView, delay, value, direction, startValue, reduced]);

  useEffect(() => {
    if (reduced) return undefined;
    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = formatNumber(latest.toFixed(decimalPlaces), decimalPlaces);
      }
    });
  }, [springValue, decimalPlaces, reduced]);

  const initial = reduced
    ? formatNumber(value, decimalPlaces)
    : formatNumber(direction === "down" ? value : startValue, decimalPlaces);

  return (
    <span ref={ref} className={cn("number-ticker", className)} {...props}>
      {initial}
    </span>
  );
}

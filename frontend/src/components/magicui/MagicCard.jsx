import { useCallback, useEffect, useRef } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useTheme } from "../../context/ThemeContext";
import usePrefersReducedMotion from "../../hooks/usePrefersReducedMotion";
import { cn } from "../../lib/utils";

export default function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = "rgba(108, 75, 244, 0.18)",
  gradientOpacity = 0.8,
  gradientFrom = "#8B7CF6",
  gradientTo = "#4F46E5",
  mode = "gradient",
  glowFrom = "#8B7CF6",
  glowTo = "#4F46E5",
  glowAngle = 90,
  glowSize = 420,
  glowBlur = 60,
  glowOpacity = 0.9,
}) {
  const { theme } = useTheme();
  const reduced = usePrefersReducedMotion();
  const isDarkTheme = theme === "dark";

  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);
  const orbX = useSpring(mouseX, { stiffness: 250, damping: 30, mass: 0.6 });
  const orbY = useSpring(mouseY, { stiffness: 250, damping: 30, mass: 0.6 });
  const orbVisible = useSpring(0, { stiffness: 300, damping: 35 });

  const modeRef = useRef(mode);
  const glowOpacityRef = useRef(glowOpacity);
  const gradientSizeRef = useRef(gradientSize);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    glowOpacityRef.current = glowOpacity;
  }, [glowOpacity]);

  useEffect(() => {
    gradientSizeRef.current = gradientSize;
  }, [gradientSize]);

  const reset = useCallback(
    (reason = "leave") => {
      if (modeRef.current === "orb") {
        orbVisible.set(reason === "enter" ? glowOpacityRef.current : 0);
        return;
      }
      const off = -gradientSizeRef.current;
      mouseX.set(off);
      mouseY.set(off);
    },
    [mouseX, mouseY, orbVisible]
  );

  const handlePointerMove = useCallback(
    (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      mouseX.set(event.clientX - rect.left);
      mouseY.set(event.clientY - rect.top);
    },
    [mouseX, mouseY]
  );

  useEffect(() => {
    reset("init");
  }, [reset]);

  useEffect(() => {
    if (reduced) return undefined;
    const handleGlobalPointerOut = (event) => {
      if (!event.relatedTarget) reset("global");
    };
    const handleBlur = () => reset("global");
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") reset("global");
    };

    window.addEventListener("pointerout", handleGlobalPointerOut);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pointerout", handleGlobalPointerOut);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [reset, reduced]);

  const gradientBorder = useMotionTemplate`
    linear-gradient(var(--background) 0 0) padding-box,
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientFrom}, ${gradientTo}, var(--border) 100%) border-box
  `;

  const spotlight = useMotionTemplate`
    radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px,
      ${gradientColor}, transparent 100%)
  `;

  return (
    <motion.div
      className={cn(
        "magic-card",
        reduced ? "magic-card-reduced" : "",
        className
      )}
      onPointerMove={reduced ? undefined : handlePointerMove}
      onPointerLeave={() => reset("leave")}
      onPointerEnter={() => reset("enter")}
      style={{
        background: gradientBorder,
        "--mc-gradient-opacity": gradientOpacity,
      }}
    >
      <div className="magic-card-surface" aria-hidden="true" />

      {mode === "gradient" && (
        <motion.div
          aria-hidden="true"
          className="magic-card-spotlight"
          style={{ background: spotlight }}
        />
      )}

      {mode === "orb" && (
        <motion.div
          aria-hidden="true"
          className="magic-card-orb"
          style={{
            width: glowSize,
            height: glowSize,
            x: orbX,
            y: orbY,
            translateX: "-50%",
            translateY: "-50%",
            borderRadius: 9999,
            filter: `blur(${glowBlur}px)`,
            opacity: orbVisible,
            background: `linear-gradient(${glowAngle}deg, ${glowFrom}, ${glowTo})`,
            mixBlendMode: isDarkTheme ? "screen" : "multiply",
          }}
        />
      )}

      <div className="magic-card-content">{children}</div>
    </motion.div>
  );
}

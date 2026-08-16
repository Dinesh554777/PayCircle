import { useRef } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import usePrefersReducedMotion from "../../hooks/usePrefersReducedMotion";

export default function BlurFade({
  children,
  className,
  variant,
  duration = 0.4,
  delay = 0,
  offset = 6,
  direction = "down",
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
  ...props
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
  const isInView = !inView || inViewResult;

  const isHorizontal = direction === "left" || direction === "right";
  const axis = isHorizontal ? "x" : "y";
  const hiddenOffset =
    direction === "right" || direction === "down" ? -offset : offset;

  const combinedVariants =
    variant ??
    ({
      hidden: {
        [axis]: hiddenOffset,
        opacity: 0,
        filter: `blur(${blur})`,
      },
      visible: {
        [axis]: 0,
        opacity: 1,
        filter: "blur(0px)",
      },
    });

  if (reduced) {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        exit="hidden"
        variants={combinedVariants}
        transition={{
          delay: 0.04 + delay,
          duration,
          ease: "easeOut",
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

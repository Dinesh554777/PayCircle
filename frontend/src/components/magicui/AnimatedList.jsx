import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import usePrefersReducedMotion from "../../hooks/usePrefersReducedMotion";
import { cn } from "../../lib/utils";

function AnimatedListItem({ children }) {
  const animations = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 350, damping: 40 },
  };

  return (
    <motion.div {...animations} layout className="animated-list-item">
      {children}
    </motion.div>
  );
}

const AnimatedList = React.memo(function AnimatedList({
  children,
  className,
  delay = 1000,
  ...props
}) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const childrenArray = useMemo(() => React.Children.toArray(children), [children]);

  useEffect(() => {
    if (reduced) return undefined;
    let timeout = null;
    if (index < childrenArray.length - 1) {
      timeout = setTimeout(() => {
        setIndex((prevIndex) => (prevIndex + 1) % childrenArray.length);
      }, delay);
    }
    return () => {
      if (timeout !== null) clearTimeout(timeout);
    };
  }, [index, delay, childrenArray.length, reduced]);

  const itemsToShow = useMemo(() => {
    if (reduced) return childrenArray;
    return childrenArray.slice(0, index + 1).reverse();
  }, [index, childrenArray, reduced]);

  return (
    <div className={cn("animated-list", className)} {...props}>
      <AnimatePresence>
        {itemsToShow.map((item) => (
          <AnimatedListItem key={item.key}>{item}</AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
});

AnimatedList.displayName = "AnimatedList";

export default AnimatedList;

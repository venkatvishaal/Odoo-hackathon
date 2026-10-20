import React, { useMemo } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

// Pointer-tracked 3D tilt. Off for touch devices and reduced motion.
export default function Tilt({ max = 6, className = '', children }) {
  const reduceMotion = useReducedMotion();
  const canHover = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches, []);
  const rx = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });

  if (reduceMotion || !canHover) return <div className={className}>{children}</div>;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 2 * max);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 2 * max);
  };
  const reset = () => { rx.set(0); ry.set(0); };

  return (
    <motion.div
      className={className}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1100, willChange: 'transform' }}
    >
      {children}
    </motion.div>
  );
}

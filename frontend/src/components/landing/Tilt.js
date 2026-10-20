import React, { useMemo } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';

// Pointer-tracked 3D tilt that also feeds --mx/--my to `.spotlight` children. Off for touch and reduced motion.
export default function Tilt({ max = 6, className = '', children }) {
  const reduceMotion = useReducedMotion();
  const canHover = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches, []);
  const rx = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });

  if (reduceMotion || !canHover) return <div className={className}>{children}</div>;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    e.currentTarget.style.setProperty('--mx', `${px}px`);
    e.currentTarget.style.setProperty('--my', `${py}px`);
    ry.set((px / r.width - 0.5) * 2 * max);
    rx.set(-(py / r.height - 0.5) * 2 * max);
  };
  const reset = (e) => {
    e.currentTarget.style.removeProperty('--mx');
    e.currentTarget.style.removeProperty('--my');
    rx.set(0);
    ry.set(0);
  };

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

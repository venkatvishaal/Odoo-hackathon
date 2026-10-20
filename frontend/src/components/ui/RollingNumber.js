// Ported from Cult UI "rolling-number" (cult-ui.com/r/rolling-number.json); adds reduced-motion handling.
import React, { useEffect } from 'react';
import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react';

export function RollingNumber({
  value,
  mass = 0.8,
  stiffness = 75,
  damping = 15,
  precision = 0,
  format = (num) => num.toLocaleString('en-IN'),
}) {
  const reduceMotion = useReducedMotion();
  const spring = useSpring(value, { mass, stiffness, damping });
  const display = useTransform(spring, (current) => format(parseFloat(current.toFixed(precision))));

  useEffect(() => {
    if (reduceMotion) spring.jump(value);
    else spring.set(value);
  }, [spring, value, reduceMotion]);

  return <motion.span>{display}</motion.span>;
}

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

// Fade-and-rise once when scrolled into view; `delay` staggers siblings.
export default function Reveal({ as = 'div', delay = 0, className = '', children, ...rest }) {
  const reduceMotion = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.8, 0.2, 1] }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

// CSS cuboid: a zero-size preserve-3d anchor with six faces centred on it. y is up.
export function Cuboid({ w, h, d, face, style, className = '', children, ...motionProps }) {
  const faces = [
    ['front', w, h, `translateZ(${d / 2}px)`],
    ['back', w, h, `rotateY(180deg) translateZ(${d / 2}px)`],
    ['right', d, h, `rotateY(90deg) translateZ(${w / 2}px)`],
    ['left', d, h, `rotateY(-90deg) translateZ(${w / 2}px)`],
    ['top', w, d, `rotateX(90deg) translateZ(${h / 2}px)`],
    ['bottom', w, d, `rotateX(-90deg) translateZ(${h / 2}px)`],
  ];
  return (
    <motion.div className={`absolute left-1/2 top-1/2 ${className}`} style={{ transformStyle: 'preserve-3d', ...style }} {...motionProps}>
      {faces.map(([name, fw, fh, transform]) => (
        <div
          key={name}
          className={`absolute ${face(name)}`}
          style={{ width: fw, height: fh, marginLeft: -fw / 2, marginTop: -fh / 2, transform, backfaceVisibility: 'visible' }}
        >
          {name === 'top' && children}
        </div>
      ))}
    </motion.div>
  );
}

const L = 300;
const H = 110;
const D = 116;
const BOOKED = 0.64;
const CRATES = 3;
const HATCH = 'bg-[repeating-linear-gradient(135deg,rgb(var(--signal)/0.55)_0_6px,rgb(var(--signal)/0.25)_6px_12px)]';

const shellFace = (n) => (n === 'bottom' ? 'bg-line/70 border border-ink/40' : 'border border-ink/50 bg-surface/20');
const crateFace = (n) => ({
  top: 'bg-ink/80 border border-paper/20',
  front: 'bg-ink border border-paper/20',
  back: 'bg-ink border border-paper/20',
  right: 'bg-ink/90 border border-paper/20',
  left: 'bg-ink/90 border border-paper/20',
  bottom: 'bg-ink',
}[n]);
const spareFace = () => `${HATCH} border border-signal`;

// Isometric container: booked crates slide in from the rear, the spare volume glows amber.
export default function CargoContainer3D() {
  const reduceMotion = useReducedMotion();
  const bookedLen = L * BOOKED;
  const crateLen = bookedLen / CRATES - 6;
  const spareLen = L - bookedLen - 10;

  return (
    <div className="relative h-[200px] w-full scale-[0.78] [perspective:1400px] sm:scale-100" aria-hidden="true">
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ transformStyle: 'preserve-3d', rotateX: -24 }}
        initial={{ rotateY: -34 }}
        animate={reduceMotion ? { rotateY: -34 } : { rotateY: [-40, -22, -40] }}
        transition={{ duration: 12, ease: 'easeInOut', repeat: Infinity }}
      >
        <Cuboid w={L} h={H} d={D} face={shellFace} />
        {[...Array(CRATES)].map((_, i) => (
          <Cuboid
            key={i}
            w={crateLen}
            h={H - 10}
            d={D - 10}
            face={crateFace}
            style={{ y: 5, x: -L / 2 + 4 + (crateLen + 6) * i + crateLen / 2 }}
            initial={reduceMotion ? false : { x: -L, opacity: 0 }}
            whileInView={{ x: -L / 2 + 4 + (crateLen + 6) * i + crateLen / 2, opacity: 1 }}
            transition={{ delay: 0.15 + (CRATES - 1 - i) * 0.18, type: 'spring', stiffness: 90, damping: 16 }}
          >
            {i === 0 && <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-paper/80">3,200 KG</span>}
          </Cuboid>
        ))}
        <Cuboid
          w={spareLen}
          h={H - 10}
          d={D - 10}
          face={spareFace}
          style={{ x: L / 2 - 4 - spareLen / 2, y: 5 }}
        >
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-semibold text-ink">1,800 KG SPARE</span>
        </Cuboid>
      </motion.div>
    </div>
  );
}

// Hero WebGL scene: a clay-model dispatch yard. Everything is built from three primitives (no model files).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Read the design tokens so the scene always matches index.css.
const token = (name) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  return `rgb(${v.split(/\s+/).join(',')})`;
};

const LOOP = new THREE.CatmullRomCurve3(
  [[-6.2, -2.6], [-2.4, -4.6], [2.8, -4], [6.4, -1], [5.4, 3.2], [1.2, 4.4], [-3.6, 3.4], [-6.8, 0.6]]
    .map(([x, z]) => new THREE.Vector3(x, 0, z)),
  true,
  'centripetal',
);
const SPURS = [
  new THREE.LineCurve3(new THREE.Vector3(-1.2, 0, 0.4), new THREE.Vector3(-2.4, 0, -4.6)),
  new THREE.LineCurve3(new THREE.Vector3(2.4, 0, 1.6), new THREE.Vector3(5.4, 0, 3.2)),
];
const ROAD_W = 1.15;
const LANE = 0.3;
const TRAILER_LEN = 1.7;
const BOOKED = 0.64; // 3,200 of 5,000 kg, mirrors the waybill card

// Flat quad strip along a curve.
function ribbon(curve, width, segments, y = 0.01) {
  const pos = [];
  const idx = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t);
    const nx = -t.z;
    const nz = t.x;
    const len = Math.hypot(nx, nz) || 1;
    const hx = (nx / len) * (width / 2);
    const hz = (nz / len) * (width / 2);
    pos.push(p.x + hx, y, p.z + hz, p.x - hx, y, p.z - hz);
    if (i < segments) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Position + heading on the loop, offset sideways into a lane.
const tmpP = new THREE.Vector3();
const tmpT = new THREE.Vector3();
function placeOnLoop(obj, u, lane, reverse) {
  const uu = ((u % 1) + 1) % 1;
  LOOP.getPointAt(uu, tmpP);
  LOOP.getTangentAt(uu, tmpT);
  if (reverse) tmpT.negate();
  const nx = -tmpT.z;
  const nz = tmpT.x;
  obj.position.set(tmpP.x + nx * lane, 0, tmpP.z + nz * lane);
  obj.lookAt(obj.position.x + tmpT.x, 0, obj.position.z + tmpT.z);
}

function Box({ size, position, color, ...rest }) {
  return (
    <mesh position={position} castShadow receiveShadow {...rest}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function Edges({ size, position, color, opacity = 1 }) {
  const geo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), [size]);
  return (
    <lineSegments position={position} geometry={geo}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}

const WHEELS = [[-0.3, -0.8], [0.3, -0.8], [-0.3, -0.35], [0.3, -0.35], [-0.3, 0.85], [0.3, 0.85]];

function Truck({ groupRef, c, hero = false }) {
  const trailerZ = -0.25;
  const bookedLen = TRAILER_LEN * BOOKED;
  const spareLen = TRAILER_LEN - bookedLen;
  const rear = trailerZ - TRAILER_LEN / 2;
  return (
    <group ref={groupRef}>
      <group scale={0.9}>
        <Box size={[0.5, 0.12, 2.45]} position={[0, 0.2, 0]} color={c.ink} />
        <Box size={[0.64, 0.56, 0.56]} position={[0, 0.5, 0.9]} color={hero ? c.ink : c.muted} />
        <Box size={[0.6, 0.16, 0.04]} position={[0, 0.62, 1.18]} color={c.line} />
        {WHEELS.map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x, 0.15, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.1, 12]} />
            <meshStandardMaterial color={c.ink} roughness={1} />
          </mesh>
        ))}
        {hero ? (
          <group position={[0, 0.6, 0]}>
            {/* Glass trailer: booked crates at the back, amber spare volume at the front. */}
            <mesh position={[0, 0, trailerZ]}>
              <boxGeometry args={[0.64, 0.64, TRAILER_LEN]} />
              <meshStandardMaterial color={c.surface} transparent opacity={0.22} depthWrite={false} />
            </mesh>
            <Edges size={[0.64, 0.64, TRAILER_LEN]} position={[0, 0, trailerZ]} color={c.ink} opacity={0.7} />
            {[0, 1, 2].flatMap((i) => [0, 1].flatMap((row) => [-1, 1].map((side) => (
              <Box
                key={`${i}${row}${side}`}
                size={[0.27, 0.27, bookedLen / 3 - 0.05]}
                position={[side * 0.15, -0.15 + row * 0.3, rear + (bookedLen / 3) * (i + 0.5)]}
                color={row ? c.transit : c.ink}
              />
            ))))}
            <mesh position={[0, 0, rear + bookedLen + spareLen / 2]}>
              <boxGeometry args={[0.56, 0.56, spareLen - 0.06]} />
              <meshBasicMaterial color={c.signal} transparent opacity={0.28} depthWrite={false} />
            </mesh>
            <Edges size={[0.56, 0.56, spareLen - 0.06]} position={[0, 0, rear + bookedLen + spareLen / 2]} color={c.signal} />
          </group>
        ) : (
          <Box size={[0.64, 0.64, TRAILER_LEN]} position={[0, 0.6, trailerZ]} color={c.surface} />
        )}
      </group>
    </group>
  );
}

function Warehouse({ position, size, c, stripe = false, rotation = 0 }) {
  const [w, h, d] = size;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box size={size} position={[0, h / 2, 0]} color={c.surface} />
      <Box size={[w + 0.08, 0.08, d + 0.08]} position={[0, h + 0.04, 0]} color={c.line} />
      {stripe && <Box size={[w + 0.1, 0.1, 0.22]} position={[0, h + 0.05, d / 2 - 0.08]} color={c.signal} />}
      {[...Array(Math.max(2, Math.floor(w / 0.8)))].map((_, i, arr) => (
        <Box key={i} size={[0.5, h * 0.55, 0.04]} position={[-w / 2 + (w / arr.length) * (i + 0.5), h * 0.28, d / 2 + 0.01]} color={c.line} />
      ))}
    </group>
  );
}

function ContainerStack({ position, c, rotation = 0 }) {
  const colors = [c.line, c.transit, c.muted, c.line, c.ink, c.line];
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {colors.map((col, i) => (
        <Box key={i} size={[1.2, 0.48, 0.5]} position={[0, 0.24 + Math.floor(i / 3) * 0.5, (i % 3) * 0.55]} color={col} />
      ))}
    </group>
  );
}

function Scene({ progress, reduceMotion, labelRef }) {
  const c = useMemo(() => ({
    ink: token('ink'), paper: token('paper'), surface: token('surface'), line: token('line'),
    muted: token('muted'), signal: token('signal'), transit: token('transit'),
  }), []);

  const roadGeo = useMemo(() => ribbon(LOOP, ROAD_W, 260), []);
  const spurGeos = useMemo(() => SPURS.map((s) => ribbon(s, ROAD_W * 0.8, 8, 0.008)), []);

  // Amber centre-line dashes that draw in on load.
  const DASHES = 90;
  const dashRef = useRef();
  useEffect(() => {
    const m = new THREE.Matrix4();
    const o = new THREE.Object3D();
    for (let i = 0; i < DASHES; i++) {
      placeOnLoop(o, i / DASHES, 0, false);
      o.position.y = 0.02;
      o.updateMatrix();
      m.copy(o.matrix);
      dashRef.current.setMatrixAt(i, m);
    }
    dashRef.current.instanceMatrix.needsUpdate = true;
    dashRef.current.count = reduceMotion ? DASHES : 0;
  }, [reduceMotion]);

  const grid = useMemo(() => {
    const g = new THREE.GridHelper(60, 60, c.ink, c.ink);
    g.material.transparent = true;
    g.material.opacity = 0.07;
    g.position.y = 0.002;
    return g;
  }, [c]);

  const hero = useRef();
  const ambient = [useRef(), useRef(), useRef()];
  const ring = useRef();
  const ringMat = useRef();
  const fleet = [
    { ref: ambient[0], offset: 0.36, speed: 0.022, lane: LANE, reverse: false },
    { ref: ambient[1], offset: 0.7, speed: 0.022, lane: LANE, reverse: false },
    { ref: ambient[2], offset: 0.1, speed: -0.03, lane: LANE, reverse: true },
  ];
  const look = useMemo(() => new THREE.Vector3(0, 0, -0.2), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const camTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, clock, pointer, size, scene }) => {
    const t = reduceMotion ? 0 : clock.getElapsedTime();
    const s = progress ? progress.get() : 0;

    // Camera: isometric angle, slow drift, pointer parallax, scroll dolly.
    const az = Math.PI / 4 + Math.sin(t * 0.08) * 0.06 + pointer.x * 0.1 + s * 0.28;
    const el = 0.62 + pointer.y * 0.04 - s * 0.12;
    // Pull back on narrow canvases so the whole yard (~20 units wide) stays in frame.
    const r = Math.max(25, 40 / (size.width / size.height)) + s * 8;
    if (scene.fog) { scene.fog.near = r + 2; scene.fog.far = r + 26; }
    camTarget.set(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az));
    if (reduceMotion) camera.position.copy(camTarget);
    else camera.position.lerp(camTarget, 0.06);
    camera.lookAt(look);

    placeOnLoop(hero.current, 0.82 + t * 0.022, LANE, false);
    fleet.forEach((f) => placeOnLoop(f.ref.current, f.offset + t * f.speed, f.lane * (f.reverse ? -1 : 1), f.reverse));

    if (!reduceMotion && dashRef.current) dashRef.current.count = Math.min(DASHES, Math.floor((t / 2.2) * DASHES));

    // GPS ping expanding on the ground around the hero truck.
    const ph = (t * 0.6) % 1;
    ring.current.position.set(hero.current.position.x, 0.03, hero.current.position.z);
    ring.current.scale.setScalar(reduceMotion ? 1.6 : 0.6 + ph * 2.4);
    ringMat.current.opacity = reduceMotion ? 0.5 : (1 - ph) * 0.8;

    // Pin the HTML label above the hero truck.
    if (labelRef.current) {
      v.set(hero.current.position.x, 2.7, hero.current.position.z).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      labelRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      labelRef.current.style.opacity = 1;
    }
  });

  return (
    <>
      <fog attach="fog" args={[c.paper, 34, 56]} />
      <hemisphereLight args={['#ffffff', c.paper, 1.25]} />
      <directionalLight
        position={[7, 12, 5]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <shadowMaterial color={c.ink} opacity={0.14} />
      </mesh>
      <primitive object={grid} />

      <mesh geometry={roadGeo} receiveShadow>
        <meshStandardMaterial color={c.ink} roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {spurGeos.map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow>
          <meshStandardMaterial color={c.ink} roughness={1} side={THREE.DoubleSide} transparent opacity={0.85} />
        </mesh>
      ))}
      <instancedMesh ref={dashRef} args={[null, null, DASHES]}>
        <boxGeometry args={[0.07, 0.01, 0.22]} />
        <meshBasicMaterial color={c.signal} />
      </instancedMesh>

      {/* Central depot (amber roof stripe) and outlying hubs. */}
      <Warehouse position={[0.2, 0, 0.6]} size={[3.2, 1.3, 1.9]} c={c} stripe rotation={-0.15} />
      <Warehouse position={[-9.2, 0, -4.6]} size={[2.4, 1, 1.6]} c={c} rotation={0.4} />
      <Warehouse position={[8.6, 0, 4.4]} size={[2.2, 1.1, 1.5]} c={c} rotation={-0.5} />
      <ContainerStack position={[-3.6, 0, -0.6]} c={c} rotation={0.3} />
      <ContainerStack position={[8.8, 0, -3.8]} c={c} rotation={-0.8} />

      <Truck groupRef={hero} c={c} hero />
      {fleet.map((f, i) => <Truck key={i} groupRef={f.ref} c={c} />)}

      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1, 48]} />
        <meshBasicMaterial ref={ringMat} color={c.signal} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

export default function YardScene({ progress, reduceMotion, className = '' }) {
  const wrapRef = useRef(null);
  const labelRef = useRef(null);
  const [visible, setVisible] = useState(true);

  // Stop rendering when the hero is scrolled away.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '80px' });
    io.observe(wrapRef.current);
    return () => io.disconnect();
  }, []);

  const frameloop = !visible ? 'never' : reduceMotion ? 'demand' : 'always';

  return (
    <div ref={wrapRef} className={`relative ${className}`} aria-hidden="true">
      <Canvas
        flat
        shadows
        frameloop={frameloop}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 26, near: 0.1, far: 120, position: [16, 14, 16] }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Scene progress={progress} reduceMotion={reduceMotion} labelRef={labelRef} />
      </Canvas>
      <div
        ref={labelRef}
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap rounded-sm border border-ink bg-surface px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-ink opacity-0 shadow-[0_6px_18px_-8px_rgb(var(--ink)/0.4)] transition-opacity"
      >
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-signal align-middle" />
        TRK-07 · live · 1,800 kg spare
      </div>
    </div>
  );
}

// Hero WebGL scene: a clay-model dispatch yard. Everything is built from three primitives (no model files).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box, Glow, Truck, palette } from './three-kit';

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

// Clay-model trees scattered around the loop.
const TREES = [
  [-8.4, -1.2], [-7.6, 2.6], [-5.2, 5.4], [-1.6, 6.2], [3.4, 6.4], [6.8, 5.8], [9.6, 1.6],
  [8.2, -1.6], [5.2, -5.6], [0.6, -6.6], [-4.2, -6.2], [-1.4, -2.2], [3.6, -1.4], [-4.8, 1.4],
];
function Trees({ c }) {
  return TREES.map(([x, z], i) => {
    const h = 0.7 + ((i * 37) % 10) / 22;
    return (
      <group key={i} position={[x, 0, z]}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.24, 6]} />
          <meshStandardMaterial color={c.muted} roughness={1} />
        </mesh>
        <mesh position={[0, 0.24 + h / 2, 0]} castShadow>
          <coneGeometry args={[0.32, h, 7]} />
          <meshStandardMaterial color={c.surface} roughness={0.95} flatShading />
        </mesh>
      </group>
    );
  });
}

// Booking / GPS traffic arcs from the central depot out to the hubs.
const DEPOT = new THREE.Vector3(0.2, 1.45, 0.6);
const HUBS = [[-9.2, 1.1, -4.6], [8.6, 1.2, 4.4], [8.8, 1.1, -3.8], [-3.6, 1.1, -0.6]];
const ARCS = HUBS.map(([x, y, z]) => {
  const end = new THREE.Vector3(x, y, z);
  const mid = DEPOT.clone().lerp(end, 0.5);
  mid.y += 2.2 + DEPOT.distanceTo(end) * 0.28;
  return new THREE.QuadraticBezierCurve3(DEPOT.clone(), mid, end);
});

function Arc({ curve, c, index, reduceMotion }) {
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 80, 0.028, 6, false), [curve]);
  const total = geo.index.count;
  const head = useRef();
  const p = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const t = reduceMotion ? 3 : clock.getElapsedTime();
    const k = Math.min(1, Math.max(0, (t - 1.2 - index * 0.25) / 1.4));
    geo.setDrawRange(0, Math.floor(total * k));
    curve.getPoint(reduceMotion ? 0.6 : ((t * 0.18 + index * 0.27) % 1), p);
    head.current.position.copy(p);
    head.current.visible = k >= 1;
  });
  return (
    <>
      <mesh geometry={geo}>
        <meshBasicMaterial color={c.signal} transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <group ref={head}>
        <mesh>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshBasicMaterial color={c.signal} />
        </mesh>
        <Glow color={c.signal} size={0.9} opacity={0.55} additive={false} />
      </group>
    </>
  );
}

// Slow-drifting dust motes for depth.
function Dust({ c, reduceMotion }) {
  const ref = useRef();
  const geo = useMemo(() => {
    const n = 260;
    const pos = new Float32Array(n * 3);
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (rnd() - 0.5) * 26;
      pos[i * 3 + 1] = 0.4 + rnd() * 6;
      pos[i * 3 + 2] = (rnd() - 0.5) * 20;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (reduceMotion) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = t * 0.015;
    ref.current.position.y = Math.sin(t * 0.3) * 0.15;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={c.ink} size={0.05} sizeAttenuation transparent opacity={0.28} depthWrite={false} />
    </points>
  );
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const easeOutCubic = (x) => 1 - (1 - x) ** 3;
const easeOutBack = (x) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
const smoothstep = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };

function Scene({ progress, reduceMotion, labelRef, offset }) {
  const c = useMemo(palette, []);

  const roadGeo = useMemo(() => ribbon(LOOP, ROAD_W, 260), []);
  const kerbGeo = useMemo(() => ribbon(LOOP, ROAD_W + 0.16, 260, 0.006), []);
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
  const pingGlow = useRef();
  const beacon = useRef();
  const fleet = [
    { ref: ambient[0], offset: 0.36, speed: 0.022, lane: LANE, reverse: false },
    { ref: ambient[1], offset: 0.7, speed: 0.022, lane: LANE, reverse: false },
    { ref: ambient[2], offset: 0.1, speed: -0.03, lane: LANE, reverse: true },
  ];
  const risers = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const v = useMemo(() => new THREE.Vector3(), []);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(0, 0, -0.2), []);
  const fwd = useMemo(() => new THREE.Vector3(), []);
  const chase = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, clock, pointer, size, scene }, delta) => {
    const t = reduceMotion ? 0 : clock.getElapsedTime();
    const s = progress ? progress.get() : 0;
    const wide = size.width >= 1024;
    const intro = reduceMotion ? 1 : easeOutCubic(clamp01(t / 2.6));
    const dive = reduceMotion ? 0 : smoothstep(0, 0.7, s) * 0.85; // stop short of a full chase so the yard stays readable

    // Buildings and trees rise out of the ground, staggered.
    risers.forEach((rf, i) => {
      if (rf.current) rf.current.scale.y = reduceMotion ? 1 : Math.max(0.001, easeOutBack(clamp01((t - 0.25 - i * 0.14) / 0.9)));
    });

    // Isometric orbit: slow drift + pointer parallax; swoops in from high and far on load.
    const az = Math.PI / 4 + Math.sin(t * 0.08) * 0.06 + pointer.x * 0.1;
    const el = 0.62 + pointer.y * 0.04 + (1 - intro) * 0.35;
    // Pull back on narrow canvases so the whole yard (~20 units wide) stays in frame.
    const r = Math.max(wide ? 46 : 25, 40 / (size.width / size.height)) * (1 + (1 - intro) * 0.7);
    camTarget.set(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az));
    lookTarget.copy(look);

    // Scroll dive: blend into a low chase-cam behind the hero truck.
    if (dive > 0) {
      hero.current.getWorldDirection(fwd);
      chase.copy(hero.current.position).addScaledVector(fwd, -9).add(v.set(fwd.z * 3, 5.5, -fwd.x * 3));
      camTarget.lerp(chase, dive);
      lookTarget.lerp(v.copy(hero.current.position).addScaledVector(fwd, 3).setY(0.4), dive);
    }
    if (reduceMotion) camera.position.copy(camTarget);
    else camera.position.lerp(camTarget, 1 - Math.exp(-delta * 4.5)); // frame-rate independent damping
    camera.lookAt(lookTarget);

    // Frame the yard to the right of the headline on desktop; centre it again during the dive.
    const ox = wide ? offset[0] * (1 - dive) : 0;
    const oy = wide ? offset[1] * (1 - dive) : 0;
    camera.fov = 26 + dive * 10;
    camera.setViewOffset(size.width, size.height, -size.width * ox, size.height * oy, size.width, size.height);
    camera.updateProjectionMatrix();

    const d = camera.position.distanceTo(lookTarget);
    if (scene.fog) { scene.fog.near = d + 2; scene.fog.far = d + 26; }

    placeOnLoop(hero.current, 0.82 + t * 0.022, LANE, false);
    fleet.forEach((f) => placeOnLoop(f.ref.current, f.offset + t * f.speed, f.lane * (f.reverse ? -1 : 1), f.reverse));

    if (!reduceMotion && dashRef.current) dashRef.current.count = Math.min(DASHES, Math.floor((t / 2.2) * DASHES));

    // GPS ping expanding on the ground around the hero truck.
    const ph = (t * 0.6) % 1;
    ring.current.position.set(hero.current.position.x, 0.03, hero.current.position.z);
    ring.current.scale.setScalar(reduceMotion ? 1.6 : 0.6 + ph * 2.4);
    ringMat.current.opacity = reduceMotion ? 0.5 : (1 - ph) * 0.8;
    pingGlow.current.position.set(hero.current.position.x, 1.1, hero.current.position.z);
    pingGlow.current.material.opacity = reduceMotion ? 0.4 : 0.25 + (1 - ph) * 0.35;
    beacon.current.material.opacity = reduceMotion ? 0.6 : 0.35 + Math.sin(t * 3) * 0.25;

    // Pin the HTML label above the hero truck.
    if (labelRef.current) {
      v.set(hero.current.position.x, 2.7, hero.current.position.z).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      labelRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      const half = labelRef.current.offsetWidth / 2;
      const top = labelRef.current.offsetHeight;
      // Hide rather than clip when it would spill past the canvas edge.
      labelRef.current.style.opacity = y - top > 52 && x - half > 8 && x + half < size.width - 8 ? 1 : 0;
    }
  });

  return (
    <>
      <fog attach="fog" args={[c.paper, 34, 56]} />
      <hemisphereLight args={['#eef3ff', c.paper, 1.15]} />
      <directionalLight
        position={[8, 13, 4]}
        intensity={2.3}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
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

      <mesh geometry={kerbGeo} receiveShadow>
        <meshStandardMaterial color={c.surface} roughness={1} side={THREE.DoubleSide} />
      </mesh>
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

      {/* Central depot (amber roof stripe) and outlying hubs; each group rises on load. */}
      <group ref={risers[0]}>
        <Warehouse position={[0.2, 0, 0.6]} size={[3.2, 1.3, 1.9]} c={c} stripe rotation={-0.15} />
        <mesh position={[0.2, 1.52, 0.6]}>
          <cylinderGeometry args={[0.09, 0.09, 0.16, 12]} />
          <meshBasicMaterial color={c.signal} />
        </mesh>
      </group>
      <group ref={risers[1]}><ContainerStack position={[-3.6, 0, -0.6]} c={c} rotation={0.3} /></group>
      <group ref={risers[2]}><Warehouse position={[-9.2, 0, -4.6]} size={[2.4, 1, 1.6]} c={c} rotation={0.4} /></group>
      <group ref={risers[3]}><Warehouse position={[8.6, 0, 4.4]} size={[2.2, 1.1, 1.5]} c={c} rotation={-0.5} /></group>
      <group ref={risers[4]}><ContainerStack position={[8.8, 0, -3.8]} c={c} rotation={-0.8} /></group>
      <group ref={risers[5]}><Trees c={c} /></group>

      <Truck groupRef={hero} c={c} hero />
      {fleet.map((f, i) => <Truck key={i} groupRef={f.ref} c={c} />)}

      {/* Depot beacon + network arcs + dust */}
      <Glow spriteRef={beacon} color={c.signal} size={1.6} opacity={0.5} additive={false} position={[0.2, 1.6, 0.6]} />
      {ARCS.map((curve, i) => <Arc key={i} curve={curve} c={c} index={i} reduceMotion={reduceMotion} />)}
      <Dust c={c} reduceMotion={reduceMotion} />
      <Glow spriteRef={pingGlow} color={c.signal} size={2.6} opacity={0.4} additive={false} />

      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1, 48]} />
        <meshBasicMaterial ref={ringMat} color={c.signal} transparent depthWrite={false} />
      </mesh>
    </>
  );
}

// offset: [x, y] fraction of the canvas to shift the yard by on desktop (positive = right / up).
export default function YardScene({ progress, reduceMotion, eventSource, offset = [0, 0], className = 'relative' }) {
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
    <div ref={wrapRef} className={className} aria-hidden="true">
      <Canvas
        flat
        shadows
        frameloop={frameloop}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{ fov: 26, near: 0.1, far: 160, position: [40, 60, 40] }}
        style={{ position: 'absolute', inset: 0 }}
        eventSource={eventSource}
        eventPrefix="client"
      >
        <Scene progress={progress} reduceMotion={reduceMotion} labelRef={labelRef} offset={offset} />
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

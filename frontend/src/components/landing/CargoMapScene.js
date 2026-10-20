// Landing "shipper sees what the driver sees" scene: a holographic night map that tracks one shipment
// from Depot → Hub 3 → Drop. The camera locks onto the cargo; a beacon marks its GPS fix and the
// travelled route lights up behind it. Click the map to drop a checkpoint.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Glow, OrbitRig, Truck, palette, springStep } from './three-kit';

const damp = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));
const MAX_PINS = 6;
const SPEED = 0.034; // route fraction per second (~30s trip)
const HOLD = 2.5; // seconds parked at Drop before the next trip

const HUBS = [
  { name: 'Depot', x: -8, z: 3 },
  { name: 'Hub 3', x: 0.5, z: -2.5 },
  { name: 'Drop', x: 8, z: 2.5 },
];

// Rolling hills, flattened around each hub so the yards sit level.
const height = (x, z) => {
  const hills = 0.75 * Math.sin(x * 0.36 + 0.4) * Math.cos(z * 0.45) + 0.4 * Math.sin(x * 0.85 + z * 0.3) + 0.45;
  const flat = Math.min(...HUBS.map((h) => Math.min(1, Math.hypot(x - h.x, z - h.z) / 2.4)));
  return Math.max(0, hills) * flat * flat;
};

// Route draped over the terrain; hub positions along it are measured once.
const ROUTE = (() => {
  const flat = new THREE.CatmullRomCurve3(
    [[-8, 3], [-5.6, 4.3], [-3, 1.4], [0.5, -2.5], [3.6, -3.9], [6.1, -1], [8, 2.5]].map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    'centripetal',
  );
  const pts = flat.getSpacedPoints(400).map((p) => new THREE.Vector3(p.x, height(p.x, p.z) + 0.12, p.z));
  return new THREE.CatmullRomCurve3(pts, false);
})();
const HUB_U = HUBS.map((h) => {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i <= 400; i++) {
    const p = ROUTE.getPointAt(i / 400);
    const d = Math.hypot(p.x - h.x, p.z - h.z);
    if (d < bestD) { bestD = d; best = i / 400; }
  }
  return best;
});

function Terrain({ onClick }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(30, 22, 120, 88);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors = [];
    const low = new THREE.Color('#14161a');
    const high = new THREE.Color('#2f343c');
    const col = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = height(pos.getX(i), pos.getZ(i));
      pos.setY(i, h);
      col.copy(low).lerp(high, Math.min(1, h / 1.4));
      colors.push(col.r, col.g, col.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <>
      <mesh geometry={geo} receiveShadow onClick={onClick}>
        <meshStandardMaterial vertexColors flatShading roughness={0.95} />
      </mesh>
      {/* Holographic contour grid: the same surface drawn as a faint wireframe */}
      <mesh geometry={geo} position={[0, 0.012, 0]}>
        <meshBasicMaterial color="#6f8fb3" wireframe transparent opacity={0.07} depthWrite={false} />
      </mesh>
    </>
  );
}

function Stars() {
  const geo = useMemo(() => {
    let seed = 3;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const pos = new Float32Array(500 * 3);
    for (let i = 0; i < 500; i++) {
      pos[i * 3] = (rnd() - 0.5) * 80;
      pos[i * 3 + 1] = 9 + rnd() * 16;
      pos[i * 3 + 2] = (rnd() - 0.5) * 80;
    }
    return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3));
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#f5f3ee" size={0.07} sizeAttenuation transparent opacity={0.55} depthWrite={false} fog={false} />
    </points>
  );
}

// A small yard of blocks, a light column and a ground ring that flares amber once the cargo passes.
function Hub({ hub, index, c, state }) {
  const column = useRef();
  const ring = useRef();
  const glow = useRef();
  const blocks = useMemo(() => {
    let seed = 7 + index * 13;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    return [...Array(7)].map(() => ({ x: (rnd() - 0.5) * 2.6, z: (rnd() - 0.5) * 2.2, w: 0.35 + rnd() * 0.5, h: 0.25 + rnd() * 0.9, d: 0.35 + rnd() * 0.5 }))
      .filter((b) => Math.hypot(b.x, b.z) > 0.7);
  }, [index]);
  const off = useMemo(() => new THREE.Color('#9fb4d0'), []);
  const on = useMemo(() => new THREE.Color(c.signal), [c]);
  useFrame(({ clock }) => {
    const { visitedAt } = state.current;
    const when = visitedAt[index];
    const visited = when != null;
    const since = visited ? clock.getElapsedTime() - when : 99;
    column.current.color.copy(visited ? on : off);
    column.current.opacity = visited ? 0.16 : 0.07;
    glow.current.color.copy(visited ? on : off);
    ring.current.material.color.copy(visited ? on : off);
    const burst = Math.min(1, since / 1.2);
    ring.current.scale.setScalar(visited ? 1 + (1 - burst) * 2.2 : 1);
    ring.current.material.opacity = visited ? 0.35 + (1 - burst) * 0.6 : 0.25;
  });
  const y = height(hub.x, hub.z);
  return (
    <group position={[hub.x, y, hub.z]}>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color="#3a3f47" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 3.6, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 7.2, 24, 1, true]} />
        <meshBasicMaterial ref={column} transparent depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <Glow materialRef={glow} color="#9fb4d0" size={2.2} opacity={0.6} position={[0, 0.3, 0]} />
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[1.05, 1.18, 64]} />
        <meshBasicMaterial transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

function Pin({ x, y, z, c, reduceMotion }) {
  const ref = useRef();
  const ring = useRef();
  const st = useRef({ y: reduceMotion ? 1 : 0, v: 0 });
  useFrame(({ clock }, dt) => {
    if (!reduceMotion) springStep(st.current, 1, dt, 120, 9);
    ref.current.scale.set(1, Math.max(0.001, st.current.y), 1);
    const ph = reduceMotion ? 0.5 : (clock.getElapsedTime() * 0.9) % 1;
    ring.current.scale.setScalar(0.5 + ph * 1.6);
    ring.current.material.opacity = (1 - ph) * 0.7;
  });
  return (
    <group position={[x, y, z]}>
      <group ref={ref}>
        <mesh position={[0, 0.7, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 1.4, 8]} />
          <meshBasicMaterial color={c.paper} />
        </mesh>
        <mesh position={[0, 1.45, 0]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          <meshBasicMaterial color={c.paper} />
        </mesh>
        <Glow color={c.paper} size={1} opacity={0.7} position={[0, 1.45, 0]} />
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.3, 0.36, 40]} />
        <meshBasicMaterial color={c.paper} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

const DASHES = 140;

function Scene({ c, live, reduceMotion, onCheckpoints, truckRef, labelRef, hubLabelRefs }) {
  const trailGeo = useMemo(() => new THREE.TubeGeometry(ROUTE, 400, 0.075, 8, false), []);
  const baseGeo = useMemo(() => new THREE.TubeGeometry(ROUTE, 400, 0.028, 6, false), []);
  const dashRef = useRef();
  const beam = useRef();
  const beaconRing = useRef();
  const lamp = useRef();
  const head = useRef();
  const p = useMemo(() => new THREE.Vector3(), []);
  const next = useMemo(() => new THREE.Vector3(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const st = useRef({ u: reduceMotion ? 0.55 : 0, speed: SPEED, hold: 0 });
  const state = useRef({ visitedAt: [0, null, null] });

  // Dashes ordered from Drop backwards, so `count` = the dashes still ahead of the truck.
  useEffect(() => {
    const o = new THREE.Object3D();
    for (let i = 0; i < DASHES; i++) {
      const u = 1 - i / DASHES;
      ROUTE.getPointAt(u, o.position);
      ROUTE.getPointAt(Math.max(0, u - 0.003), v);
      o.lookAt(v);
      o.updateMatrix();
      dashRef.current.setMatrixAt(i, o.matrix);
    }
    dashRef.current.instanceMatrix.needsUpdate = true;
  }, [v]);

  const [pins, setPins] = useState([]);
  const pinId = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { onCheckpoints?.(pins.length); invalidate(); }, [pins.length, onCheckpoints, invalidate]);
  const dropPin = (e) => {
    if (e.delta > 4) return; // a drag, not a click
    e.stopPropagation();
    const id = (pinId.current += 1);
    setPins((list) => [...list, { id, x: e.point.x, y: e.point.y, z: e.point.z }].slice(-MAX_PINS));
  };

  useFrame(({ clock, camera, size }, dt) => {
    const t = clock.getElapsedTime();
    const s = st.current;
    const vis = state.current.visitedAt;

    // Advance along the route; park at Drop briefly, then start the next trip.
    s.speed = damp(s.speed, live && !reduceMotion ? SPEED : 0, 3, dt);
    if (s.u >= 1) {
      s.hold += live ? dt : 0;
      if (s.hold > HOLD) { s.u = 0; s.hold = 0; vis[0] = t; vis[1] = null; vis[2] = null; }
    } else {
      s.u = Math.min(1, s.u + s.speed * dt);
    }
    HUB_U.forEach((hu, i) => { if (vis[i] == null && s.u >= hu - 0.002) vis[i] = t; });

    ROUTE.getPointAt(s.u, p);
    ROUTE.getPointAt(Math.min(1, s.u + 0.004), next);
    truckRef.current.position.copy(p).setY(p.y - 0.06);
    if (s.u < 0.996) truckRef.current.lookAt(next.x, next.y - 0.06, next.z);

    // Travelled route glows; the road ahead stays dashed.
    trailGeo.setDrawRange(0, Math.floor(trailGeo.index.count * s.u));
    dashRef.current.count = Math.floor(DASHES * (1 - s.u));

    // GPS beacon above the cargo.
    const pulse = (t * 0.9) % 1;
    beam.current.position.set(p.x, p.y + 1.8, p.z);
    beam.current.material.opacity = live ? 0.28 + Math.sin(t * 6) * 0.08 : 0.08;
    beaconRing.current.position.set(p.x, p.y + 0.02, p.z);
    beaconRing.current.scale.setScalar(reduceMotion ? 1.4 : 0.6 + pulse * 2.2);
    beaconRing.current.material.opacity = live ? (1 - pulse) * 0.8 : 0.15;
    head.current.position.set(p.x, p.y + 3.6, p.z);
    lamp.current.position.set(p.x, p.y + 1.2, p.z);

    // HTML labels: the shipment, plus each hub name. Hidden rather than clipped near the edges.
    const place = (el, wx, wy, wz) => {
      v.set(wx, wy, wz).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      const half = el.offsetWidth / 2;
      el.style.opacity = v.z < 1 && y - el.offsetHeight > 6 && y < size.height - 40 && x - half > 6 && x + half < size.width - 6 ? 1 : 0;
    };
    if (labelRef.current) {
      const leg = s.u < HUB_U[1] ? 0 : 1;
      const text = s.u >= 1
        ? 'TRK-07 · Delivered at Drop'
        : `TRK-07 · ${HUBS[leg].name} → ${HUBS[leg + 1].name} · ${Math.round(s.u * 100)}%`;
      if (labelRef.current.dataset.text !== text) { labelRef.current.dataset.text = text; labelRef.current.lastChild.textContent = text; }
      place(labelRef.current, p.x, p.y + 4.1, p.z);
    }
    HUBS.forEach((h, i) => { if (hubLabelRefs[i].current) place(hubLabelRefs[i].current, h.x, height(h.x, h.z) + 1.6, h.z); });
  });

  return (
    <>
      <color attach="background" args={[c.ink]} />
      <fog attach="fog" args={[c.ink, 14, 34]} />
      <hemisphereLight args={['#9fb4d0', c.ink, 0.55]} />
      <directionalLight
        position={[-6, 10, 5]}
        intensity={1.1}
        color="#cfdcff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.0004}
      />
      <pointLight ref={lamp} intensity={7} distance={7} decay={1.6} color={c.signal} />

      <Stars />
      <Terrain onClick={dropPin} />
      {HUBS.map((hub, i) => <Hub key={hub.name} hub={hub} index={i} c={c} state={state} />)}

      <mesh geometry={baseGeo}>
        <meshBasicMaterial color="#9fb4d0" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      <mesh geometry={trailGeo}>
        <meshBasicMaterial color={c.signal} />
      </mesh>
      <instancedMesh ref={dashRef} args={[null, null, DASHES]}>
        <boxGeometry args={[0.06, 0.03, 0.16]} />
        <meshBasicMaterial color="#cfdcff" transparent opacity={0.55} />
      </instancedMesh>

      <group ref={truckRef} scale={0.62}><Truck c={c} hero /></group>
      <mesh ref={beam}>
        <cylinderGeometry args={[0.04, 0.04, 3.6, 12, 1, true]} />
        <meshBasicMaterial color={c.signal} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <group ref={head}><Glow color={c.signal} size={1.6} opacity={0.9} /></group>
      <mesh ref={beaconRing} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.8, 64]} />
        <meshBasicMaterial color={c.signal} transparent depthWrite={false} />
      </mesh>

      {pins.map((pin) => <Pin key={pin.id} x={pin.x} y={pin.y} z={pin.z} c={c} reduceMotion={reduceMotion} />)}
    </>
  );
}

const CHIP = 'pointer-events-none absolute left-0 top-0 whitespace-nowrap font-mono text-[10px] font-medium uppercase tracking-[0.1em] opacity-0 transition-opacity duration-300';

export default function CargoMapScene({ live = true, onCheckpoints, reduceMotion = false, className = '' }) {
  const c = useMemo(palette, []);
  const wrapRef = useRef(null);
  const truckRef = useRef(null);
  const labelRef = useRef(null);
  const hubLabelRefs = [useRef(null), useRef(null), useRef(null)];
  const [visible, setVisible] = useState(true);

  // Stop rendering while scrolled out of view.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '80px' });
    io.observe(wrapRef.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={className} aria-hidden="true">
      <Canvas
        flat
        shadows
        frameloop={!visible ? 'never' : reduceMotion ? 'demand' : 'always'}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
        camera={{ fov: 32, near: 0.1, far: 140, position: [0, 9, 14] }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Scene c={c} live={live} reduceMotion={reduceMotion} onCheckpoints={onCheckpoints} truckRef={truckRef} labelRef={labelRef} hubLabelRefs={hubLabelRefs} />
        <OrbitRig reduceMotion={reduceMotion} radius={16} target={[0, 0.6, 0]} azimuth={0.35} followRef={truckRef} />
      </Canvas>
      <div ref={labelRef} className={`${CHIP} rounded-full border border-signal/60 bg-ink/85 px-3 py-1.5 text-paper shadow-[0_0_24px_-6px_rgb(var(--signal)/0.6)]`}>
        <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-signal align-middle" />
        <span>TRK-07</span>
      </div>
      {HUBS.map((h, i) => (
        <div key={h.name} ref={hubLabelRefs[i]} className={`${CHIP} rounded-sm border border-paper/15 bg-ink/70 px-2 py-1 text-paper/75`}>
          {h.name}
        </div>
      ))}
    </div>
  );
}

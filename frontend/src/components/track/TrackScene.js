// Shipper-portal WebGL scene: a tabletop city map with a live route, pins and GPS pings. Reacts to the search state.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Glow, Truck, palette } from '../landing/three-kit';

const damp = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));

const ROUTE = new THREE.CatmullRomCurve3(
  [[-7, 3.4], [-4.2, 3.2], [-2.6, 0.8], [0.4, 0.4], [1.8, -1.8], [4.4, -2.2], [6.8, -3.6]].map(([x, z]) => new THREE.Vector3(x, 0.16, z)),
  false,
  'centripetal',
);
const ORIGIN = ROUTE.getPoint(0);
const DEST = ROUTE.getPoint(1);

// Deterministic block layout that keeps the route and river clear.
function useBlocks() {
  return useMemo(() => {
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const samples = ROUTE.getSpacedPoints(120);
    const blocks = [];
    for (let gx = -7; gx <= 7; gx++) {
      for (let gz = -5; gz <= 5; gz++) {
        const x = gx * 1.05;
        const z = gz * 1.05;
        const nearRoute = samples.some((p) => Math.hypot(p.x - x, p.z - z) < 0.95);
        const inRiver = Math.abs(z - (x * 0.55 + 4.6)) < 0.8;
        if (nearRoute || inRiver || rnd() < 0.18) continue;
        const h = 0.18 + rnd() ** 2 * 1.9;
        blocks.push({ x, z, h, tone: rnd() });
      }
    }
    return blocks;
  }, []);
}

function Blocks({ c }) {
  const blocks = useBlocks();
  const ref = useRef();
  useEffect(() => {
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    blocks.forEach((b, i) => {
      o.position.set(b.x, b.h / 2, b.z);
      o.scale.set(0.82, b.h, 0.82);
      o.updateMatrix();
      ref.current.setMatrixAt(i, o.matrix);
      ref.current.setColorAt(i, col.set(b.tone > 0.82 ? c.muted : b.tone > 0.45 ? c.line : c.surface));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [blocks, c]);
  return (
    <instancedMesh ref={ref} args={[null, null, blocks.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}

function Pin({ position, color, pulse = true, reduceMotion, ringRef, glowRef, headRef }) {
  return (
    <group position={[position.x, 0, position.z]}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 1.5, 8]} />
        <meshStandardMaterial color="#d9d6cf" />
      </mesh>
      <mesh position={[0, 1.75, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.26, 0.5, 24]} />
        <meshBasicMaterial ref={headRef} color={color} />
      </mesh>
      <Glow materialRef={glowRef} color={color} size={1.8} opacity={0.7} position={[0, 1.8, 0]} />
      {pulse && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.55, 0.62, 48]} />
          <meshBasicMaterial color={color} transparent opacity={reduceMotion ? 0.6 : 0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function Scene({ c, status, reduceMotion }) {

  const routeGeo = useMemo(() => new THREE.TubeGeometry(ROUTE, 160, 0.07, 8, false), []);
  const routeMat = useRef();
  const truck = useRef();
  const pings = [useRef(), useRef()];
  const destRing = useRef();
  const destGlow = useRef();
  const destHead = useRef();
  const look = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const want = useMemo(() => new THREE.Vector3(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const next = useMemo(() => new THREE.Vector3(), []);
  const destColor = useMemo(() => new THREE.Color(), []);
  const st = useRef({ u: 0.3, speed: 0.04, radius: 1 });

  useFrame(({ camera, clock, pointer, size }, dt) => {
    const t = reduceMotion ? 3 : clock.getElapsedTime();
    const s = st.current;
    const busy = status === 'busy';
    const missing = status === 'missing';

    // Camera: slow orbit; eases closer while a search is running.
    s.radius = damp(s.radius, busy ? 0.78 : 1, 2.5, dt);
    const aspect = size.width / size.height;
    const r = 21 * Math.max(1, 1.6 / aspect) * s.radius;
    const az = 0.55 + (reduceMotion ? 0 : Math.sin(t * 0.07) * 0.18 + pointer.x * 0.12);
    want.set(Math.sin(az) * r, r * 0.62 + (reduceMotion ? 0 : pointer.y * 0.5), Math.cos(az) * r);
    if (reduceMotion) camera.position.copy(want);
    else camera.position.lerp(want, 1 - Math.exp(-dt * 3));
    camera.lookAt(look);
    // Push the map up and (on wide bands) right: the title owns the top-left, the search console the bottom.
    const ox = size.width >= 900 ? 0.25 : 0;
    camera.setViewOffset(size.width, size.height, -size.width * ox, size.height * 0.12, size.width, size.height);
    camera.updateProjectionMatrix();

    // Route draws in, then dims if the trip wasn't found.
    const k = reduceMotion ? 1 : Math.min(1, Math.max(0, (t - 0.4) / 1.8));
    routeGeo.setDrawRange(0, Math.floor(routeGeo.index.count * k));
    routeMat.current.opacity = damp(routeMat.current.opacity, missing ? 0.22 : 0.95, 4, dt);

    // Truck travels the route and loops; faster while searching.
    s.speed = damp(s.speed, busy ? 0.16 : 0.04, 3, dt);
    if (!reduceMotion) s.u = (s.u + s.speed * dt) % 1;
    ROUTE.getPointAt(s.u, p);
    ROUTE.getPointAt(Math.min(1, s.u + 0.01), next);
    truck.current.position.set(p.x, 0.06, p.z);
    truck.current.lookAt(next.x, 0.06, next.z);

    // GPS pings rise from the truck.
    pings.forEach((ref, i) => {
      const ph = reduceMotion ? 0.4 : (t * 0.7 + i * 0.5) % 1;
      ref.current.position.set(p.x, 0.9 + ph * 2.2, p.z);
      ref.current.scale.setScalar(0.4 + ph * 1.6);
      ref.current.material.opacity = (1 - ph) * 0.7;
    });

    // Destination pin: brighter while typing/searching, red when nothing was found.
    destColor.set(missing ? c.danger : c.signal);
    destHead.current.color.copy(destColor);
    destGlow.current.color.copy(destColor);
    destGlow.current.opacity = status === 'idle' ? 0.45 : 0.9;
    const ph = reduceMotion ? 0.5 : (t * 0.8) % 1;
    destRing.current.material.color.copy(destColor);
    destRing.current.scale.setScalar(0.6 + ph * 2.4);
    destRing.current.material.opacity = (1 - ph) * 0.8;
  });

  return (
    <>
      <color attach="background" args={[c.ink]} />
      <fog attach="fog" args={[c.ink, 26, 56]} />
      <hemisphereLight args={['#eef3ff', c.ink, 0.85]} />
      <directionalLight
        position={[-6, 12, 6]}
        intensity={2.2}
        color="#fff1d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
      />

      {/* Floor far below, then a bounded map table with an amber edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#17191c" roughness={1} />
      </mesh>
      <mesh position={[0, -0.18, 0]} receiveShadow castShadow>
        <boxGeometry args={[16.6, 0.36, 12.2]} />
        <meshStandardMaterial color="#25282d" roughness={0.85} />
      </mesh>
      <Blocks c={c} />
      <mesh position={[0, -0.18, 6.11]}>
        <boxGeometry args={[16.6, 0.36, 0.02]} />
        <meshBasicMaterial color={c.signal} transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.atan(0.55)]} position={[0, 0.012, 4.6]}>
        <planeGeometry args={[19, 1.3]} />
        <meshBasicMaterial color={c.transit} transparent opacity={0.45} />
      </mesh>
      <gridHelper args={[16, 16, c.paper, c.paper]} position={[0, 0.004, 0]} material-transparent material-opacity={0.06} />

      <mesh geometry={routeGeo}>
        <meshBasicMaterial ref={routeMat} color={c.signal} transparent opacity={0.95} />
      </mesh>

      <Pin position={ORIGIN} color={c.paper} pulse={false} reduceMotion={reduceMotion} />
      <Pin position={DEST} color={c.signal} reduceMotion={reduceMotion} ringRef={destRing} glowRef={destGlow} headRef={destHead} />

      <group ref={truck} scale={0.62}>
        <Truck c={c} hero />
      </group>
      {pings.map((ref, i) => (
        <mesh key={i} ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.48, 40]} />
          <meshBasicMaterial color={c.signal} transparent depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function Invalidate({ status }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { invalidate(); }, [status, invalidate]);
  return null;
}

export default function TrackScene({ status = 'idle', reduceMotion = false, className = '' }) {
  const c = useMemo(palette, []);
  const wrapRef = useRef(null);
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
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        camera={{ fov: 30, near: 0.1, far: 140, position: [14, 12, 14] }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Scene c={c} status={status} reduceMotion={reduceMotion} />
        {reduceMotion && <Invalidate status={status} />}
      </Canvas>
    </div>
  );
}

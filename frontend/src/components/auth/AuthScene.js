// Auth-page WebGL scenes that react to the form: a sign-in checkpoint gate, and a fleet bay for registration.
import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Box, Edges, Glow, Truck, palette, springStep } from '../landing/three-kit';

const damp = (from, to, rate, dt) => from + (to - from) * (1 - Math.exp(-rate * dt));

function Lights({ c }) {
  return (
    <>
      <color attach="background" args={[c.ink]} />
      <fog attach="fog" args={[c.ink, 20, 42]} />
      <hemisphereLight args={['#ffffff', c.ink, 0.9]} />
      <directionalLight
        position={[6, 10, 6]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#202327" roughness={1} />
      </mesh>
      <gridHelper args={[80, 80, c.paper, c.paper]} position={[0, 0.003, 0]} material-transparent material-opacity={0.05} />
    </>
  );
}

// Slow orbit around a target with pointer parallax.
function useOrbit({ radius, height, target, base, reduceMotion }) {
  const look = useMemo(() => new THREE.Vector3(...target), [target]);
  const want = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock, pointer, size }, dt) => {
    const t = reduceMotion ? 0 : clock.getElapsedTime();
    // Tall panels see less sideways, so back off to keep the set in frame.
    const r = radius * Math.max(1, 1.25 / (size.width / size.height));
    const az = base + Math.sin(t * 0.12) * 0.12 + (reduceMotion ? 0 : pointer.x * 0.18);
    const y = height + (reduceMotion ? 0 : pointer.y * 0.6);
    want.set(Math.sin(az) * r, y, Math.cos(az) * r);
    if (reduceMotion) camera.position.copy(want);
    else camera.position.lerp(want, 1 - Math.exp(-dt * 3));
    camera.lookAt(look);
  });
}

/* ── Login: checkpoint gate ─────────────────────────────── */

const STOP_Z = -3.4; // where the truck waits for the barrier
const LAMP = { idle: 'muted', typing: 'signal', busy: 'ok', error: 'danger' };

function Gate({ c, status, reduceMotion }) {
  useOrbit({ radius: 12.5, height: 4.4, target: [-1, 0.8, -0.8], base: 0.8, reduceMotion });
  const arm = useRef();
  const truck = useRef();
  const lamp = useRef();
  const glow = useRef();
  const state = useRef({ z: reduceMotion ? STOP_Z : -16, angle: 0, shake: 0 });
  const lampColor = useMemo(() => new THREE.Color(), []);

  useEffect(() => { if (status === 'error') state.current.shake = 1.6; }, [status]);

  useFrame(({ clock }, dt) => {
    const st = state.current;
    const t = clock.getElapsedTime();
    const busy = status === 'busy';
    const step = reduceMotion ? 0 : dt;

    // Truck: approaches and waits at the stop line; rolls through and loops while signing in.
    if (busy || st.z > STOP_Z + 0.01) st.z += 3.2 * step;
    else st.z = Math.min(STOP_Z, st.z + 3.2 * step);
    if (st.z > 15) st.z = -18;
    truck.current.position.set(0.75, reduceMotion ? 0 : Math.sin(t * 9) * 0.008, st.z);

    // Barrier stays up while the truck is crossing so it never clips through.
    const crossing = st.z > -2.6 && st.z < 2.6;
    const up = busy || crossing ? 1.38 : 0;
    st.angle = reduceMotion ? up : damp(st.angle, up, 4, dt);
    st.shake = Math.max(0, st.shake - dt);
    const wobble = st.shake > 0 && !reduceMotion ? Math.sin(t * 46) * 0.05 * Math.min(1, st.shake) : 0;
    arm.current.rotation.z = st.angle + wobble;

    lampColor.set(c[LAMP[status] || 'muted']);
    const pulse = status === 'typing' && !reduceMotion ? 0.55 + Math.sin(t * 5) * 0.45 : 1;
    lamp.current.color.copy(lampColor);
    glow.current.color.copy(lampColor);
    glow.current.intensity = (status === 'idle' ? 0.6 : 5) * pulse;
  });

  const dashes = useMemo(() => [...Array(26)].map((_, i) => -24 + i * 1.8), []);
  const posts = useMemo(() => [...Array(12)].map((_, i) => -18 + i * 3.2), []);

  return (
    <>
      {/* Road running into depth, amber centre dashes, kerb posts. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[3.4, 60]} />
        <meshStandardMaterial color="#2b2e33" roughness={1} />
      </mesh>
      {dashes.map((z) => (
        <mesh key={z} position={[0, 0.02, z]}>
          <boxGeometry args={[0.08, 0.01, 0.8]} />
          <meshBasicMaterial color={c.signal} />
        </mesh>
      ))}
      {posts.flatMap((z) => [-2.2, 2.2].map((x) => <Box key={`${x}${z}`} size={[0.12, 0.42, 0.12]} position={[x, 0.21, z]} color={c.line} />))}
      <mesh position={[0, 0.021, 0.35]}>
        <boxGeometry args={[3.4, 0.01, 0.12]} />
        <meshBasicMaterial color={c.paper} />
      </mesh>

      {/* Booth */}
      <group position={[-3.5, 0, 0.6]}>
        <Box size={[1.5, 1.7, 1.5]} position={[0, 0.85, 0]} color={c.surface} />
        <Box size={[1.7, 0.12, 1.7]} position={[0, 1.76, 0]} color={c.line} />
        <Box size={[1.52, 0.5, 0.9]} position={[0, 1.15, 0]} color={c.ink} />
        <Box size={[1.72, 0.06, 0.3]} position={[0, 1.84, 0.7]} color={c.signal} />
      </group>

      {/* Barrier post, lamp and pivoting arm */}
      <group position={[-2.1, 0, 0]}>
        <Box size={[0.34, 1.1, 0.34]} position={[0, 0.55, 0]} color={c.surface} />
        <Box size={[0.4, 0.34, 0.4]} position={[0, 1.27, 0]} color={c.ink} />
        <mesh position={[0, 1.27, 0.21]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshBasicMaterial ref={lamp} />
        </mesh>
        <pointLight ref={glow} position={[0, 1.3, 0.6]} distance={4.5} decay={2} />
        <group ref={arm} position={[0, 0.98, 0]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Box key={i} size={[0.8, 0.12, 0.12]} position={[0.42 + i * 0.8, 0, 0]} color={i % 2 ? c.ink : c.surface} />
          ))}
        </group>
      </group>

      <Truck groupRef={truck} c={c} />

      {[[-5, -6], [-6.4, -2.4], [4.4, -7], [6.2, -3.4], [-5.6, 4.2]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <coneGeometry args={[0.42, 1.2, 7]} />
            <meshStandardMaterial color={c.surface} roughness={0.95} flatShading />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ── Register: fleet bay, the truck assembles on a turntable ── */

const ROLE_TONE = { fleet_manager: 'ink', driver: 'transit', safety_officer: 'ok', financial_analyst: 'warn' };
const DROP = 5;
const WHEEL_Z = [-1.5, -0.95, 1.35];

// One part docks per filled field; hidden parts wait above the bay and drop in on a damped spring.
function Part({ shown, reduceMotion, children }) {
  const ref = useRef();
  const st = useRef({ y: shown || reduceMotion ? 0 : DROP, v: 0 });
  useFrame((_, dt) => {
    const s = st.current;
    const target = shown ? 0 : DROP;
    if (reduceMotion) s.y = target;
    else springStep(s, target, dt);
    ref.current.position.y = s.y;
    ref.current.visible = s.y < DROP - 0.2;
  });
  return <group ref={ref}>{children}</group>;
}

function Bay({ c, filled, role, ready, busy, reduceMotion }) {
  useOrbit({ radius: 11.5, height: 4.2, target: [0, 1, 0], base: 0.75, reduceMotion });
  const table = useRef();
  const rim = useRef();
  const keyLight = useRef();
  const lamps = [useRef(), useRef()];
  const st = useRef({ speed: 0.25 });
  const cab = c[ROLE_TONE[role] || 'ink'];

  useFrame(({ clock }, dt) => {
    const t = clock.getElapsedTime();
    st.current.speed = damp(st.current.speed, ready ? 0.7 : 0.25, 2, dt);
    if (!reduceMotion) table.current.rotation.y += st.current.speed * dt;
    rim.current.opacity = ready ? 0.95 : 0.25 + filled * 0.1;
    keyLight.current.intensity = busy && !reduceMotion ? 60 + Math.sin(t * 8) * 30 : 70;
    lamps.forEach((l) => { if (l.current) l.current.opacity = ready ? 0.9 : 0; });
  });

  return (
    <>
      <spotLight ref={keyLight} position={[0, 9, 2]} angle={0.5} penumbra={0.6} distance={22} decay={1.6} intensity={70} color="#fff1d6" castShadow />
      {/* Visible light cones from the gantry above the bay */}
      {[-2.2, 2.2].map((x) => (
        <group key={x} position={[x, 7, 0]}>
          <mesh position={[0, -3, 0]}>
            <coneGeometry args={[1.8, 6, 32, 1, true]} />
            <meshBasicMaterial color="#fff6e0" transparent opacity={0.035} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <Glow color="#fff6e0" size={1.4} opacity={0.7} />
        </group>
      ))}

      <group ref={table}>
        <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[3.2, 3.3, 0.2, 64]} />
          <meshStandardMaterial color="#2c2f34" roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.205, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.0, 3.18, 96]} />
          <meshBasicMaterial ref={rim} color={c.signal} transparent opacity={0.3} />
        </mesh>

        <group position={[0, 0.2, 0]} scale={1.15}>
          {/* 1 · chassis + wheels */}
          <Part shown={filled >= 1} reduceMotion={reduceMotion}>
            <Box size={[0.8, 0.18, 3.8]} position={[0, 0.34, 0]} color={c.ink} />
            {WHEEL_Z.flatMap((z) => [-0.44, 0.44].map((x) => (
              <mesh key={`${x}${z}`} position={[x, 0.24, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.24, 0.24, 0.16, 18]} />
                <meshStandardMaterial color="#111316" roughness={0.9} />
              </mesh>
            )))}
          </Part>
          {/* 2 · cab, coloured by role */}
          <Part shown={filled >= 2} reduceMotion={reduceMotion}>
            <Box size={[1.02, 0.92, 0.95]} position={[0, 0.9, 1.4]} color={cab} />
            <Box size={[0.94, 0.3, 0.04]} position={[0, 1.1, 1.88]} color={c.line} />
            {[-0.34, 0.34].map((x, i) => (
              <group key={x} position={[x, 0.58, 1.89]}>
                <mesh>
                  <boxGeometry args={[0.18, 0.09, 0.03]} />
                  <meshBasicMaterial color="#FFF6DC" />
                </mesh>
                <Glow materialRef={lamps[i]} color="#ffd98a" size={1.1} opacity={0} />
              </group>
            ))}
          </Part>
          {/* 3 · mirrors + roof light bar */}
          <Part shown={filled >= 3} reduceMotion={reduceMotion}>
            {[-0.6, 0.6].map((x) => <Box key={x} size={[0.06, 0.26, 0.14]} position={[x, 1.08, 1.78]} color={c.line} />)}
            <mesh position={[0, 1.4, 1.42]}>
              <boxGeometry args={[0.7, 0.07, 0.12]} />
              <meshBasicMaterial color={c.signal} />
            </mesh>
          </Part>
          {/* 4 · trailer frame */}
          <Part shown={filled >= 4} reduceMotion={reduceMotion}>
            <Edges size={[1.02, 1.02, 2.7]} position={[0, 0.96, -0.55]} color={c.paper} opacity={0.9} />
          </Part>
          {/* 5 · trailer skin + cargo */}
          <Part shown={filled >= 5} reduceMotion={reduceMotion}>
            <Box size={[1.0, 1.0, 2.68]} position={[0, 0.96, -0.55]} color={c.surface} />
            <Box size={[1.01, 0.1, 2.69]} position={[0, 1.02, -0.55]} color={c.signal} />
          </Part>
        </group>
      </group>

      {/* Tool racks around the bay for scale */}
      {[[-5.4, -2.4, 0.5], [5.2, -2.8, -0.5], [-4.6, 3.4, 0.9]].map(([x, z, r]) => (
        <group key={`${x}${z}`} position={[x, 0, z]} rotation={[0, r, 0]}>
          <Box size={[1.6, 1.4, 0.5]} position={[0, 0.7, 0]} color={c.muted} />
          <Box size={[1.7, 0.08, 0.6]} position={[0, 1.44, 0]} color={c.line} />
        </group>
      ))}
    </>
  );
}

function Invalidate({ deps }) {
  const invalidate = useThree((s) => s.invalidate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { invalidate(); }, deps);
  return null;
}

export default function AuthScene({ variant, status = 'idle', filled = 0, role, ready = false, reduceMotion = false, className = '' }) {
  const c = useMemo(palette, []);
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        flat
        shadows
        frameloop={reduceMotion ? 'demand' : 'always'}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
        camera={{ fov: 32, near: 0.1, far: 120, position: [10, 6, 10] }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <Lights c={c} />
        {variant === 'gate'
          ? <Gate c={c} status={status} reduceMotion={reduceMotion} />
          : <Bay c={c} filled={filled} role={role} ready={ready} busy={status === 'busy'} reduceMotion={reduceMotion} />}
        {reduceMotion && <Invalidate deps={[status, filled, role, ready]} />}
      </Canvas>
    </div>
  );
}

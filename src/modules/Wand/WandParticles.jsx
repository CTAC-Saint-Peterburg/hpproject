import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, Color, Object3D } from 'three';
import { useGameStore } from '../Stores/GameStore';
import { enemyPosition } from '../../static/enemies';
import { advanceParticle, settings, spellEffect } from './effectSettings';

export function WandParticles({ tip }) {
  const mesh = useRef();
  const tipFlash = useRef();
  const targetFlash = useRef();
  const ring = useRef();
  const light = useRef();
  const pool = useRef([]);
  const cursor = useRef(0);
  const emitter = useRef(0);
  const seen = useRef(0);
  const active = useRef(null);
  const flash = useRef(null);
  const matrix = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  const { viewport } = useThree();
  const capacity = Math.max(1, Math.min(4096, Math.trunc(settings.capacity)));

  useFrame((_, rawDelta) => {
    if (!mesh.current) return;
    const s = useGameStore.getState();
    if (s.status !== 'playing') {
      pool.current = []; active.current = null; flash.current = null; emitter.current = 0;
      mesh.current.count = 0;
      tipFlash.current.visible = targetFlash.current.visible = ring.current.visible = false;
      light.current.intensity = 0;
      return;
    }
    const delta = Math.min(rawDelta, .1);
    const spawn = (position, config) => {
      const angle = Math.random() * Math.PI * 2;
      const vertical = Math.random() * 2 - 1;
      const radial = Math.sqrt(1 - vertical * vertical);
      const speed = config.speed * (.6 + Math.random() * .8);
      const velocity = [Math.cos(angle) * radial * speed, vertical * speed, Math.sin(angle) * radial * speed];
      if (config.motion === 'fountain') velocity[1] = Math.abs(velocity[1]) + speed * .6;
      if (config.motion === 'drift') velocity[1] *= .25;
      if (config.motion === 'spiral') velocity[1] = speed * .5;
      const particle = {
        position: position.map(v => v + (Math.random() - .5) * config.spread),
        velocity, age: 0, lifetime: config.lifetime, size: config.size * (.75 + Math.random() * .5),
        color: config.color, gravity: config.gravity, motion: config.motion, swirl: config.swirl,
      };
      if (pool.current.length < capacity) pool.current.push(particle);
      else { pool.current[cursor.current % capacity] = particle; cursor.current++; }
    };

    const event = s.spellCast;
    if (event && event.sequence !== seen.current) {
      seen.current = event.sequence;
      const profile = spellEffect(event.spellId);
      const target = event.target?.kind === 'enemy'
        ? enemyPosition(event.target.enemy, event.at, viewport.width, viewport.height)
        : event.target?.kind === 'pot' ? [0, 0, 0] : tip.current.toArray();
      active.current = { profile, age: 0 };
      flash.current = { profile: profile.flash, age: 0, target };
      const count = Math.min(settings.maxBurstParticles, Math.max(0, Math.trunc(profile.burst.count)));
      for (let i = 0; i < count; i++) spawn(target, profile.burst);
      // A second, smaller burst always leaves the wand tip.
      for (let i = 0; i < Math.floor(count * settings.tipBurstRatio); i++) spawn(tip.current.toArray(), profile.burst);
    }
    if (active.current) {
      active.current.age += delta;
      if (active.current.age > settings.activeSpellSeconds) active.current = null;
    }
    const trail = active.current?.profile.trail || settings.trail;
    emitter.current = Math.min(emitter.current + delta * trail.emitRate, capacity);
    const count = Math.floor(emitter.current);
    emitter.current -= count;
    for (let i = 0; i < count; i++) spawn(tip.current.toArray(), trail);

    pool.current = pool.current.filter(p => {
      advanceParticle(p, delta);
      return p.age < p.lifetime;
    });
    for (let i = 0; i < pool.current.length; i++) {
      const p = pool.current[i];
      matrix.position.set(...p.position);
      matrix.scale.setScalar(p.size * Math.max(0, 1 - p.age / p.lifetime));
      matrix.rotation.set(p.age * 2, p.age * 3, p.age);
      matrix.updateMatrix();
      mesh.current.setMatrixAt(i, matrix.matrix);
      mesh.current.setColorAt(i, color.set(p.color));
    }
    mesh.current.count = pool.current.length;
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;

    const f = flash.current;
    const visible = !!f && f.age < f.profile.duration;
    tipFlash.current.visible = targetFlash.current.visible = ring.current.visible = visible;
    light.current.intensity = 0;
    if (visible) {
      f.age += delta;
      const progress = Math.min(1, f.age / f.profile.duration);
      const size = f.profile.size * (1 + progress * f.profile.growth);
      tipFlash.current.position.copy(tip.current);
      targetFlash.current.position.set(...f.target);
      ring.current.position.set(...f.target);
      tipFlash.current.scale.setScalar(size);
      targetFlash.current.scale.setScalar(size);
      ring.current.scale.setScalar(f.profile.ringRadius * (1 + progress * f.profile.ringGrowth));
      for (const object of [tipFlash.current, targetFlash.current, ring.current]) {
        object.material.color.set(f.profile.color);
        object.material.opacity = f.profile.opacity * (1 - progress);
      }
      light.current.position.set(...f.target);
      light.current.color.set(f.profile.color);
      light.current.intensity = f.profile.intensity * (1 - progress);
    }
  });

  return <>
    <instancedMesh ref={mesh} args={[null, null, capacity]} frustumCulled={false} raycast={() => null}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial transparent opacity={settings.particleOpacity} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </instancedMesh>
    <mesh ref={tipFlash} visible={false} raycast={() => null}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshBasicMaterial transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh ref={targetFlash} visible={false} raycast={() => null}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshBasicMaterial transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh ref={ring} visible={false} raycast={() => null}>
      <ringGeometry args={[.85, 1, 48]} />
      <meshBasicMaterial transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
    <pointLight ref={light} intensity={0} distance={settings.flashLightDistance} />
  </>;
}

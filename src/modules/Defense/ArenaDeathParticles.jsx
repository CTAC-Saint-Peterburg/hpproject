import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, DynamicDrawUsage, Object3D } from 'three';
import { MAX_REWARD_EVENTS } from './rewardMotion';
import { theme } from '../../static/theme';

const geometry = new BoxGeometry(1, 1, 1);
const particlesPerDeath = 8;
// One draw call, no lights, textures, React updates or extra death timers.
export default function ArenaDeathParticles({ events, time }) {
  const mesh = useRef();
  const pose = useMemo(() => new Object3D(), []);
  useFrame(() => {
    if (!mesh.current) return;
    let count = 0;
    for (const event of events) {
      const age = time - event.time;
      if (age < 0 || age >= .24) continue;
      const progress = age / .24;
      for (let i = 0; i < particlesPerDeath && count < MAX_REWARD_EVENTS * particlesPerDeath; i++) {
        const angle = i * Math.PI / 4 + event.id * 1.7;
        const radius = .08 + progress * .55;
        pose.position.set(event.position[0] + Math.cos(angle) * radius,
          event.position[1] + Math.sin(i * 2.4) * radius + progress * .2,
          event.position[2] + Math.sin(angle) * radius);
        pose.rotation.set(angle, progress * 3, angle);
        pose.scale.setScalar(.1 * (1 - progress));
        pose.updateMatrix();
        mesh.current.setMatrixAt(count++, pose.matrix);
      }
    }
    mesh.current.count = count;
    mesh.current.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} geometry={geometry} args={[null, null, MAX_REWARD_EVENTS * particlesPerDeath]} count={0} frustumCulled={false} raycast={() => null}>
    <meshBasicMaterial color={theme.colors.black} />
  </instancedMesh>;
}

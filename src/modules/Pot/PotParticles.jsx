import { theme } from '../../static/theme';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';

export const PotParticles = ({ count = 20, speed = 0.5, spread = 0.3,
  color = theme.colors.fireWarm, size = 0.05, lifetime = 2, position = [0, 0, 0] }) => {
  const ref = useRef();
  const capacity = 100;
  const positions = useMemo(() => new Float32Array(capacity * 3), []);
  const agesRef = useRef(new Float32Array(capacity));
  useFrame((_, delta) => {
    if (!ref.current) return;
    const visible = Math.min(capacity, count);
    const ages = agesRef.current;
    const coords = ref.current.geometry.attributes.position.array;
    ref.current.geometry.setDrawRange(0, visible);
    for (let i = 0; i < visible; i++) {
      ages[i] -= delta;
      if (ages[i] <= 0) {
        ages[i] = Math.random() * lifetime + 0.1;
        coords[i * 3] = (Math.random() - 0.5) * spread;
        coords[i * 3 + 1] = 0;
        coords[i * 3 + 2] = (Math.random() - 0.5) * spread;
      }
      coords[i * 3 + 1] += (speed + (i % 5) * 0.08) * delta;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return <points ref={ref} position={position}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
    <pointsMaterial size={size} color={color} transparent opacity={0.8} sizeAttenuation depthWrite={false} />
  </points>;
};

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useInputStore } from './inputStore';

// A larger tap target changes picking only; the visible low-poly model stays put.
export default function TouchHitArea({ onClick, size = 40, position, minWorldRadius = 0, enabled = true }) {
  const mode = useInputStore(state => state.mode);
  const mesh = useRef();
  const scratch = useMemo(() => ({ point: new Vector3(), scale: new Vector3() }), []);
  const { camera, size: viewport } = useThree();
  useFrame(() => {
    if (!mesh.current || !viewport.height) return;
    mesh.current.getWorldPosition(scratch.point);
    scratch.point.applyMatrix4(camera.matrixWorldInverse);
    const worldPerPixel = 2 * Math.abs(scratch.point.z) * Math.tan(camera.fov * Math.PI / 360) / viewport.height;
    const radius = Math.max(minWorldRadius, size * .5 * worldPerPixel);
    mesh.current.parent.getWorldScale(scratch.scale);
    mesh.current.scale.set(radius / Math.max(.001, Math.abs(scratch.scale.x)),
      radius / Math.max(.001, Math.abs(scratch.scale.y)), radius / Math.max(.001, Math.abs(scratch.scale.z)));
  });
  if (mode !== 'touch' || !enabled) return null;
  return <mesh ref={mesh} position={position} onClick={onClick}>
    <sphereGeometry args={[1, 6, 4]} />
    <meshBasicMaterial visible={false} />
  </mesh>;
}

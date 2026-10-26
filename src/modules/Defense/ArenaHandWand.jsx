import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Plane, Vector3 } from 'three';
import HandWandRig from '../Wand/HandWandRig';
import { WandParticles } from '../Wand/WandParticles';
import { settings } from '../Wand/effectSettings';
import { useDefenseStore } from './DefenseStore';
import { arenaEffectState } from './arenaEffectState';

const getEffectState = () => arenaEffectState(useDefenseStore.getState(), settings.arenaRig.ringRotation);

export default function ArenaHandWand({ tip }) {
  const rig = useRef();
  const aim = useRef(new Vector3());
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), []);
  const offset = useMemo(() => new Vector3(), []);
  const { camera, pointer, raycaster, size } = useThree();
  useFrame(() => {
    if (!rig.current) return;
    const layout = settings.arenaRig;
    const aspect = size.width / size.height;
    const height = 2 * layout.depth * Math.tan(camera.fov * Math.PI / 360);
    offset.set(layout.screenAnchor[0] * height * aspect / 2, layout.screenAnchor[1] * height / 2, -layout.depth);
    rig.current.position.copy(offset.applyMatrix4(camera.matrixWorld));
    rig.current.quaternion.copy(camera.quaternion);
    rig.current.scale.setScalar(layout.scale * Math.min(1, aspect / layout.mobileAspect));
    rig.current.updateWorldMatrix(true, true);
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(plane, aim.current);
  }, -3);
  return <>
    <group ref={rig}>
      <HandWandRig aimTarget={aim} tip={tip} getEffectState={getEffectState} />
    </group>
    {/* Both renderer and targets are in world space, outside the camera-aligned rig. */}
    <WandParticles tip={tip} getEffectState={getEffectState} />
  </>;
}

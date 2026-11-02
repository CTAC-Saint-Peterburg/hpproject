import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { useDefenseStore } from './DefenseStore';
import { coinPose } from './coinMotion';
import { writeArenaCameraPose } from './coinCamera';

export default function ArenaCamera() {
  const { camera, size } = useThree();
  const aspect = size.width / size.height;
  const weight = useRef(0);
  const coin = useRef([0, .12, 2.3]);
  const pose = useMemo(() => ({ position: [0, 0, 0], target: [0, 0, 0] }), []);
  const target = useMemo(() => new Vector3(), []);
  useEffect(() => {
    weight.current = 0;
    writeArenaCameraPose(pose, aspect, null, 0);
    camera.position.fromArray(pose.position);
    camera.lookAt(target.fromArray(pose.target));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }, [camera, aspect, pose, target]);
  useFrame((_, rawDelta) => {
    const state = useDefenseStore.getState();
    if (state.paused) return;
    const delta = Math.min(rawDelta, .1);
    if (state.phase === 'coin' && state.coinToss) {
      const current = coinPose(state.coinToss, state.time - state.coinStartedAt, state.coinResult);
      const smooth = 1 - Math.exp(-delta * 10);
      for (let axis = 0; axis < 3; axis++) coin.current[axis] += (current.position[axis] - coin.current[axis]) * smooth;
    }
    const desired = state.phase === 'coin' && state.coinEnd - state.time > .65 ? 1 : 0;
    weight.current += (desired - weight.current) * (1 - Math.exp(-delta * (desired ? 5 : 10)));
    if (!desired && weight.current < .003) weight.current = 0;
    writeArenaCameraPose(pose, aspect, coin.current, weight.current);
    camera.position.fromArray(pose.position);
    camera.lookAt(target.fromArray(pose.target));
    camera.updateMatrixWorld(true);
  }, -4);
  return null;
}

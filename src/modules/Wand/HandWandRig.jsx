import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { Hand } from '../Hand/Hand';
import { Wand } from './Wand';
import { settings } from './effectSettings';
import { createHandMotion, stepHandMotion } from './handMotion';

export default function HandWandRig({ tip, aimTarget, getEffectState }) {
  const joint = useRef();
  const motion = useRef(createHandMotion());
  const initialized = useRef(false);
  const vectors = useMemo(() => ({
    target: new Vector3(), smoothed: new Vector3(), local: new Vector3(), up: new Vector3(0, 1, 0),
    matrix: new Matrix4(), goal: new Quaternion(), correction: new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0)),
    sway: new Quaternion(), angles: new Euler(),
  }), []);
  const { pointer } = useThree();
  useFrame((_, delta) => {
    if (!joint.current || getEffectState?.().paused) return;
    const config = settings.handRig;
    const dt = Math.min(delta, .1);
    const pose = stepHandMotion(motion.current, pointer, dt, config);
    const base = config.position, influence = config.tracking.positionInfluence;
    joint.current.position.set(base[0] + pose.x * influence[0], base[1] + pose.y * influence[1] + pose.bob, base[2]);
    if (aimTarget) vectors.target.copy(aimTarget.current);
    else vectors.target.set(pose.x * config.brewingAim[0], pose.y * config.brewingAim[1], config.brewingAim[2]);
    if (!initialized.current) vectors.smoothed.copy(vectors.target);
    else vectors.smoothed.lerp(vectors.target, 1 - Math.exp(-config.tracking.aimDamping * dt));
    vectors.local.copy(vectors.smoothed);
    joint.current.parent.updateWorldMatrix(true, false);
    joint.current.parent.worldToLocal(vectors.local);
    vectors.matrix.lookAt(vectors.local, joint.current.position, vectors.up);
    vectors.goal.setFromRotationMatrix(vectors.matrix).multiply(vectors.correction);
    vectors.sway.setFromEuler(vectors.angles.set(pose.pitch, 0, pose.roll));
    vectors.goal.multiply(vectors.sway);
    if (!initialized.current) { joint.current.quaternion.copy(vectors.goal); initialized.current = true; }
    else joint.current.quaternion.slerp(vectors.goal, 1 - Math.exp(-config.tracking.rotationDamping * dt));
    joint.current.updateWorldMatrix(true, true);
  }, -2);
  return <group ref={joint}>
    <Hand attached />
    <Wand attached tipRef={tip} showParticles={false} />
  </group>;
}

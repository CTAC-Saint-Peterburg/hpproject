import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BackSide } from 'three';
import { useGameStore } from '../Stores/GameStore';
import { ENEMY_TYPES, enemyPosition } from '../../static/enemies';
import Slime from './Slime';

function Enemy({ enemy, selected }) {
  const group = useRef();
  const cube = useRef();
  const { viewport } = useThree();
  const config = ENEMY_TYPES[enemy.type];
  useFrame(() => {
    if (!group.current) return;
    const state = useGameStore.getState();
    const now = state.status === 'playing' ? Date.now() : state.lastTick;
    group.current.position.set(...enemyPosition(enemy, now, viewport.width, viewport.height));
    const age = (now - enemy.bornAt) / 1000;
    cube.current.rotation.set(age * 0.2, age * 0.35, Math.sin(age) * 0.08);
  });
  return <group ref={group}>
    <mesh ref={cube} onClick={e => { e.stopPropagation(); useGameStore.getState().selectEnemy(enemy.id); }}>
      <boxGeometry args={[0.55, 0.55, 0.55]} />
      <meshStandardMaterial color={config.color} emissive={config.color} emissiveIntensity={2} toneMapped={false} />
      <mesh scale={1.45} raycast={() => null}><boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshBasicMaterial color={config.color} transparent opacity={0.12} depthWrite={false} /></mesh>
      {selected && <mesh scale={1.16} raycast={() => null}><boxGeometry args={[0.55, 0.55, 0.55]} />
        <meshBasicMaterial color="white" side={BackSide} toneMapped={false} /></mesh>}
    </mesh>
    <pointLight color={config.color} intensity={3} distance={3} />
  </group>;
}

function Projectile({ shot }) {
  const mesh = useRef();
  const { viewport } = useThree();
  useFrame(() => {
    if (!mesh.current) return;
    const state = useGameStore.getState();
    const now = state.status === 'playing' ? Date.now() : state.lastTick;
    const progress = Math.max(0, Math.min(1, (now - shot.launchedAt) / (shot.impactAt - shot.launchedAt)));
    const from = enemyPosition(shot, shot.launchedAt, viewport.width, viewport.height);
    mesh.current.position.set(from[0] * (1 - progress), from[1] * (1 - progress), 0);
    mesh.current.rotation.set(progress * 5, progress * 6, 0);
  });
  const color = ENEMY_TYPES[shot.type].color;
  return <mesh ref={mesh} raycast={() => null}>
    <boxGeometry args={[0.16, 0.16, 0.16]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
  </mesh>;
}

export default function Enemies() {
  const enemies = useGameStore(s => s.enemies);
  const projectiles = useGameStore(s => s.projectiles);
  const selected = useGameStore(s => s.selectedEnemyId);
  return <group>
    {enemies.map(enemy => enemy.type === 'enemyslime'
      ? <Slime key={enemy.id} enemy={enemy} selected={selected === enemy.id} />
      : <Enemy key={enemy.id} enemy={enemy} selected={selected === enemy.id} />)}
    {projectiles.map(shot => <Projectile key={shot.id} shot={shot} />)}
  </group>;
}

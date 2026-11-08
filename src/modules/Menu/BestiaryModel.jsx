import { useEffect, useMemo } from 'react';
import { DoubleSide } from 'three';
import { ENEMY_TYPES } from '../../static/enemies';
import { defenseConfig, potionTypes, shopItems } from '../../static/themedConfigs';
import { theme } from '../../static/theme';
import CauldronModel from '../Pot/CauldronModel';
import { CAULDRON } from '../Pot/cauldronGeometry';
import { createArenaEnemyGeometry } from '../Defense/arenaEnemyGeometry';
import { createIngredientGeometry } from '../Ingredients/ingredientGeometry';
import { createPotionGeometry } from '../Potions/potionGeometry';
import { createCoinGeometry, createCoinSymbols } from '../Defense/coinGeometry';
import { bestiaryColor } from './bestiaryAppearance';

// Preview-owned buffers cannot dispose the cached geometry used by live games.
function useGeometry(factory, variant) {
  const geometry = useMemo(() => factory(variant), [factory, variant]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

function ArenaEnemyModel({ type, color }) {
  const enemy = defenseConfig.enemies[type];
  const shape = type === 'flyerFire' || type === 'flyerFrost' ? 'flyer' : enemy.shape;
  const geometry = useGeometry(createArenaEnemyGeometry, shape);
  const scale = shape === 'slime' ? [enemy.size * 1.3, enemy.size * .7, enemy.size] : enemy.size;
  return <mesh geometry={geometry} scale={scale}>
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={type === 'sentinel' ? .6 : .18} roughness={.4} flatShading={shape !== 'slime'} />
  </mesh>;
}

function BrewingEnemyModel({ type, color }) {
  if (type === 'enemyslime') return <>
    <mesh scale={[1.15, .7, .65]}>
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial color={color} transparent opacity={.58} roughness={.2} emissive={color} emissiveIntensity={.18} depthWrite={false} />
    </mesh>
    {[-.3, .3].map(x => <mesh key={x} position={[x, .18, .62]}>
      <sphereGeometry args={[.085, 12, 8]} /><meshBasicMaterial color={theme.colors.slimeEye} />
    </mesh>)}
  </>;
  return <group rotation={[.18, .2, 0]}>
    <mesh><boxGeometry args={[.55, .55, .55]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} toneMapped={false} /></mesh>
    <mesh scale={1.45}><boxGeometry args={[.55, .55, .55]} />
      <meshBasicMaterial color={color} transparent opacity={.12} depthWrite={false} /></mesh>
  </group>;
}

function IngredientModel({ id, color }) {
  const geometry = useGeometry(createIngredientGeometry, id);
  return <mesh geometry={geometry} scale={2.8}>
    <meshStandardMaterial color={color} roughness={1} flatShading side={DoubleSide} />
  </mesh>;
}

function PotionModel({ id, color }) {
  const potion = potionTypes.find(item => item.id === id);
  const geometry = useMemo(() => createPotionGeometry(potion.model), [potion.model]);
  useEffect(() => () => { geometry.body.dispose(); geometry.stopper.dispose(); }, [geometry]);
  return <group scale={1.8} position={[0, -.9, 0]}>
    <mesh geometry={geometry.body}><meshStandardMaterial color={color} roughness={.38} metalness={.05} flatShading /></mesh>
    <mesh geometry={geometry.stopper}><meshStandardMaterial color={theme.colors.qualityBasic} roughness={.6} flatShading /></mesh>
  </group>;
}

function CoinModel({ currency }) {
  const geometry = useMemo(() => ({ body: createCoinGeometry(), ...createCoinSymbols() }), []);
  useEffect(() => () => Object.values(geometry).forEach(part => part.dispose()), [geometry]);
  return <>{(currency ? [1] : [1, -1]).map((side, index) => <group key={side}
    position={[currency ? 0 : index ? .65 : -.65, 0, 0]} rotation={[side * Math.PI / 2, 0, 0]}>
    <mesh geometry={geometry.body}><meshStandardMaterial color={theme.colors.coin} metalness={.65} roughness={.42} flatShading /></mesh>
    {!currency && <mesh geometry={side === 1 ? geometry.spiral : geometry.bones}>
      <meshStandardMaterial color={theme.colors.arenaWoodLine} side={DoubleSide} flatShading />
    </mesh>}
  </group>)}</>;
}

function CrystalModel({ color }) {
  return <group position={[0, -.9, 0]}>
    <mesh position={[0, .18, 0]}><cylinderGeometry args={[1.1, 1.3, .35, 8]} />
      <meshStandardMaterial color={theme.colors.crystalBase} metalness={.5} roughness={.4} /></mesh>
    <mesh position={[0, 1.1, 0]}><octahedronGeometry args={[.85, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={.6} metalness={.3} roughness={.1} /></mesh>
  </group>;
}

export default function BestiaryModel({ model }) {
  const color = bestiaryColor(model);
  if (model.kind === 'arenaEnemy') return <ArenaEnemyModel type={model.type} color={color} />;
  if (model.kind === 'brewingEnemy') return <BrewingEnemyModel type={model.type} color={color} />;
  if (model.kind === 'ingredient') return <IngredientModel id={model.id} color={color} />;
  if (model.kind === 'potion') return <PotionModel id={model.id} color={color} />;
  if (model.kind === 'coin') return <CoinModel currency={model.id === 'stones'} />;
  if (model.kind === 'pot') return <group rotation={[CAULDRON.tilt, 0, 0]}><CauldronModel color={color} warmth={0} /></group>;
  if (model.kind === 'crystal') return <CrystalModel color={color} />;
  if (model.kind === 'wand') {
    const item = shopItems.find(item => item.id === model.id);
    return <mesh rotation={[0, 0, -.2]}><boxGeometry args={[.1, 2.5, .02]} />
      <meshStandardMaterial color={color} emissive={item?.emissive ?? color} emissiveIntensity={.5} /></mesh>;
  }
  if (model.kind === 'card') return <>
    <mesh><planeGeometry args={[1.3, 1.85]} /><meshStandardMaterial color={theme.colors.button} side={DoubleSide} /></mesh>
    <mesh position={[0, 0, .03]}><octahedronGeometry args={[.65, 0]} /><meshStandardMaterial color={color} flatShading /></mesh>
  </>;
  if (model.kind === 'projectile') {
    const brewing = model.type === 'brewingCold' || model.type === 'brewingFire';
    return <group rotation={[.3, .4, .1]}><mesh>
      {brewing ? <boxGeometry args={[.65, .65, .65]} /> : <octahedronGeometry args={[.65, 0]} />}
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.1} flatShading />
    </mesh></group>;
  }
  return <mesh><boxGeometry args={[.6, .6, .6]} /><meshStandardMaterial color={ENEMY_TYPES.enemycold.color} /></mesh>;
}

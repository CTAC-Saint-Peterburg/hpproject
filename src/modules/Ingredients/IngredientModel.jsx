import { BackSide, DoubleSide } from 'three';
import { theme } from '../../static/theme';
import brewing from '../../static/brewing.json';
import { getIngredientGeometry, INGREDIENT_MODEL_SIZE } from './ingredientGeometry';

// The shelf, the held ingredient and the falling ingredient use the same mesh.
export default function IngredientModel({ id, color, selected = false, materialRef, ref, onClick, raycast, position,
  emissiveIntensity = 0 }) {
  const geometry = getIngredientGeometry(id);
  const flat = id === 1 || id === 5;
  return <mesh ref={ref} geometry={geometry} position={position}
    scale={brewing.ingredientSize / INGREDIENT_MODEL_SIZE} onClick={onClick} raycast={raycast}>
    <meshStandardMaterial ref={materialRef} color={color} emissive={color} emissiveIntensity={emissiveIntensity}
      roughness={1} metalness={0} flatShading side={flat ? DoubleSide : undefined} transparent />
    {selected && <mesh geometry={geometry} scale={1.1}
      position={flat ? [0, 0, -.012] : undefined} raycast={() => null}>
      <meshBasicMaterial color={theme.colors.white} side={flat ? DoubleSide : BackSide} />
    </mesh>}
  </mesh>;
}

import { Line } from "@react-three/drei";
import { settings } from '../Wand/effectSettings';

export function SpellTrail({ points }) {
  if (points.length < 2) return null;
  
  // Преобразуем 2D точки в 3D для сцены
  const linePoints = points.map(p => [p.x * 5, p.y * 5, 1]);
  
  return (
    <Line 
      points={linePoints}
      color={settings.drawing.color}
      lineWidth={settings.drawing.lineWidth}
      transparent
      opacity={settings.drawing.opacity}
    />
  );
}

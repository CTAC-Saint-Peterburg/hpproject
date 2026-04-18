import { Line } from "@react-three/drei";

export function SpellTrail({ points }) {
  if (points.length < 2) return null;
  
  // Преобразуем 2D точки в 3D для сцены
  const linePoints = points.map(p => [p.x * 5, 2, p.y * 5]);
  
  return (
    <Line 
      points={linePoints}
      color="gold" 
      lineWidth={3}
      transparent
      opacity={0.9}
    />
  );
}
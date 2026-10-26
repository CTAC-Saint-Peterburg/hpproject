import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { settings } from '../Wand/effectSettings';

export function SpellTrail({ points }) {
  const { viewport, camera } = useThree();
  const plane = useMemo(() => new Vector3(0, 0, 1), []);
  if (points.length < 2) return null;
  const view = viewport.getCurrentViewport(camera, plane);
  const linePoints = points.map(p => [p.x * view.width / 2, p.y * view.height / 2, 1]);
  return <Line points={linePoints} color={settings.drawing.color} lineWidth={settings.drawing.lineWidth}
    transparent opacity={settings.drawing.opacity} raycast={() => null} />;
}

import { useThree, useFrame } from "@react-three/fiber";
import { useRef } from "react";

export function MouseTracker({ onUpdate, onPosChange }) {
  const { mouse } = useThree();
  const prevMouseRef = useRef({ x: 0, y: 0 });

  useFrame(() => {
    const roundedX = Math.round(mouse.x * 100) / 100;
    const roundedY = Math.round(mouse.y * 100) / 100;
    
    if (
      Math.abs(roundedX - prevMouseRef.current.x) > 0.01 ||
      Math.abs(roundedY - prevMouseRef.current.y) > 0.01
    ) {
      const newPos = { x: roundedX, y: roundedY };
      prevMouseRef.current = newPos;
      
      if (onUpdate) onUpdate(newPos);
      if (onPosChange) onPosChange(newPos);  // Обновление глобального state
    }
  });

  return null;
}
import { useThree, useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";

export function MouseTracker({ onUpdate, onPosChange }) {
  const { mouse, gl } = useThree();
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const isDownRef = useRef(false);
  const prevIsDownRef = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;
    
    const handleDown = () => { isDownRef.current = true; };
    const handleUp = () => { isDownRef.current = false; };
    const handleLeave = () => { isDownRef.current = false; };
    
    canvas.addEventListener('mousedown', handleDown);
    canvas.addEventListener('mouseup', handleUp);
    canvas.addEventListener('mouseleave', handleLeave);
    
    return () => {
      canvas.removeEventListener('mousedown', handleDown);
      canvas.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('mouseleave', handleLeave);
    };
  }, [gl]);

  useFrame(() => {
    const roundedX = Math.round(mouse.x * 100) / 100;
    const roundedY = Math.round(mouse.y * 100) / 100;
    
    const hasMoved = Math.abs(roundedX - prevMouseRef.current.x) > 0.005 ||
                     Math.abs(roundedY - prevMouseRef.current.y) > 0.005;
    
    const isDownChanged = isDownRef.current !== prevIsDownRef.current;
    
    // 👇 Отправляем обновление при нажатии ИЛИ при изменении состояния кнопки
    if (isDownRef.current || isDownChanged || hasMoved) {
      const newPos = { 
        x: roundedX, 
        y: roundedY,
        isDown: isDownRef.current
      };
      
      prevMouseRef.current = { x: roundedX, y: roundedY };
      prevIsDownRef.current = isDownRef.current;
      
      if (onUpdate) onUpdate(newPos);
      if (onPosChange) onPosChange({ x: roundedX, y: roundedY });
    }
  });

  return null;
}
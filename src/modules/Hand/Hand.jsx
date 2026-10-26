// src/components/Hand/Hand.js
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Базовая позиция общей модели руки в локальной системе сцены/рига.
const HAND_BASE_POSITION = [-0.64, -0.92, 3.68];

export const Hand = ({ mousePos, aimTarget }) => {
  const meshRef = useRef();
  const target = useRef(new THREE.Vector3());

  useFrame(() => {
    if (!meshRef.current || (!mousePos && !aimTarget)) return;

    if (aimTarget) {
      meshRef.current.lookAt(aimTarget.current);
      meshRef.current.rotateX(-Math.PI / 2);
      return;
    }

    const targetX = mousePos.x * 10;
    const targetY = mousePos.y * 5;
    const targetZ = -15;

    target.current.set(targetX, targetY, targetZ);
    meshRef.current.lookAt(target.current);
    meshRef.current.rotateX(-Math.PI / 2);
  }, -2);

  return (
    <mesh 
      ref={meshRef} 
      position={HAND_BASE_POSITION}
    >
      <boxGeometry args={[0.4, 2, 0.3]} />
      <meshStandardMaterial color="pink" />
    </mesh>
  );
};

// src/components/Hand/Hand.js
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { settings } from '../Wand/effectSettings';

// Базовая позиция общей модели руки в локальной системе сцены/рига.

export const Hand = ({ mousePos, aimTarget, attached = false }) => {
  const meshRef = useRef();
  const target = useRef(new THREE.Vector3());

  useFrame(() => {
    if (attached || !meshRef.current || (!mousePos && !aimTarget)) return;

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
      position={attached ? [0, 0, 0] : settings.handRig.position}
    >
      <boxGeometry args={settings.handRig.handSize} />
      <meshStandardMaterial color="pink" />
    </mesh>
  );
};

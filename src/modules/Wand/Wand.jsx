// src/components/Wand/Wand.js
import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { WandParticles } from "./WandParticles";

export const Wand = () => {
  const meshRef = useRef();
  const particlesRef = useRef();  // Ref к системе частиц
  const { mouse } = useThree();

  // Ref для хранения позиции кончика палочки (без ре-рендеров)
  const tipPositionRef = useRef(new THREE.Vector3(1, 1.5, 1.1));

  useFrame(() => {
    if (!meshRef.current) return;

    // === Наклон палочки ===
    const targetX = mouse.y * 0.15;
    const targetY = mouse.x * 0.15;
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (num, min, max) => Math.max(min, Math.min(max, num));

    meshRef.current.rotation.x = lerp(meshRef.current.rotation.x, targetX, 0.08);
    meshRef.current.rotation.y = lerp(meshRef.current.rotation.y, targetY, 0.08);
    meshRef.current.rotation.x = clamp(meshRef.current.rotation.x, -0.15, 0.15);
    meshRef.current.rotation.y = clamp(meshRef.current.rotation.y, -0.15, 0.15);

    // === Вычисляем позицию кончика палочки ===
    const endOffset = new THREE.Vector3(0, 1.25, 0);  // Верх палочки (половина высоты + небольшой зазор)
    endOffset.applyQuaternion(meshRef.current.quaternion);  // Поворачиваем оффсет вместе с палочкой
    endOffset.add(meshRef.current.position);  // Прибавляем позицию палочки

    // Сохраняем в ref
    tipPositionRef.current.copy(endOffset);

    // ✅ Передаём позицию в частицы через ref (без setState!)
    if (particlesRef.current?.updatePosition) {
      particlesRef.current.updatePosition(endOffset.toArray());
    }
  });

  return (
    <group position={[-1.98, -0.3, 1.2]}>
      {/* Палочка */}
      <mesh ref={meshRef} position={[1, 0, 1]}>
        <boxGeometry args={[0.1, 2.5, 0.02]} />
        <meshStandardMaterial color="brown" emissive="#331100" emissiveIntensity={0.5} />
      </mesh>

      {/* Частицы — привязываем ref */}
      <WandParticles
        ref={particlesRef}
        position={tipPositionRef.current.toArray()}  // Начальная позиция
        emitRate={25}
        color="#ffff88"
        particleSize={0.05}
        lifetime={1.2}
        maxParticles={40}
      />
    </group>
  );
};

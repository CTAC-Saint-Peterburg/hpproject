// src/components/Wand/Wand.js
import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { WandParticles } from "./WandParticles";

export const Wand = () => {
  const meshRef = useRef();
  const particlesRef = useRef();
  const { mouse } = useThree();

  const tipPositionRef = useRef(new THREE.Vector3(1, 1.5, 1.1));
  const timeRef = useRef(0);
  
  // 🔥 Ref для плавного следования позиции по X
  const currentXRef = useRef(0); // Текущая позиция (начинаем с 0)

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    timeRef.current += delta;

    // === 🎯 Наклон палочки за мышью ===
    const targetTiltX = mouse.y * 0.40;
    const targetTiltY = mouse.x * 0.20;
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (num, min, max) => Math.max(min, Math.min(max, num));

    // === 🌊 Покачивание (sway) ===
    const swayAmplitude = 0.1;
    const swayFrequency = 2;
    const swayOffset = Math.sin(timeRef.current * swayFrequency * Math.PI * 2) * swayAmplitude;
    
    const isMoving = Math.abs(mouse.x) > 0.1 || Math.abs(mouse.y) > 0.1;
    const finalTargetTiltX = targetTiltX + (isMoving ? swayOffset : 0);

    // Применяем вращение
    meshRef.current.rotation.x = lerp(meshRef.current.rotation.x, finalTargetTiltX, 0.08);
    meshRef.current.rotation.y = lerp(meshRef.current.rotation.y, targetTiltY, 0.08);
    meshRef.current.rotation.x = clamp(meshRef.current.rotation.x, -0.15, 0.15);
    meshRef.current.rotation.y = clamp(meshRef.current.rotation.y, -0.15, 0.15);

    // === ➡️ НОВОЕ: Плавное следование по оси X ===
    // mouse.x: от -1 (слева) до 1 (справа)
    // Умножаем на 0.4 — амплитуда смещения в мировых единицах (подберите под свою сцену)
    const targetX = mouse.x * 0.4;
    
    // Плавная интерполяция текущей позиции к целевой (0.05 = очень плавно)
    currentXRef.current = lerp(currentXRef.current, targetX, 0.05);
    
    // Применяем смещение к позиции меша (Y и Z остаются на месте)
    meshRef.current.position.x = currentXRef.current;

    // === 🔮 Позиция кончика палочки для частиц ===
    const endOffset = new THREE.Vector3(0, 1.25, 0);
    endOffset.applyQuaternion(meshRef.current.quaternion);
    endOffset.add(meshRef.current.position);

    tipPositionRef.current.copy(endOffset);

    if (particlesRef.current?.updatePosition) {
      particlesRef.current.updatePosition(endOffset.toArray());
    }
  });

  return (
    <group position={[-0.7, -0.3, 1.2]}>
      <mesh ref={meshRef} position={[0, 0, 1]}> {/* 👈 Убрали фиксированный X=1, теперь управляем через useFrame */}
        <boxGeometry args={[0.1, 2.5, 0.02]} />
        <meshStandardMaterial color="brown" emissive="#331100" emissiveIntensity={0.5} />
      </mesh>

      <WandParticles
        ref={particlesRef}
        position={tipPositionRef.current.toArray()}
        emitRate={25}
        color="#ffff88"
        particleSize={0.05}
        lifetime={1.2}
        maxParticles={40}
      />
    </group>
  );
};
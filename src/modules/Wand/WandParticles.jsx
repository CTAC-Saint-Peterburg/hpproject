// src/components/WandParticles/WandParticles.js
import React, { useRef, useMemo, useCallback, forwardRef, useImperativeHandle } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Отдельная частица
 */
const Particle = ({ position, size, color, lifetime, onDeath }) => {
  const meshRef = useRef();
  
  const params = useMemo(() => {
    const hue = Math.random() * 0.1 - 0.05;
    return {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        Math.random() * 0.03 + 0.02,
        (Math.random() - 0.5) * 0.02
      ),
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      baseColor: new THREE.Color(color),
      hueOffset: hue,
      startTime: Date.now(),
      lifetime: lifetime * 1000,
      startScale: size,
      endScale: size * 0.3,
    };
  }, [color, size, lifetime]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const elapsed = Date.now() - params.startTime;
    const progress = Math.min(elapsed / params.lifetime, 1);

    if (progress >= 1) {
      onDeath?.();
      return;
    }

    // Движение
    meshRef.current.position.add(params.velocity.clone().multiplyScalar(delta * 60));
    
    // Вращение
    meshRef.current.rotation.y += params.rotationSpeed;
    meshRef.current.rotation.x += params.rotationSpeed * 0.5;

    // Масштаб и прозрачность
    const currentScale = THREE.MathUtils.lerp(params.startScale, params.endScale, progress);
    meshRef.current.scale.setScalar(currentScale);
    
    const opacity = 1 - progress;
    const flicker = 0.8 + Math.sin(elapsed * 0.02) * 0.2;
    
    if (meshRef.current.material) {
      meshRef.current.material.opacity = opacity * flicker;
      meshRef.current.material.color.copy(params.baseColor).offsetHSL(params.hueOffset, 0, progress * 0.1);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={1}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

/**
 * Система частиц — БЕЗ group-обёртки с position
 */
const WandParticles = forwardRef(({
  position = [0, 0, 0],  // Мировая позиция эмиссии
  particleSize = 0.08,
  color = "#ffaa00",
  lifetime = 1.5,
  emitRate = 15,
  maxParticles = 50
}, ref) => {
  const emitTimer = useRef(0);
  const [particles, setParticles] = React.useState([]);
  
  // Ref для текущей позиции эмиссии (чтобы не вызывать setState каждый кадр)
  const emitPositionRef = useRef(new THREE.Vector3(...position));

  // Обновляем позицию эмиссии через ref
  useImperativeHandle(ref, () => ({
    updatePosition: (newPos) => {
      emitPositionRef.current.set(...newPos);
    },
    getParticleCount: () => particles.length
  }));

  const spawnParticle = useCallback(() => {
    if (particles.length >= maxParticles) return;
    
    const id = Math.random().toString(36).substr(2, 9);
    
    // Случайный оффсет вокруг точки эмиссии
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1
    );
    
    // ✅ Позиция = точка эмиссии + маленький случайный оффсет
    const newPos = emitPositionRef.current.clone().add(offset);
    
    setParticles(prev => [...prev, {
      id,
      position: newPos.toArray(),  // Мировые координаты
      size: particleSize * (0.8 + Math.random() * 0.4),
      color,
      lifetime
    }]);
  }, [particles.length, maxParticles, particleSize, color, lifetime]);

  const removeParticle = useCallback((id) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  }, []);

  useFrame((state, delta) => {
    emitTimer.current += delta;
    const emitInterval = 1 / emitRate;
    
    while (emitTimer.current >= emitInterval) {
      spawnParticle();
      emitTimer.current -= emitInterval;
    }
  });

  return (
    <>
      {/* ✅ Убрали <group position={...}> — частицы используют мировые координаты напрямую */}
      {particles.map(p => (
        <Particle
          key={p.id}
          position={p.position}
          size={p.size}
          color={p.color}
          lifetime={p.lifetime}
          onDeath={() => removeParticle(p.id)}
        />
      ))}
    </>
  );
});

WandParticles.displayName = 'WandParticles';
export { WandParticles };
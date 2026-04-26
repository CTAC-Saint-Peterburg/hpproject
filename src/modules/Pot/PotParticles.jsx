import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export const PotParticles = ({ 
  count = 20,           // количество частиц
  speed = 0.5,          // скорость подъёма
  spread = 0.3,         // разброс по X и Z
  color = "#c02a52",    // цвет частиц
  size = 0.05,          // размер частицы
  lifetime = 2,         // время жизни частицы (сек)
  position = [0, 0, 0]  // позиция эмиссии (центр котла)
}) => {
  const particlesRef = useRef()
  
  // Создаём данные частиц
  const particlesData = useMemo(() => {
    const data = []
    for (let i = 0; i < count; i++) {
      data.push({
        x: (Math.random() - 0.5) * spread,
        y: Math.random() * 0.1,  // начинаем чуть выше центра
        z: (Math.random() - 0.5) * spread,
        vy: Math.random() * speed + 0.2,  // случайная скорость вверх
        life: Math.random() * lifetime,   // случайное время жизни
        maxLife: lifetime
      })
    }
    return data
  }, [count, speed, spread, lifetime])

  // Обновляем частицы каждый кадр
  useFrame((state, delta) => {
    if (!particlesRef.current) return
    
    const positions = particlesRef.current.geometry.attributes.position.array
    
    particlesData.forEach((particle, i) => {
      // Двигаем вверх
      particle.y += particle.vy * delta
      
      // Добавляем небольшое колебание по X и Z
      particle.x += Math.sin(state.clock.elapsedTime * 2 + i) * 0.001
      particle.z += Math.cos(state.clock.elapsedTime * 2 + i) * 0.001
      
      // Уменьшаем жизнь
      particle.life -= delta
      
      // Если частица "умерла" — респаун внизу
      if (particle.life <= 0 || particle.y > 2) {
        particle.y = -0.2 + Math.random() * 0.1
        particle.x = (Math.random() - 0.5) * spread
        particle.z = (Math.random() - 0.5) * spread
        particle.life = lifetime
        particle.vy = Math.random() * speed + 0.2
      }
      
      // Обновляем позицию
      positions[i * 3] = particle.x
      positions[i * 3 + 1] = particle.y
      positions[i * 3 + 2] = particle.z
    })
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={particlesRef} position={position}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={new Float32Array(count * 3)}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  )
}
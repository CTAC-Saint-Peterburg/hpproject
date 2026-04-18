import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export const Bottle = ({ 
  cords, 
  id, 
  color, 
  isFollowMode, 
  mousePos, 
  isSelected, 
  onToggle 
}) => {
  const meshRef = useRef()
  const { camera } = useThree()
  const vec = useRef(new THREE.Vector3())
  
  // Исходная позиция и целевая (для lerp)
  const initialPos = useRef(new THREE.Vector3(...cords))
  const targetPos = useRef(new THREE.Vector3(...cords))

  useFrame(() => {
    if (!meshRef.current) return

    // 🔥 Только выбранный объект следует за мышью, если включён режим
    if (isFollowMode && isSelected && mousePos) {
      // Конвертация 2D → 3D координат
      vec.current.set(mousePos.x, mousePos.y, 0.5)
      vec.current.unproject(camera)
      // Сохраняем исходный Z из cords, чтобы не улетал в глубину
      targetPos.current.set(vec.current.x, vec.current.y, cords[2])
    } else {
      // Возврат на стартовую позицию
      targetPos.current.copy(initialPos.current)
    }

    // Плавное движение (0.15 = скорость, 0.05 = медленнее, 0.3 = быстрее)
    meshRef.current.position.lerp(targetPos.current, 0.15)
  })

  return (
    <mesh ref={meshRef} onClick={onToggle}>
      <boxGeometry />
      <meshStandardMaterial color={color} />
      
      {/* Обводка только для выбранного */}
      {isSelected && (
        <mesh scale={1.05} raycast={() => []}>
          <boxGeometry />
          <meshBasicMaterial color="white" side={THREE.BackSide} />
        </mesh>
      )}
    </mesh>
  )
}
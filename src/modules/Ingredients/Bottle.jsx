import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export const Bottle = ({ 
  cords, 
  id, 
  color, 
  isFollowMode, 
  mousePos, 
  isSelected, 
  onToggle,
  invertY = false  // ← По умолчанию false, если Y уже инвертирован в mousePos
}) => {
  const meshRef = useRef()
  const { camera, size } = useThree()
  
  // 🔧 Вспомогательные объекты (создаём один раз)
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const mouseNDC = useMemo(() => new THREE.Vector2(), [])
  const initialPos = useMemo(() => new THREE.Vector3(...cords), [cords])
  const targetPos = useRef(new THREE.Vector3(...cords))
  
  // 🐛 Проверка валидности входных данных
  const hasValidMouse = mousePos?.x !== undefined && 
                        mousePos?.y !== undefined && 
                        size?.width > 0 && 
                        size?.height > 0

  useFrame(() => {
    if (!meshRef.current) return

    // 🔹 Возврат на стартовую позицию, если не в режиме следования
    if (!isFollowMode || !isSelected || !hasValidMouse) {
      targetPos.current.copy(initialPos)
      meshRef.current.position.lerp(targetPos.current, 0.15)
      return
    }

    // 🔄 Конвертация координат мыши → NDC (Normalized Device Coordinates)
    let ndcX, ndcY
    
    // Определяем тип координат и конвертируем
    if (mousePos.x <= 1 && mousePos.y <= 1) {
      // 📐 Вариант: координаты уже нормализованы 0..1
      ndcX = mousePos.x * 2 - 1
      ndcY = (invertY ? -1 : 1) * mousePos.y * 2 + (invertY ? 1 : -1)
    } 
    else if (Math.abs(mousePos.x) <= 1 && Math.abs(mousePos.y) <= 1) {
      // 🎯 Вариант: координаты уже в NDC (-1..+1)
      ndcX = mousePos.x
      ndcY = invertY ? -mousePos.y : mousePos.y
    } 
    else {
      // 🖥️ Вариант: координаты в пикселях (0..width, 0..height)
      ndcX = (mousePos.x / size.width) * 2 - 1
      ndcY = (invertY ? -1 : 1) * (mousePos.y / size.height) * 2 + (invertY ? 1 : -1)
    }
    
    mouseNDC.set(ndcX, ndcY)

    // 🎯 Кастуем луч из камеры через точку мыши
    raycaster.setFromCamera(mouseNDC, camera)
    
    // 📐 Находим точку на луче с нужным Z (глубина бутылки)
    const targetZ = cords[2]
    const rayOriginZ = raycaster.ray.origin.z
    const rayDirZ = raycaster.ray.direction.z
    
    // Защита от деления на ноль (луч параллелен плоскости XY)
    if (Math.abs(rayDirZ) < 0.001) {
      return
    }
    
    // Параметр пересечения луча с плоскостью Z = targetZ
    const t = (targetZ - rayOriginZ) / rayDirZ
    
    if (isFinite(t) && t > 0) {
      // Находим точку пересечения и обновляем целевую позицию
      const point = raycaster.ray.at(t, new THREE.Vector3())
      targetPos.current.copy(point)
    }

    // 🌊 Плавное движение к целевой позиции (lerp)
    meshRef.current.position.lerp(targetPos.current, 0.15)
  })

  // 🐛 Отладка: раскомментируйте при необходимости
  // useEffect(() => {
  //   if (isSelected && mousePos) {
  //     console.log(`🔍 Bottle #${id}:`, {
  //       mousePos,
  //       invertY,
  //       ndc: mouseNDC.clone().toArray(),
  //       target: targetPos.current.clone().toArray()
  //     })
  //   }
  // }, [isSelected, mousePos?.x, mousePos?.y])

  return (
    <mesh ref={meshRef} onClick={onToggle}>
      <boxGeometry />
      <meshStandardMaterial color={color} />
      
      {/* Белая обводка для выбранного объекта */}
      {isSelected && (
        <mesh scale={1.05} raycast={() => null}>
          <boxGeometry />
          <meshBasicMaterial color="white" side={THREE.BackSide} />
        </mesh>
      )}
    </mesh>
  )
}
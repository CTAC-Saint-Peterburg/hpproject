import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// 🔧 Округление с заменой -0 → 0
const roundCoord = (val, decimals = 2) => {
  const factor = Math.pow(10, decimals)
  const rounded = Math.round(val * factor) / factor
  return rounded === 0 ? 0 : rounded
}

const roundArray = (arr, decimals = 2) => 
  arr.map(val => roundCoord(val, decimals))

export const Bottle = ({ 
  cords, 
  id, 
  color, 
  isFollowMode, 
  mousePos, 
  isSelected, 
  onToggle,
  onPositionUpdate,
  invertY = false
}) => {
  const meshRef = useRef()
  const { camera, size } = useThree()
  
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const mouseNDC = useMemo(() => new THREE.Vector2(), [])
  const initialPos = useMemo(() => new THREE.Vector3(...cords), [cords])
  const targetPos = useRef(new THREE.Vector3(...cords))
  
  const lastUpdateRef = useRef(0)
  const lastSentPosRef = useRef(new THREE.Vector3())
  const THROTTLE_MS = 66
  const MIN_DISTANCE = 0.01

  const hasValidMouse = mousePos?.x !== undefined && 
                        mousePos?.y !== undefined && 
                        size?.width > 0 && 
                        size?.height > 0

  useFrame((state) => {
    if (!meshRef.current) return

    if (!isFollowMode || !isSelected || !hasValidMouse) {
      targetPos.current.copy(initialPos)
      meshRef.current.position.lerp(targetPos.current, 0.15)
      return
    }

    // Конвертация координат мыши → NDC
    let ndcX, ndcY
    if (mousePos.x <= 1 && mousePos.y <= 1) {
      ndcX = mousePos.x * 2 - 1
      ndcY = (invertY ? -1 : 1) * mousePos.y * 2 + (invertY ? 1 : -1)
    } else if (Math.abs(mousePos.x) <= 1 && Math.abs(mousePos.y) <= 1) {
      ndcX = mousePos.x
      ndcY = invertY ? -mousePos.y : mousePos.y
    } else {
      ndcX = (mousePos.x / size.width) * 2 - 1
      ndcY = (invertY ? -1 : 1) * (mousePos.y / size.height) * 2 + (invertY ? 1 : -1)
    }
    mouseNDC.set(ndcX, ndcY)

    raycaster.setFromCamera(mouseNDC, camera)
    const targetZ = cords[2]
    const rayOriginZ = raycaster.ray.origin.z
    const rayDirZ = raycaster.ray.direction.z
    
    if (Math.abs(rayDirZ) < 0.001) return
    const t = (targetZ - rayOriginZ) / rayDirZ
    
    if (isFinite(t) && t > 0) {
      const point = raycaster.ray.at(t, new THREE.Vector3())
      targetPos.current.copy(point)
    }

    meshRef.current.position.lerp(targetPos.current, 0.15)

    // 📡 Отправка позиции с троттлингом и округлением
    if (isSelected && isFollowMode && onPositionUpdate) {
      const now = state.clock.getElapsedTime() * 1000
      const currentPos = meshRef.current.position
      
      if (now - lastUpdateRef.current > THROTTLE_MS) {
        const distance = currentPos.distanceTo(lastSentPosRef.current)
        
        if (distance > MIN_DISTANCE) {
          lastUpdateRef.current = now
          lastSentPosRef.current.copy(currentPos)
          
          const roundedPos = roundArray(currentPos.toArray(), 2)
          
          onPositionUpdate({
            id,
            color,
            cords: roundArray(cords, 2),
            currentPos: roundedPos,
            isSelected: true,
            timestamp: Math.round(now)
          })
        }
      }
    }
  })

  return (
    <mesh ref={meshRef} onClick={onToggle}>
      <boxGeometry />
      <meshStandardMaterial color={color} />
      {isSelected && (
        <mesh scale={1.05} raycast={() => null}>
          <boxGeometry />
          <meshBasicMaterial color="white" side={THREE.BackSide} />
        </mesh>
      )}
    </mesh>
  )
}
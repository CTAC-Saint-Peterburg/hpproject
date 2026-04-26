import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { PotParticles } from './PotParticles'

// 🔧 Вспомогательная: 2D расстояние (игнорируем Z)
const getDistance2D = (pos1, pos2) => {
  if (!pos1 || !pos2) return Infinity
  const dx = pos1[0] - pos2[0]
  const dy = pos1[1] - pos2[1]
  return Math.sqrt(dx * dx + dy * dy)
}

// 🔧 Округление с заменой -0 → 0
const roundCoord = (val, decimals = 2) => {
  const factor = Math.pow(10, decimals)
  const rounded = Math.round(val * factor) / factor
  return rounded === 0 ? 0 : rounded
}

const roundArray = (arr, decimals = 2) => 
  arr.map(val => roundCoord(val, decimals))

export const Pot = ({ 
  bottleRadar = [],
  onCollisionEnd,
  collisionThreshold = 0.5,
  bottleRadius = 0.5,
  position = [0, 0, 0],
  levelData = null,
  currentSpell,
  currentStage,
  handleStageChange
}) => {
  const [isCollision, setIsCollision] = useState(false)
  const [isPotSelected, setIsPotSelected] = useState(false)  // ← выделение при клике
  const collidingBottleRef = useRef(null)

  const onCollisionStart = useCallback((data) => {
    console.log('🎯 Ingredient added to pot:', data.id);
    console.log(currentStage, levelData?.stages[currentStage]?.id, data.id)
    if (levelData?.stages[currentStage]?.id === data.id) {
      handleStageChange(prev => prev + 1);
    }
  }, [currentStage, levelData, handleStageChange]);
  
  const effectiveThreshold = useMemo(() => 
    collisionThreshold + bottleRadius, 
    [collisionThreshold, bottleRadius]
  )

  // 🔥 Обработчик клика по котлу
  const handlePotClick = useCallback((event) => {
    event.stopPropagation()
    setIsPotSelected(prev => !prev)
  }, [])

  useEffect(() => {
    const activeBottles = bottleRadar.filter(b => 
      b?.isSelected && Array.isArray(b?.currentPos) && b.currentPos.length === 3
    )

    for (const bottle of activeBottles) {
      const distance = getDistance2D(bottle.currentPos, position)
      
      if (distance < effectiveThreshold) {
        if (!collidingBottleRef.current) {
          const collisionData = {
            id: bottle.id,
            color: bottle.color,
            position: roundArray(bottle.currentPos, 2),
            cords: roundArray(bottle.cords, 2),
            distance2D: roundCoord(distance, 2),
            timestamp: Date.now()
          }
          
          console.log('🔥 POT COLLISION START:', collisionData)
          setIsCollision(true)
          collidingBottleRef.current = bottle.id
          
          if (onCollisionStart) onCollisionStart(collisionData)
        }
        return
      }
    }
    
    if (collidingBottleRef.current !== null) {
      console.log('❌ POT COLLISION END:', {
        bottleId: collidingBottleRef.current,
        timestamp: Date.now()
      })
      
      setIsCollision(false)
      if (onCollisionEnd) {
        onCollisionEnd({ 
          id: collidingBottleRef.current,
          reason: 'left_zone'
        })
      }
      collidingBottleRef.current = null
    }
    
  }, [bottleRadar, position, effectiveThreshold, onCollisionStart, onCollisionEnd])

  return (
    <group position={[0, 0, 0]}>
    <mesh 
      position={position} 
      onClick={handlePotClick}
    >
      <boxGeometry />
      
      <meshStandardMaterial 
        color={
          isPotSelected 
            ? "#00ff00"      // 🟢 зелёный при выделении
            : isCollision 
              ? "#ff3333"    // 🔴 красный при коллизии
              : "#00f500"    // 🟢 обычный зелёный
        } 
      />
      
      {/* 🔥 Красная обводка при коллизии */}
      {isCollision && !isPotSelected && (
        <mesh scale={1.12} raycast={() => null}>
          <boxGeometry />
          <meshBasicMaterial 
            color="#ff0000" 
            side={THREE.BackSide} 
            transparent 
            opacity={0.85} 
          />
        </mesh>
      )}
      
      {/* 🟢 Зелёная обводка при клике */}
      {isPotSelected && (
        <mesh scale={1.15} raycast={() => null}>
          <boxGeometry />
          <meshBasicMaterial 
            color="#00ff00" 
            side={THREE.BackSide} 
            transparent 
            opacity={0.9} 
          />
        </mesh>
      )}
    </mesh>
     <PotParticles 
        count={30}
        speed={0.8}
        spread={0.4}
        color="#e9e915"
        size={0.08}
        lifetime={2.5}
        position={[0, -0.8, 0]}
      />
    </group>
  )
}
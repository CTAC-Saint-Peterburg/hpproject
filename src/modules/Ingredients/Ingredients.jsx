import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SPAWN_BOTTLES_CORDS } from '../../static/constants'
import { Bottle } from './Bottle'

export const Ingredients = ({ 
  isFollowMode = false,
  mousePos,
  disabled,
  spell 
}) => {
  // Стейт хранит id выбранного объекта (null = ничего не выбрано)
  const [selectedId, setSelectedId] = useState(null)

  // Режим следования активен только когда spell === 3
  const followActive = spell === 3

  return (
    <>
      {SPAWN_BOTTLES_CORDS.map(item => (
        <Bottle
          key={item.id}
          cords={item.cords}
          id={item.id}
          color={item.color}
          isSelected={selectedId === item.id}
          isFollowMode={followActive}
          mousePos={mousePos}
          onToggle={() => {
            if (disabled) return
            // Переключение: если кликнули на уже выбранный — снимаем выделение
            setSelectedId(prev => prev === item.id ? null : item.id)
          }}
        />
      ))}
    </>
  )
}
import { useState } from 'react'
import { SPAWN_BOTTLES_CORDS } from '../../static/constants'
import { Bottle } from './Bottle'

export const Ingredients = ({ 
  isFollowMode = false,
  mousePos,
  disabled,
  spell,
  onPositionUpdate
}) => {
  const [selectedId, setSelectedId] = useState(null)
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
            const newSelected = selectedId === item.id ? null : item.id
            setSelectedId(newSelected)
          }}
          onPositionUpdate={onPositionUpdate}
          invertY={false}
        />
      ))}
    </>
  )
}
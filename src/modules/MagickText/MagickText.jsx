
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

export const MagickText = ({
  position = [0, 0, 0],
  text = 'Magic',
  fontSize = 0.4,
  color = '#ffffff',
  pulseSpeed = 3,        // Частота пульсации (Гц)
  pulseIntensity = 0.15, // Амплитуда: 0.1 = еле заметно, 0.3 = сильно
  glowColor = '#ffff88', // Цвет свечения (опционально)
//   font = 'https://fonts.gstatic.com/s/mediumpurple/v14/JTUSjIg69CK48gW7PXoo9Wlhzg.woff', // Путь к файлу шрифта
  ...props
}) => {
  const textRef = useRef()

  const spellNames = {
    1: '🔥 Огонь', 2: '🛡️ Щит', 3: '💚 Лечение', 4: '💨 Толчок',
    5: '🌀 Аура', 6: '⚡ Молния', 7: '🦅 Полёт', 8: '📦 Призыв',
    9: '🌀 Телепорт', 10: '👥 Массовое'
  };
  
  // Кэшируем вектор для масштаба (чтобы не создавать новый каждый кадр)
  const scaleVec = useMemo(() => new THREE.Vector3(1, 1, 1), [])

  useFrame((state, delta) => {
    if (!textRef.current) return

    const t = state.clock.elapsedTime
    
    // 🫀 Пульсация через синус: масштаб от 1.0 до 1.15
    const pulse = 1 + Math.sin(t * pulseSpeed * Math.PI * 2) * pulseIntensity
    
    // Плавное изменение масштаба
    scaleVec.set(pulse, pulse, 1) // По Z не масштабируем, чтобы текст не «толстел»
    textRef.current.scale.lerp(scaleVec, 0.1)

    // ✨ Опционально: пульсация свечения (если нужна магия)
    if (textRef.current.material?.emissive) {
      const glow = 0.3 + Math.sin(t * pulseSpeed * Math.PI * 2 + 1) * 0.2
      textRef.current.material.emissiveIntensity = glow
    }
  })

  return (
    <Text
      ref={textRef}
      position={position}
      fontSize={fontSize}
      color={color}
    //   font={font}
      anchorX="center"
      anchorY="middle"
      emissive={glowColor}
      emissiveIntensity={0.3}
      toneMapped={false} // Чтобы свечение не «приглушалось» тональной компрессией
      {...props}
    >
      {spellNames?.[+text] }
    </Text>
  )
}
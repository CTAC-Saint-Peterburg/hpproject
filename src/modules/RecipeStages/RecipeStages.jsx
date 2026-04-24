import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

export const RecipeStages = ({
  // Позиция компонента в 3D пространстве
  position = [0, 1.8, 1],
  
  // Данные уровня: массив этапов и конфиг
  stages = [],
  currentStage = 0,
  
  // Настройки отображения
  baseFontSize = 0.35,      // Размер шрифта для текущего этапа
  fontSizeStep = 0.10,      // Насколько уменьшать шрифт для следующих этапов
  minFontSize = 0.10,       // Минимальный размер шрифта
  
  // Цвета
  currentColor = '#ffd700', // Золотой для текущего этапа
  nextColor = '#88ccff',    // Голубой для следующего
  futureColor = '#888899',  // Серый для далёких этапов
  
  // Анимация
  pulseSpeed = 2,
  pulseIntensity = 0.08,
  
  // Отступы между строками
  lineSpacing = 0.45,
  
  // Управление (для теста)
  enableKeyboardNav = true,
  onStageChange, // callback: (newStageIndex) => void
  
  ...props
}) => {
  const textRefs = useRef([])
  const { camera, gl } = useThree()
  
  // Кэшируем векторы для анимации
  const scaleVec = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const baseScale = useMemo(() => new THREE.Vector3(1, 1, 1), [])

  // 🎹 Обработчик клавиш для тестирования
  useEffect(() => {
    if (!enableKeyboardNav) return
    
    const handleKeyDown = (e) => {
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        const next = Math.min(currentStage + 1, stages.length - 1)
        if (next !== currentStage) onStageChange?.(next)
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault()
        const prev = Math.max(currentStage - 1, 0)
        if (prev !== currentStage) onStageChange?.(prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentStage, stages.length, enableKeyboardNav, onStageChange])

  // 🫀 Анимация пульсации для текущего этапа
  useFrame((state) => {
    const t = state.clock.elapsedTime
    const pulse = 1 + Math.sin(t * pulseSpeed * Math.PI * 2) * pulseIntensity
    
    // Анимация только для текущего этапа (индекс 0 в массиве отображаемых)
    if (textRefs.current[0]) {
      scaleVec.set(pulse, pulse, 1)
      textRefs.current[0].scale.lerp(scaleVec, 0.15)
      
      // Дополнительное свечение для текущего
      if (textRefs.current[0].material) {
        const glow = 0.4 + Math.sin(t * pulseSpeed * Math.PI * 2 + 1) * 0.3
        textRefs.current[0].material.emissiveIntensity = glow
      }
    }
    
    // Плавное появление для остальных
    for (let i = 1; i < textRefs.current.length; i++) {
      if (textRefs.current[i]) {
        const targetScale = 0.95 + Math.sin(t * pulseSpeed * Math.PI * 2 + i) * 0.03
        scaleVec.set(targetScale, targetScale, 1)
        textRefs.current[i].scale.lerp(scaleVec, 0.1)
      }
    }
  })

  // 🔧 Helper: получение цвета для этапа
  const getStageColor = (index) => {
    if (index === 0) return currentColor
    if (index === 1) return nextColor
    return futureColor
  }

  // 🔧 Helper: получение размера шрифта
  const getFontSize = (index) => {
    const size = baseFontSize - index * fontSizeStep
    return Math.max(size, minFontSize)
  }

  // 📋 Формируем данные для отображения (максимум 4 этапа)
  const visibleStages = useMemo(() => {
    const result = []
    for (let i = 0; i < 4; i++) {
      const stageIndex = currentStage + i
      if (stageIndex < stages.length) {
        result.push({
          ...stages[stageIndex],
          displayIndex: i,
          isCurrent: i === 0
        })
      }
    }
    return result
  }, [stages, currentStage])

  if (visibleStages.length === 0) return null

  return (
    <group position={position} {...props}>
      {visibleStages.map((stage, idx) => {
        const yPosition = -idx * lineSpacing
        const fontSize = getFontSize(idx)
        const color = getStageColor(idx)
        const opacity = idx === 0 ? 1 : 0.85 - idx * 0.12
        
        return (
          <Text
            key={stage.name + idx}
            ref={el => textRefs.current[idx] = el}
            position={[0, yPosition, 0]}
            fontSize={fontSize}
            color={color}
            anchorX="center"
            anchorY="middle"
            opacity={opacity}
            emissive={color}
            emissiveIntensity={idx === 0 ? 0.4 : 0.1}
            toneMapped={false}
            depthTest={false} // Всегда поверх остальных объектов
          >
            {idx === 0 ? '✚ ' : '  '}
            {stage.icon} {stage.name}
            {idx === 0 && ' ← сейчас'}
          </Text>
        )
      })}
      
      {/* Подсказка управления (для теста) */}
      {enableKeyboardNav && stages.length > 1 && (
        <Text
          position={[0, -lineSpacing * 4, 0]}
          fontSize={0.12}
          color="#c86e1a"
          anchorX="center"
          anchorY="middle"
          opacity={0.7}
        >
          [+ / -] переключить этап
        </Text>
      )}
    </group>
  )
}
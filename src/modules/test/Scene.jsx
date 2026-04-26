import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { MouseTracker } from "../MouseTrack/MouseTracker";
import { Pot } from "../Pot/Pot";
import { Wand } from "../Wand/Wand";
import { Hand } from "../Hand/Hand";
import { Floor } from "../Floor/Floor";
import { recognizeGesture } from "../Recognaizer/recognaizer";
import { SpellTrail } from "./SpellTrail";
import { Ingredients } from "../Ingredients/Ingredients";
import { POINT_LIGHT_MAIN } from "../../static/constants";
import { MagickText } from "../MagickText/MagickText";
import { RecipeStages } from "../RecipeStages/RecipeStages";
import JSONdata from '../../static/missions.json';

export default function Scene() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const currentPathRef = useRef([]);
  const [currentSpell, setCurrentSpell] = useState(null);
  const [currentStage, setCurrentStage] = useState(0);
  const [levelData, setLevelData] = useState(null);
  const [selectedBottle, setSelectedBottle] = useState(null);

  // 🔥 Обработчик для реального времени
  const handleBottlePositionUpdate = useCallback((data) => {
    setSelectedBottle(prev => {
      if (!prev || prev.id !== data.id) return data;
      return { ...prev, ...data };
    });
  }, []);

  // Очистка при смене заклинания
  useEffect(() => {
    if (currentSpell && currentSpell !== 3) {
      setSelectedBottle(null);
    }
  }, [currentSpell]);

  // 🔥 Формируем «радар» для Pot — только актуальная бутылка
  const bottleRadar = useMemo(() => {
    return selectedBottle?.isSelected ? [selectedBottle] : [];
  }, [selectedBottle]);

  // 🎯 Обработчики от Pot
  const handlePotCollisionStart = useCallback((data) => {
    console.log('🎯 Ingredient added to pot:', data.id);
    // Пример логики: проверка рецепта
    // if (levelData?.stages[currentStage]?.ingredientId === data.id) {
    //   setCurrentStage(prev => prev + 1);
    // }
  }, []);

  const handlePotCollisionEnd = useCallback((data) => {
    console.log('👋 Bottle left pot:', data.id);
  }, []);

  // Обработчик смены этапа
  const handleStageChange = (newIndex) => {
    setCurrentStage(newIndex);
  };
  
  const handleMouseUpdate = (pos) => {
    if (pos.isDown) {
      currentPathRef.current.push({ x: pos.x, y: pos.y });
    } else if (currentPathRef.current.length >= 3) {
      console.log('🔍 Распознаём жест, точек:', currentPathRef.current.length);
      const spell = recognizeGesture(currentPathRef.current, {
        minPoints: 3,
        horizontalRatio: 2.0,
        verticalRatio: 2.0,
        threshold: 0.5
      });
      console.log('✨ Результат:', spell);
      if (spell) {
        setCurrentSpell(spell);
        const spellNames = {
          1: '🔥 Огонь', 2: '🛡️ Щит', 3: '💚 Лечение', 4: '💨 Толчок',
          5: '🌀 Аура', 6: '⚡ Молния', 7: '🦅 Полёт', 8: '📦 Призыв',
          9: '🌀 Телепорт', 10: '👥 Массовое'
        };
        console.log(`🪄 ${spellNames[spell] || `Заклинание #${spell}`}!`);
      }
      currentPathRef.current = [];
    } else {
      currentPathRef.current = [];
    }
  };

  useEffect(() => {
    const data = JSONdata['level_01'];
    if (data) setLevelData(data);
  }, []);

  return (
    <Canvas>
      <MouseTracker 
        onUpdate={handleMouseUpdate}
        onPosChange={setMousePos}
      />
      <ambientLight intensity={0.5} />
      <pointLight position={POINT_LIGHT_MAIN} />
      
      <Floor />
      
      <Pot 
        bottleRadar={bottleRadar}
        onCollisionStart={handlePotCollisionStart}
        onCollisionEnd={handlePotCollisionEnd}
        collisionThreshold={0.5}
        bottleRadius={0.5}
      />
      
      <Hand mousePos={mousePos} /> 
      <Wand mousePos={mousePos} />
      <SpellTrail points={currentPathRef.current} />
      
      <Ingredients 
        mousePos={mousePos} 
        disabled={false} 
        spell={currentSpell} 
        onPositionUpdate={handleBottlePositionUpdate}
      />
      
      <MagickText 
        text={currentSpell}
        fontSize={0.6}
        color="#88f" 
        position={[0, 1.2, 1]} 
        pulseIntensity={0.05}
        opacity={0.6}
      />
      
      {levelData?.stages && (
        <RecipeStages
          stages={levelData.stages}
          currentStage={currentStage}
          onStageChange={handleStageChange}
          position={[-3, 1, 0]}
          baseFontSize={0.3}
          enableKeyboardNav={true}
        />
      )}
    </Canvas>
  );
}
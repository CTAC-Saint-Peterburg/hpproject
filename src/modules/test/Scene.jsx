import React, { useState, useRef } from "react";
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

export default function Scene() {
const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const currentPathRef = useRef([]);
  const [currentSpell, setCurrentSpell] = useState(null);

  const handleMouseUpdate = (pos) => {
    // Собираем точки только когда кнопка нажата
    if (pos.isDown) {
      currentPathRef.current.push({ x: pos.x, y: pos.y });
    } 
    // При отпускании — пытаемся распознать жест
    else if (currentPathRef.current.length >= 3) {
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
  
  // Здесь можно вызвать соответствующий эффект:
  // castSpell(spell);
}
      currentPathRef.current = []; // Очищаем после распознавания
    } 
    // Если точек мало — просто сбрасываем
    else {
      currentPathRef.current = [];
    }
  };

  return (
    <Canvas>
      <MouseTracker 
        onUpdate={handleMouseUpdate}
        onPosChange={setMousePos}
      />
      <ambientLight intensity={0.5} />
      <pointLight position={POINT_LIGHT_MAIN} />
      
      <Floor />
      <Pot />
      <Hand mousePos={mousePos} /> 
      <Wand mousePos={mousePos} />
      <SpellTrail points={currentPathRef.current} />
      <Ingredients mousePos={mousePos} disabled={false} spell={currentSpell} />
    </Canvas>
  );
}
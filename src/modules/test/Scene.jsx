import { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { MouseTracker } from '../MouseTrack/MouseTracker';
import { Pot } from '../Pot/Pot';
import HandWand from '../Wand/HandWand';
import { Floor } from '../Floor/Floor';
import { recognizeGesture } from '../Recognaizer/recognaizer';
import { SpellTrail } from './SpellTrail';
import { Ingredients } from '../Ingredients/Ingredients';
import { RecipeStages } from '../RecipeStages/RecipeStages';
import { useGameStore } from '../Stores/GameStore';
import Enemies from '../Enemies/Enemies';
import { FrameCounter } from '../GameHud';

export default function Scene() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedBottle, setSelectedBottle] = useState(null);
  const path = useRef([]);
  const [trail, setTrail] = useState([]);
  const s = useGameStore();
  const handleMouseUpdate = pos => {
    if (s.status !== 'playing' || pos.cancelled) { path.current = []; setTrail([]); return; }
    if (pos.isDown) { path.current.push({ x: pos.x, y: pos.y }); setTrail([...path.current]); }
    else {
      const points = [...path.current, { x: pos.x, y: pos.y }];
      if (points.length >= 3) {
        const spell = recognizeGesture(points, { aspectRatio: pos.aspectRatio });
        if (spell) {
          s.setCurrentSpell(spell);
          if (spell !== 3) setSelectedBottle(null);
          if (s.isPotSelected && spell === 1) s.changePotTemperature(1);
          if (s.isPotSelected && spell === 2) s.changePotTemperature(-1);
        }
      }
      path.current = []; setTrail([]);
    }
  };
  return <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
    <color attach="background" args={['#484343']} />
    <FrameCounter />
    <Enemies />
    <MouseTracker onUpdate={handleMouseUpdate} onPosChange={setMousePos} />
    <ambientLight intensity={0.6} /><pointLight position={[10, 10, 10]} intensity={100} />
    <Floor />
    <Pot bottleRadar={s.currentSpell === 3 && selectedBottle?.isSelected ? [selectedBottle] : []} />
    <HandWand />
    <SpellTrail points={trail} />
    <Ingredients mousePos={mousePos} disabled={s.status !== 'playing'} onPositionUpdate={setSelectedBottle} />
    <RecipeStages stages={s.mission?.stages || []} currentStage={s.currentStage}
      position={[-3, 1, 0]} baseFontSize={0.24} enableKeyboardNav={false} />
  </Canvas>;
}


import { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { MouseTracker } from '../MouseTrack/MouseTracker';
import { Pot } from '../Pot/Pot';
import HandWand from '../Wand/HandWand';
import BrewingRoom from '../Room/BrewingRoom';
import { recognizeGesture } from '../Recognaizer/recognaizer';
import { SpellTrail } from './SpellTrail';
import { Ingredients } from '../Ingredients/Ingredients';
import { RecipeStages } from '../RecipeStages/RecipeStages';
import { useGameStore } from '../Stores/GameStore';
import Enemies from '../Enemies/Enemies';
import { FrameCounter } from '../GameHud';
import { theme } from '../../static/theme';
import IngredientFlight from '../Ingredients/IngredientFlight';

export default function Scene() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedBottle, setSelectedBottle] = useState(null);
  const path = useRef([]);
  const [trail, setTrail] = useState([]);
  const s = useGameStore();
  useEffect(() => {
    if (s.paused) path.current = [];
  }, [s.paused]);
  const handleMouseUpdate = pos => {
    if (s.status !== 'playing' || s.paused || pos.cancelled) { path.current = []; setTrail([]); return; }
    if (pos.isDown) { path.current.push({ x: pos.x, y: pos.y }); setTrail([...path.current]); }
    else {
      const points = [...path.current, { x: pos.x, y: pos.y }];
      if (points.length >= 3) {
        const spell = recognizeGesture(points, { aspectRatio: pos.aspectRatio });
        if (spell) {
          s.setCurrentSpell(spell);
        }
      }
      path.current = []; setTrail([]);
    }
  };
  return <Canvas dpr={[1, 1.5]} frameloop={s.paused ? 'never' : 'always'} camera={{ position: [0, 0, 10], fov: 60 }}>
    <color attach="background" args={[theme.colors.roomBackground]} />
    <FrameCounter />
    <Enemies />
    <MouseTracker onUpdate={handleMouseUpdate} onPosChange={setMousePos} />
    <BrewingRoom />
    <Pot bottleRadar={s.heldIngredientId === selectedBottle?.id && selectedBottle?.isSelected ? [selectedBottle] : []} />
    <HandWand />
    <SpellTrail points={s.paused ? [] : trail} />
    <Ingredients mousePos={mousePos} disabled={s.status !== 'playing' || s.paused} onPositionUpdate={setSelectedBottle} />
    {s.ingredientFlight && <IngredientFlight key={s.ingredientFlight.sequence} flight={s.ingredientFlight} />}
    <RecipeStages stages={s.mission?.stages || []} currentStage={s.currentStage}
      temperature={s.potTemperature} agitation={s.agitation}
      position={[-3, 1, 0]} />
  </Canvas>;
}


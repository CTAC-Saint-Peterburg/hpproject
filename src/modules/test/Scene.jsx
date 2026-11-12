import { useLayoutEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { MouseTracker } from '../MouseTrack/MouseTracker';
import { Pot } from '../Pot/Pot';
import HandWand from '../Wand/HandWand';
import BrewingRoom from '../Room/BrewingRoom';
import { recognizeGesture } from '../Recognaizer/recognaizer';
import MagicGestureTrail from '../Gestures/MagicGestureTrail';
import { Ingredients } from '../Ingredients/Ingredients';
import { RecipeStages } from '../RecipeStages/RecipeStages';
import { useGameStore } from '../Stores/GameStore';
import Enemies from '../Enemies/Enemies';
import { FrameCounter } from '../GameHud';
import { theme } from '../../static/theme';
import IngredientFlight from '../Ingredients/IngredientFlight';
import brewing from '../../static/brewing.json';
import { useInputStore } from '../Input/inputStore';
import { brewingCameraDepth } from '../Ingredients/ingredientPointer';

function BrewingCameraFit() {
  const { camera, size, invalidate, setSize } = useThree();
  const mode = useInputStore(state => state.mode);
  const aspect = size.width / size.height;
  useLayoutEffect(() => {
    camera.position.set(brewing.scene.cameraPosition[0], brewing.scene.cameraPosition[1], brewingCameraDepth(brewing.scene, aspect, mode === 'touch'));
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
    // R3F otherwise keeps the old viewport when only camera.position changes.
    setSize(size.width, size.height, size.top, size.left); invalidate();
  }, [camera, aspect, mode, invalidate, setSize, size.width, size.height, size.top, size.left]);
  return null;
}

export default function Scene() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedBottle, setSelectedBottle] = useState(null);
  const [trail, setTrail] = useState([]);
  const positions = useRef(new Map());
  const carryInput = useRef({ touch: false, dragging: false, heldId: null, point: null });
  const gestureRef = useRef({ suppressed: false, pointerId: null });
  const s = useGameStore();
  const handleCast = ({ points, aspectRatio }) => {
    const state = useGameStore.getState();
    if (state.status !== 'playing' || state.paused) return;
    const spell = recognizeGesture(points, { aspectRatio });
    if (spell) state.setCurrentSpell(spell);
  };
  return <div style={{ position: 'absolute', inset: 0 }}>
  <Canvas dpr={[1, 1.5]} frameloop={s.paused ? 'never' : 'always'} camera={{ position: brewing.scene.cameraPosition, fov: brewing.scene.cameraFov }}>
    <BrewingCameraFit />
    <color attach="background" args={[theme.colors.roomBackground]} />
    <FrameCounter />
    <Enemies gestureRef={gestureRef} />
    <MouseTracker onStroke={setTrail} onCast={handleCast} onPosChange={setMousePos}
      carryInput={carryInput} positions={positions} gestureRef={gestureRef} enabled={s.status === 'playing' && !s.paused} />
    <BrewingRoom />
    <Pot gestureRef={gestureRef} bottleRadar={s.heldIngredientId === selectedBottle?.id && selectedBottle?.isSelected ? [selectedBottle] : []} />
    <HandWand />
    <Ingredients mousePos={mousePos} carryInput={carryInput} positions={positions} gestureRef={gestureRef}
      disabled={s.status !== 'playing' || s.paused} onPositionUpdate={setSelectedBottle} />
    {s.ingredientFlight && <IngredientFlight key={s.ingredientFlight.sequence} flight={s.ingredientFlight} />}
    <RecipeStages stages={s.mission?.stages || []} currentStage={s.currentStage}
      temperature={s.potTemperature} agitation={s.agitation}
      position={[-3, 1, 0]} />
  </Canvas>
  <MagicGestureTrail points={trail} paused={s.paused} enabled={s.status === 'playing'} />
  </div>;
}


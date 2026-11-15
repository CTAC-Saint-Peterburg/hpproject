import { useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import MainMenu from './MainMenu';
import TriptychModel, { TriptychSparks } from './TriptychModel';
import { finishTriptych, openTriptych, useTriptychStore } from './triptychStore';
import { OPEN_SECONDS } from './triptychState';
import { useReducedMotion } from './useReducedMotion';

export default function TriptychMenu({ activeGame }) {
  const phase = useTriptychStore(s => s.phase);
  const reduced = useReducedMotion();
  const content = useRef();
  useEffect(() => {
    if (phase !== 'opening') return;
    const timeout = setTimeout(finishTriptych, reduced ? 0 : OPEN_SECONDS * 1000);
    return () => clearTimeout(timeout);
  }, [phase, reduced]);
  useEffect(() => {
    if (!activeGame && phase === 'open') content.current?.focus();
  }, [activeGame, phase]);
  if (activeGame && phase !== 'opening') return null;
  return <div className={'triptych-screen triptych-' + phase}>
    {phase !== 'open' ? <>
      <div className="triptych-intro-model" aria-hidden="true"><Canvas frameloop={reduced ? 'demand' : 'always'} camera={{ position: [0, 0, 7.8], fov: 42 }} dpr={[1, 1.5]}>
        <ambientLight intensity={1.8} /><directionalLight position={[3, 4, 5]} intensity={2} />
        <TriptychModel opening={phase === 'opening'} reduced={reduced} /><TriptychSparks reduced={reduced} />
      </Canvas></div>
      {phase === 'closed' && <button className="triptych-title" onClick={openTriptych} autoFocus>Hyped Pot</button>}
    </> : <div className="triptych-content" ref={content} tabIndex={-1}><MainMenu /></div>}
  </div>;
}

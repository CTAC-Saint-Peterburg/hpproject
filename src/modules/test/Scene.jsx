import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { MouseTracker } from "../MouseTrack/MouseTracker";
import { Pot } from "../Pot/Pot";
import { Wand } from "../Wand/Wand";
import { Hand } from "../Hand/Hand";
import { Floor } from "../Floor/Floor";

export default function Scene() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseUpdate = (pos) => {
    console.log(pos, 'pos from Scene');
  };

  return (
    <Canvas>
      <MouseTracker 
        onUpdate={handleMouseUpdate}
        onPosChange={setMousePos}  // Передача в state
      />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      
      {/* Синий куб */}
      <mesh position={[-2.91, 1.52, 0]}>
        <boxGeometry />
        <meshStandardMaterial color="blue" />
      </mesh>
      
      <Floor />
      <Pot />
      <Hand mousePos={mousePos} /> 
      <Wand mousePos={mousePos} />
    </Canvas>
  );
}
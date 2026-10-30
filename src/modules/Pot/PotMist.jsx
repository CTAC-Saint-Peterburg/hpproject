import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DynamicDrawUsage } from 'three';
import { theme } from '../../static/theme';
import { useGameStore } from '../Stores/GameStore';
import { createPotMistBuffers, writePotMistFrame } from './potMistMotion';

// Twenty-four point sprites share one draw call. The tiny textureless shader
// only sizes/fades soft octagonal puffs; it has no noise, texture or light work.
const vertexShader = `
  attribute float puffSize;
  attribute float puffOpacity;
  uniform float pixelScale;
  varying float opacity;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(puffSize * pixelScale / max(.1, -viewPosition.z), 1.0, 72.0);
    opacity = puffOpacity;
  }
`;

const fragmentShader = `
  uniform vec3 color;
  varying float opacity;
  void main() {
    vec2 corner = abs(gl_PointCoord - .5) * 2.0;
    float edge = max(max(corner.x, corner.y), (corner.x + corner.y) * .707107);
    float alpha = opacity * (1.0 - smoothstep(.35, 1.0, edge));
    if (alpha < .002) discard;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

export function PotMist({ warmth = 0, position = [0, .48, 0] }) {
  const points = useRef();
  const time = useRef(0);
  const buffers = useMemo(() => createPotMistBuffers(), []);
  const uniforms = useMemo(() => ({
    color: { value: new Color(theme.colors.potMist) },
    pixelScale: { value: 1 },
  }), []);

  useFrame((frame, rawDelta) => {
    if (!points.current) return;
    const state = useGameStore.getState();
    points.current.visible = state.status === 'playing';
    if (state.status !== 'playing' || state.paused) return;
    time.current += Math.max(0, Math.min(rawDelta, .1));
    const count = writePotMistFrame(buffers, time.current, warmth);
    const geometry = points.current.geometry;
    geometry.setDrawRange(0, count);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.puffSize.needsUpdate = true;
    geometry.attributes.puffOpacity.needsUpdate = true;
    points.current.material.uniforms.pixelScale.value = frame.size.height * frame.gl.getPixelRatio() * Math.abs(frame.camera.projectionMatrix.elements[5]) * .5;
  });

  return <points ref={points} position={position} frustumCulled={false} raycast={() => null} renderOrder={2}>
    <bufferGeometry>
      <bufferAttribute attach="attributes-position" args={[buffers.positions, 3]} usage={DynamicDrawUsage} />
      <bufferAttribute attach="attributes-puffSize" args={[buffers.sizes, 1]} usage={DynamicDrawUsage} />
      <bufferAttribute attach="attributes-puffOpacity" args={[buffers.opacities, 1]} usage={DynamicDrawUsage} />
    </bufferGeometry>
    <shaderMaterial uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader}
      transparent depthWrite={false} toneMapped={false} />
  </points>;
}

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, DynamicDrawUsage, Vector2 } from 'three';
import { theme } from '../../static/theme';
import { useGameStore } from '../Stores/GameStore';
import { createPotMistBuffers, writePotMistFrame, writePotErrorFrame, POT_ERROR_SECONDS } from './potMistMotion';

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
  uniform vec2 viewportPixels;
  uniform float screenFade;
  varying float opacity;
  void main() {
    vec2 corner = abs(gl_PointCoord - .5) * 2.0;
    float edge = max(max(corner.x, corner.y), (corner.x + corner.y) * .707107);
    float alpha = opacity * (1.0 - smoothstep(.35, 1.0, edge));
    vec2 uv = gl_FragCoord.xy / viewportPixels;
    vec2 border = min(uv, 1.0 - uv);
    float fade = smoothstep(.035, .17, border.x) * smoothstep(.035, .17, border.y);
    alpha *= mix(1.0, fade, screenFade);
    if (alpha < .002) discard;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

export function PotMist({ warmth = 0, position = [0, .48, 0], preview = false, strength = 1, phase = 0 }) {
  const points = useRef();
  const time = useRef(0);
  const errorAge = useRef(Infinity);
  const buffers = useMemo(() => createPotMistBuffers(), []);
  const uniforms = useMemo(() => ({
    color: { value: new Color(theme.colors.potMist) },
    pixelScale: { value: 1 },
    viewportPixels: { value: new Vector2(1, 1) },
    screenFade: { value: preview ? 1 : 0 },
  }), [preview]);
  useEffect(() => preview ? undefined : useGameStore.subscribe((state,previous) => {
    if (state.runId !== previous.runId || !state.startGame) errorAge.current=Infinity;
    else if (state.mistakes > previous.mistakes && state.message === 'messages.wrongIngredient') errorAge.current=0;
  }), [preview]);

  useFrame((frame, rawDelta) => {
    if (!points.current) return;
    const state = useGameStore.getState();
    points.current.visible = preview || state.status === 'playing';
    if (!preview && (state.status !== 'playing' || state.paused)) return;
    time.current += Math.max(0, Math.min(rawDelta, .1));
    let count = writePotMistFrame(buffers, time.current + phase, warmth, preview ? strength : 1, preview ? 1.3 : 1);
    errorAge.current += Math.max(0,Math.min(rawDelta,.1));
    const error = errorAge.current < POT_ERROR_SECONDS;
    points.current.material.uniforms.color.value.set(error ? theme.colors.hudRed : theme.colors.potMist);
    if (error) count=writePotErrorFrame(buffers,errorAge.current);
    const geometry = points.current.geometry;
    geometry.setDrawRange(0, count);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.puffSize.needsUpdate = true;
    geometry.attributes.puffOpacity.needsUpdate = true;
    points.current.material.uniforms.pixelScale.value = frame.size.height * frame.gl.getPixelRatio() * Math.abs(frame.camera.projectionMatrix.elements[5]) * .5;
    points.current.material.uniforms.viewportPixels.value.set(frame.size.width * frame.gl.getPixelRatio(), frame.size.height * frame.gl.getPixelRatio());
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

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, CylinderGeometry, DynamicDrawUsage, Float32BufferAttribute, Object3D, OctahedronGeometry, Quaternion, RingGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { theme } from '../../static/theme';
import { MAX_REWARD_COINS, MAX_REWARD_EVENTS, rewardCoinCount, rewardVisualDuration, writeRewardCoinPose, writeRewardFlashPose } from './rewardMotion';

function createRewardCoinGeometry() {
  const source = new CylinderGeometry(1, 1, .18, 8, 1);
  const geometry = source.toNonIndexed();
  source.dispose();
  geometry.rotateX(Math.PI / 2);
  geometry.deleteAttribute('uv');
  const normal = geometry.getAttribute('normal');
  const colors = new Float32Array(normal.count * 3);
  for (let i = 0; i < normal.count; i++) {
    const shade = Math.abs(normal.getZ(i)) > .5 ? 1 : .63;
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = shade;
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

function createRewardFlashGeometry() {
  const core = new OctahedronGeometry(.27, 0);
  const source = new RingGeometry(.38, .46, 8);
  const ring = source.toNonIndexed();
  source.dispose();
  core.deleteAttribute('uv');
  ring.deleteAttribute('uv');
  const geometry = mergeGeometries([core, ring]);
  core.dispose();
  ring.dispose();
  return geometry;
}

// Shared, tiny geometry assets; meshes own their independently cleaned materials.
const coinGeometry = createRewardCoinGeometry();
const flashGeometry = createRewardFlashGeometry();
const OVERLAY_DEPTH = 3;
const COIN_RADIUS_PX = 7;

function refreshInstanceMatrix(mesh) {
  if (mesh.instanceMatrix.usage !== DynamicDrawUsage) mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.instanceMatrix.needsUpdate = true;
}

export default function ArenaRewards({ events = [], time = 0, paused = false, walletRef }) {
  const coins = useRef();
  const flashes = useRef();
  const playback = useRef({ time, paused });
  const scratch = useMemo(() => ({
    matrix: new Object3D(),
    origin: new Vector3(),
    position: new Vector3(),
    spin: new Quaternion(),
    axis: new Vector3(0, 1, 0),
    color: new Color(),
    glow: new Color(theme.colors.magicGlow),
    coinPose: {},
    flashPose: {},
  }), []);

  useFrame(({ camera, gl }) => {
    const coinMesh = coins.current;
    const flashMesh = flashes.current;
    if (!coinMesh || !flashMesh) return;
    if (!paused || !playback.current.paused) playback.current.time = time;
    playback.current.paused = paused;
    const now = playback.current.time;
    coinMesh.count = 0;
    flashMesh.count = 0;
    if (!events.length) return;

    // The camera may be moving towards the wave-end coin. Updating matrices here
    // keeps the HUD-bound stream aligned without changing the camera transform.
    camera.updateMatrixWorld(true);
    const start = Math.max(0, events.length - MAX_REWARD_EVENTS);
    let activeCoinEvents = 0;
    for (let i = start; i < events.length; i++) {
      const event = events[i];
      const age = now - event.time;
      if (event.stones > 0 && age >= 0 && age < rewardVisualDuration(event)) activeCoinEvents++;
    }

    let targetX = .82, targetY = .9, coinRadius = .02;
    let depth = 0;
    if (activeCoinEvents) {
      const canvasRect = gl.domElement.getBoundingClientRect();
      const targetRect = walletRef?.current?.getBoundingClientRect();
      if (canvasRect.width > 0 && canvasRect.height > 0) {
        if (targetRect) {
          targetX = ((targetRect.left + targetRect.width / 2 - canvasRect.left) / canvasRect.width) * 2 - 1;
          targetY = 1 - ((targetRect.top + targetRect.height / 2 - canvasRect.top) / canvasRect.height) * 2;
        }
        coinRadius = COIN_RADIUS_PX * 2 * OVERLAY_DEPTH / (canvasRect.height * camera.projectionMatrix.elements[5]);
      }
      const projection = camera.projectionMatrix.elements;
      depth = (-OVERLAY_DEPTH * projection[10] + projection[14]) / (-OVERLAY_DEPTH * projection[11] + projection[15]);
    }

    const perEventBudget = Math.max(1, Math.floor(MAX_REWARD_COINS / Math.max(1, activeCoinEvents)));
    const matrix = scratch.matrix;
    let coinCount = 0, flashCount = 0;
    for (let i = start; i < events.length; i++) {
      const event = events[i];
      const flashPose = writeRewardFlashPose(event, now, scratch.flashPose);
      if (flashPose.visible && flashCount < MAX_REWARD_EVENTS) {
        matrix.position.fromArray(event.position);
        matrix.quaternion.copy(camera.quaternion);
        matrix.scale.setScalar(flashPose.scale);
        matrix.updateMatrix();
        flashMesh.setMatrixAt(flashCount, matrix.matrix);
        scratch.color.set(event.color || theme.colors.magicGlow).lerp(scratch.glow, .3).multiplyScalar(flashPose.intensity);
        flashMesh.setColorAt(flashCount++, scratch.color);
      }

      const count = rewardCoinCount(event.stones);
      const age = now - event.time;
      if (!count || age < 0 || age >= rewardVisualDuration(event)) continue;
      scratch.origin.fromArray(event.position).project(camera);
      const samples = Math.min(count, perEventBudget);
      for (let sample = 0; sample < samples && coinCount < MAX_REWARD_COINS; sample++) {
        // Under an extreme burst, every death still gets a stream ending with
        // its final coin rather than letting early events consume the whole pool.
        const index = samples === 1 ? count - 1 : Math.floor(sample * (count - 1) / (samples - 1));
        const pose = writeRewardCoinPose(event, index, now, scratch.origin.x, scratch.origin.y, targetX, targetY, scratch.coinPose);
        if (!pose.visible) continue;
        scratch.position.set(pose.x, pose.y, depth).unproject(camera);
        matrix.position.copy(scratch.position);
        scratch.spin.setFromAxisAngle(scratch.axis, pose.spin);
        matrix.quaternion.copy(camera.quaternion).multiply(scratch.spin);
        matrix.scale.setScalar(coinRadius * pose.scale);
        matrix.updateMatrix();
        coinMesh.setMatrixAt(coinCount++, matrix.matrix);
      }
    }

    coinMesh.count = coinCount;
    flashMesh.count = flashCount;
    refreshInstanceMatrix(coinMesh);
    refreshInstanceMatrix(flashMesh);
    if (flashMesh.instanceColor) {
      if (flashMesh.instanceColor.usage !== DynamicDrawUsage) flashMesh.instanceColor.setUsage(DynamicDrawUsage);
      flashMesh.instanceColor.needsUpdate = true;
    }
  });

  return <>
    <instancedMesh ref={flashes} geometry={flashGeometry} args={[null, null, MAX_REWARD_EVENTS]} count={0}
      frustumCulled={false} raycast={() => null} renderOrder={10}>
      <meshBasicMaterial color={theme.colors.white} transparent opacity={.9} blending={AdditiveBlending}
        depthWrite={false} toneMapped={false} />
    </instancedMesh>
    <instancedMesh ref={coins} geometry={coinGeometry} args={[null, null, MAX_REWARD_COINS]} count={0}
      frustumCulled={false} raycast={() => null} renderOrder={1000}>
      <meshBasicMaterial color={theme.colors.coin} vertexColors transparent depthTest={false} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  </>;
}

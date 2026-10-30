import { memo, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { theme } from '../../static/theme';
import { createBrewingRoomGeometry, ROOM } from './roomGeometry';
import { createArenaRoomGeometry } from './arenaRoomGeometry';
import { createWorkshopPropsGeometry } from './workshopPropsGeometry';

const ignoreRaycast = () => null;

export default memo(function CastleRoom({ variant = 'brewing', lighting = true, furniture = true }) {
  const viewportWidth = useThree(state => state.viewport.width);
  const aspect = useThree(state => state.size.width / state.size.height);
  const halfWidth = variant === 'arena' ? 0 : Math.min(ROOM.maxHalfWidth, Math.max(ROOM.minHalfWidth, viewportWidth * .74));
  const room = useMemo(() => variant === 'arena'
    ? createArenaRoomGeometry(aspect)
    : createBrewingRoomGeometry(halfWidth), [variant, aspect, halfWidth]);
  const props = useMemo(() => furniture && variant === 'brewing' ? createWorkshopPropsGeometry() : null, [variant, furniture]);
  useEffect(() => () => Object.values(room).forEach(geometry => geometry.dispose()), [room]);
  useEffect(() => () => props?.dispose(), [props]);
  return <group>
    {lighting && <>
      <hemisphereLight args={[theme.colors.roomSkyLight, theme.colors.roomGroundLight, 1.15]} />
      <directionalLight position={[-3, 7, 6]} color={theme.colors.roomKeyLight} intensity={1.5} />
    </>}
    <mesh geometry={room.stone} raycast={ignoreRaycast}>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
    <mesh geometry={room.wood} raycast={ignoreRaycast}>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
    <mesh geometry={room.metal} raycast={ignoreRaycast}>
      <meshStandardMaterial vertexColors roughness={.9} metalness={.15} />
    </mesh>
    <mesh geometry={room.glass} raycast={ignoreRaycast}>
      <meshBasicMaterial vertexColors toneMapped={false} />
    </mesh>
    <mesh geometry={room.banners} raycast={ignoreRaycast}>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
    {props && <mesh geometry={props} raycast={ignoreRaycast}>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>}
  </group>;
});

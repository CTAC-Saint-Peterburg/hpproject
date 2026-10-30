import { memo, useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { theme } from '../../static/theme';
import { createBrewingRoomGeometry, ROOM } from './roomGeometry';
import { createWorkshopPropsGeometry } from './workshopPropsGeometry';

const ignoreRaycast = () => null;

export default memo(function BrewingRoom() {
  const viewportWidth = useThree(state => state.viewport.width);
  // Even arriving enemies remain in front of the side walls on wide displays.
  const halfWidth = Math.min(ROOM.maxHalfWidth, Math.max(ROOM.minHalfWidth, viewportWidth * .74));
  const room = useMemo(() => createBrewingRoomGeometry(halfWidth), [halfWidth]);
  const furniture = useMemo(() => createWorkshopPropsGeometry(), []);
  useEffect(() => () => Object.values(room).forEach(geometry => geometry.dispose()), [room]);
  useEffect(() => () => furniture.dispose(), [furniture]);
  return <group>
    <hemisphereLight args={[theme.colors.roomSkyLight, theme.colors.roomGroundLight, 1.15]} />
    <directionalLight position={[-3, 7, 6]} color={theme.colors.roomKeyLight} intensity={1.5} />
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
    <mesh geometry={furniture} raycast={ignoreRaycast}>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  </group>;
});

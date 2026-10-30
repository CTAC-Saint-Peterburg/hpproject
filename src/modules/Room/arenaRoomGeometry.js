import { BufferGeometry, Float32BufferAttribute, Frustum, Matrix4, PerspectiveCamera, Plane, Ray, Vector3 } from 'three';
import { createBrewingRoomGeometry, ROOM } from './roomGeometry.js';

const ARENA_FLOOR_Y = -.4;
const COVERAGE_MARGIN = .35;
const CULL_MARGIN = .05;

// Mirrors the arena's existing camera without mutating its live camera or board.
function createLayoutCamera(aspect) {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const scale = Math.max(1, 1.35 / safeAspect);
  const camera = new PerspectiveCamera(50, safeAspect, .1, 1000);
  camera.position.set(0, 12 * scale, 11 * scale);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

function layoutForCamera(camera) {
  const ray = new Ray();
  const point = new Vector3();
  const direction = new Vector3();
  const floor = new Plane(new Vector3(0, 1, 0), -ARENA_FLOOR_Y);
  const back = new Plane(new Vector3(0, 0, 1), -ROOM.backZ);

  direction.set(0, -1, .5).unproject(camera).sub(camera.position).normalize();
  ray.set(camera.position, direction);
  const frontZ = ray.intersectPlane(floor, point) ? point.z + COVERAGE_MARGIN : ROOM.frontZ;

  direction.set(0, 1, .5).unproject(camera).sub(camera.position).normalize();
  ray.set(camera.position, direction);
  const wallTopY = ray.intersectPlane(back, point)
    ? Math.max(ROOM.wallTopY, point.y + COVERAGE_MARGIN)
    : ROOM.wallTopY;

  const visibleWidth = 2 * camera.position.length() * Math.tan(25 * Math.PI / 180) * camera.aspect;
  return {
    halfWidth: Math.max(ROOM.minHalfWidth, Math.min(ROOM.maxHalfWidth, visibleWidth * .74)),
    frontZ,
    wallTopY,
    floorY: ARENA_FLOOR_Y,
    cameraPosition: camera.position.toArray(),
  };
}

export function arenaRoomLayout(aspect) {
  return layoutForCamera(createLayoutCamera(aspect));
}

// Conservative rejection preserves triangles crossing a screen edge even if all
// three vertices are individually outside different sides of the frustum.
function pruneInvisibleTriangles(source, frustum) {
  const position = source.getAttribute('position');
  const normal = source.getAttribute('normal');
  const color = source.getAttribute('color');
  if (!position || !normal || !color) throw new Error('Room geometry requires position, normal and color attributes');
  const count = source.index?.count ?? position.count;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  let written = 0;

  for (let offset = 0; offset + 2 < count; offset += 3) {
    const first = source.index ? source.index.getX(offset) : offset;
    const second = source.index ? source.index.getX(offset + 1) : offset + 1;
    const third = source.index ? source.index.getX(offset + 2) : offset + 2;
    a.fromBufferAttribute(position, first);
    b.fromBufferAttribute(position, second);
    c.fromBufferAttribute(position, third);
    let outside = false;
    for (let side = 0; side < frustum.planes.length; side++) {
      const plane = frustum.planes[side];
      if (plane.distanceToPoint(a) < -CULL_MARGIN && plane.distanceToPoint(b) < -CULL_MARGIN && plane.distanceToPoint(c) < -CULL_MARGIN) {
        outside = true;
        break;
      }
    }
    if (outside) continue;
    for (let vertex = 0; vertex < 3; vertex++) {
      const index = vertex === 0 ? first : vertex === 1 ? second : third;
      positions[written] = position.getX(index);
      normals[written] = normal.getX(index);
      colors[written++] = color.getX(index);
      positions[written] = position.getY(index);
      normals[written] = normal.getY(index);
      colors[written++] = color.getY(index);
      positions[written] = position.getZ(index);
      normals[written] = normal.getZ(index);
      colors[written++] = color.getZ(index);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions.slice(0, written), 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(normals.slice(0, written), 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors.slice(0, written), 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// Build and prune once per aspect change. There is no render-loop work here.
export function createArenaRoomGeometry(aspect) {
  const camera = createLayoutCamera(aspect);
  const layout = layoutForCamera(camera);
  const source = createBrewingRoomGeometry(layout.halfWidth, {
    variant: 'arena',
    frontZ: layout.frontZ,
    wallTopY: layout.wallTopY,
    floorY: layout.floorY,
  });
  const projectionView = new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const frustum = new Frustum().setFromProjectionMatrix(projectionView);
  const geometry = {};
  try {
    for (const [name, part] of Object.entries(source)) geometry[name] = pruneInvisibleTriangles(part, frustum);
  } catch (error) {
    Object.values(geometry).forEach(part => part.dispose());
    throw error;
  } finally {
    Object.values(source).forEach(part => part.dispose());
  }
  return geometry;
}

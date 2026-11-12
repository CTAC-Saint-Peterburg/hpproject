import { Vector3 } from 'three';

// CSS-pixel picking stays the same size at every device pixel ratio.
export function projectedIngredientHit(point, position, camera, rect, radiusPx = 44) {
  if (!position || !(rect.width > 0) || !(rect.height > 0)) return false;
  const projected = new Vector3().copy(position).project(camera);
  if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y) || projected.z < -1 || projected.z > 1) return false;
  return Math.hypot((point.x - projected.x) * rect.width / 2,
    (point.y - projected.y) * rect.height / 2) <= radiusPx;
}

// A far-away spell never moves a touch-held ingredient; desktop still hovers.
export function ingredientMayFollow(following, touch, dragging, heldId, id) {
  return following && (!touch || dragging && heldId === id);
}

export function projectIngredientPointer(point, camera, z, raycaster, out) {
  raycaster.setFromCamera(point, camera);
  const direction = raycaster.ray.direction.z;
  if (Math.abs(direction) <= .001) return false;
  const distance = (z - raycaster.ray.origin.z) / direction;
  if (!Number.isFinite(distance) || distance <= 0) return false;
  raycaster.ray.at(distance, out);
  return true;
}

export function clampIngredientPointer(point, camera, z, size, out) {
  const depth = Math.max(.01, camera.position.z - z);
  const radius = Math.max(0, size) * .5;
  const limitX = Math.max(.1, Math.min(.95, 1 - radius * camera.projectionMatrix.elements[0] / depth - .02));
  const limitY = Math.max(.1, Math.min(.95, 1 - radius * camera.projectionMatrix.elements[5] / depth - .02));
  out.x = Math.max(-limitX, Math.min(limitX, point.x));
  out.y = Math.max(-limitY, Math.min(limitY, point.y));
  return out;
}

export function brewingCameraDepth(scene, aspect, touch) {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  return scene.cameraPosition[2] * (touch ? Math.max(1, 1.35 / safeAspect) : 1);
}

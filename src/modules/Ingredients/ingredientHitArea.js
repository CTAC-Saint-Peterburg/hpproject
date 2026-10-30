import { Box3, Matrix4, Ray, Vector3 } from 'three';
import { INGREDIENT_MODEL_SIZE } from './ingredientGeometry.js';

const halfSize = INGREDIENT_MODEL_SIZE / 2;
const bounds = new Box3(new Vector3(-halfSize, -halfSize, -halfSize), new Vector3(halfSize, halfSize, halfSize));
const inverse = new Matrix4();
const localRay = new Ray();
const localPoint = new Vector3();

// Thin petals and twigs retain the original cube's comfortable pickup area.
// Analytic raycasting adds no invisible geometry, material or draw call.
export function ingredientRaycast(raycaster, intersections) {
  inverse.copy(this.matrixWorld).invert();
  localRay.copy(raycaster.ray).applyMatrix4(inverse);
  if (!localRay.intersectBox(bounds, localPoint)) return;
  const point = localPoint.clone().applyMatrix4(this.matrixWorld);
  const distance = raycaster.ray.origin.distanceTo(point);
  if (distance < raycaster.near || distance > raycaster.far) return;
  intersections.push({ distance, point, object: this });
}

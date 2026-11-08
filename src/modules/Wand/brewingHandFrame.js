// Keep the brewing hand in the lower-right foreground without lowering it
// through the room floor. Reuse the caller's vector to avoid per-frame objects.
export function writeBrewingHandFrame(position, camera, aspect, layout) {
  const height = 2 * layout.depth * Math.tan(camera.fov * Math.PI / 360);
  position.set(layout.screenAnchor[0] * height * aspect / 2,
    layout.screenAnchor[1] * height / 2, -layout.depth).applyMatrix4(camera.matrixWorld);
  return layout.scale * Math.min(1, aspect / layout.mobileAspect);
}

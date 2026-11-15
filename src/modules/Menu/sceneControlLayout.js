export function brewingBookPosition(view, pixelHeight = 768) {
  return [-view.width * .27, Math.min(view.height * .42, view.height * (.5 - 46 / pixelHeight)), 0];
}

// Billboard rotation also moves the top of the crest backwards. Leave room for
// its full bounding sphere and the masonry projecting from the back wall.
export function arenaControlPositions(field) {
  const z = -field.depth / 2 + .35;
  return { book: [field.width * .3, 1.65, z], crest: [-field.width * .23, 1.65, z] };
}

import { defenseConfig, potionTypes } from '../../static/themedConfigs.js';

// Preserve the table's camera inclination while fitting the enlarged board and rack.
export function arenaBaseCameraPose(aspect) {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const scale = Math.max(1, 1.35 / safeAspect);
  return { position: [0, 15.2 * scale, (15.2 * 11 / 12) * scale], target: [0, 0, 0] };
}

export function arenaFrontBorder() {
  const field = defenseConfig.field;
  return { width: field.width, depth: field.frontBorderDepth, height: field.frontBorderHeight,
    y: field.frontBorderHeight / 2 - .2, z: field.depth / 2 + field.frontBorderDepth / 2,
    top: field.frontBorderHeight - .2 };
}

export function potionRackPosition(id, inventory) {
  const ids = potionTypes.filter(potion => Object.hasOwn(inventory, potion.id)).map(potion => potion.id);
  const index = ids.indexOf(id), border = arenaFrontBorder();
  return [(Math.max(0, index) - (ids.length - 1) / 2) * defenseConfig.visuals.potionSpacing,
    border.top + .01, border.z];
}

// Keep the status crystal beside the rack even after empty bottles disappear.
export function crystalStatusPosition(inventory) {
  const ids = potionTypes.filter(potion => Object.hasOwn(inventory, potion.id)).map(potion => potion.id);
  const border = arenaFrontBorder();
  const firstX = ids.length ? potionRackPosition(ids[0], inventory)[0] : 0;
  return [Math.max(-border.width / 2 + .6, firstX - 1.6), border.top + .01, border.z];
}

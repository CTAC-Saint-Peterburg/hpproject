// Preparations for the current ingredient, in the order they should be done.
export function brewingActions(stage, temperature, agitation) {
  if (!stage) return [];
  const actions = [];
  if (temperature < stage.temperature.min) actions.push({ name: 'brewing.nextHeat', icon: '♨' });
  if (temperature > stage.temperature.max) actions.push({ name: 'brewing.nextCool', icon: '❄' });
  const stirring = stage.stirring ?? { min: 0, max: 100 };
  if (agitation < stirring.min) actions.push({ name: 'brewing.nextStir', icon: '↻' });
  if (agitation > stirring.max) actions.push({ name: 'brewing.nextSettle', icon: '◷' });
  return actions;
}

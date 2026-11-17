// During brewing this is the best rating still achievable; completing the recipe
// uses exactly the same thresholds, independently of when an error was made.
export function brewingRating(mission, mistakes = 0) {
  const three = mission?.rating?.threeStarMistakes ?? 0;
  const two = Math.max(three, mission?.rating?.twoStarMistakes ?? 3);
  return mistakes <= three ? 3 : mistakes <= two ? 2 : 1;
}

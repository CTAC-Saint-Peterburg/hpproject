export function paginateHeights(heights, available, gap = 8) {
  const pages = [[]]; let used = 0;
  heights.forEach((height, index) => {
    if (pages.at(-1).length && used + gap + height > available) { pages.push([]); used = 0; }
    pages.at(-1).push(index); used += height + (used ? gap : 0);
  });
  return pages;
}

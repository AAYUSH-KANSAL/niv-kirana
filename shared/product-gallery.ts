export function galleryIndexFor(currentIndex: number, totalImages: number, direction: -1 | 1) {
  if (totalImages <= 0) return 0;
  return Math.max(0, Math.min(totalImages - 1, currentIndex + direction));
}

export function normalizeProductImageUrls(imageUrls?: string[], imageUrl?: string): string[] {
  const candidates = [
    ...(Array.isArray(imageUrls) ? imageUrls : []),
    imageUrl,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return Array.from(new Set(candidates.map((value) => value.trim())));
}

export function primaryProductImageUrl(imageUrls?: string[], imageUrl?: string) {
  return normalizeProductImageUrls(imageUrls, imageUrl)[0];
}

export function preferredProductImageSource(product: { imageUrl?: string; imageUrls?: string[] }) {
  return product.imageUrl || product.imageUrls?.find((url) => typeof url === "string" && url.trim().length > 0);
}

export function resolveProductImageUri(imageUrl?: string, apiBaseUrl = "") {
  if (!imageUrl) return undefined;
  if (/^(https?:|file:|content:|data:)/.test(imageUrl)) return imageUrl;
  const baseUrl = apiBaseUrl.replace(/\/+$/, "");
  if (baseUrl && imageUrl.startsWith("/")) return `${baseUrl}${imageUrl}`;
  return imageUrl;
}

export function normalizeDetectedMrp(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 100000) return null;
  return Math.round(numeric * 100) / 100;
}

export function sanitizeDetectedProductName(value: unknown) {
  if (typeof value !== "string") return "Product name needs review";
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 2 ? name.slice(0, 120) : "Product name needs review";
}

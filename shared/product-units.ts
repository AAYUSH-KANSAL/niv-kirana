export const PRODUCT_UNIT_OPTIONS = ["kg", "g", "litre", "ml", "packet", "piece"] as const;

export type ProductUnitOption = (typeof PRODUCT_UNIT_OPTIONS)[number];

export function splitProductUnit(unit: string | undefined): { amount: string; unit: ProductUnitOption } {
  const normalized = (unit ?? "").trim().toLowerCase();
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(kg|g|litre|ml|packet|piece)$/);
  if (match) return { amount: match[1], unit: match[2] as ProductUnitOption };
  return { amount: "1", unit: "piece" };
}

export function formatProductUnit(amount: string, unit: ProductUnitOption): string {
  const normalizedAmount = Number(amount);
  return `${Number.isFinite(normalizedAmount) && normalizedAmount > 0 ? normalizedAmount : 1} ${unit}`;
}

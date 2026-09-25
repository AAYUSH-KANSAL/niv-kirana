export type ProductVariant = {
  id: string;
  label: string;
  price: number;
};

export function normalizeProductVariants(variants: ProductVariant[] | undefined): ProductVariant[] {
  if (!Array.isArray(variants)) return [];
  return variants
    .filter((variant) => Boolean(variant?.id && variant.label?.trim() && Number.isFinite(variant.price) && variant.price >= 0))
    .map((variant) => ({
      id: variant.id,
      label: variant.label.trim(),
      price: Math.round(variant.price * 100) / 100,
    }));
}

export function selectedProductVariant(variants: ProductVariant[] | undefined, variantId?: string): ProductVariant | undefined {
  const normalized = normalizeProductVariants(variants);
  return normalized.find((variant) => variant.id === variantId) ?? normalized[0];
}

export function variantLineKey(productId: string, variantId?: string): string {
  return `${productId}::${variantId ?? "base"}`;
}

export function variantTotal(price: number, quantity: number): number {
  return Math.round(price * quantity * 100) / 100;
}

export function validProductVariantDrafts(variants: ProductVariant[]): ProductVariant[] {
  return variants
    .map((variant) => ({ ...variant, label: variant.label.trim(), price: Number(variant.price) }))
    .filter((variant) => variant.label.length > 0 && Number.isFinite(variant.price) && variant.price >= 0)
    .map((variant) => ({ ...variant, price: Math.round(variant.price * 100) / 100 }));
}

import type { Product } from "@/lib/niv-store";

const spiceKeywords = ["haldi", "turmeric", "mirch", "chilli", "chili", "dhaniya", "coriander", "garam masala", "masala", "jeera", "cumin", "spice"];

export function isSpiceProduct(product: Product) {
  const searchable = `${product.name} ${product.category}`.toLowerCase();
  return spiceKeywords.some((keyword) => searchable.includes(keyword));
}

export function relatedProductsFor(product: Product, products: Product[], limit = 6) {
  const selectedIsSpice = isSpiceProduct(product);
  return products
    .filter((candidate) => candidate.id !== product.id)
    .filter((candidate) => selectedIsSpice ? isSpiceProduct(candidate) : candidate.category === product.category)
    .sort((left, right) => Number(right.featured) - Number(left.featured) || left.name.localeCompare(right.name))
    .slice(0, limit);
}

export function relatedProductsLabel(product: Product) {
  return isSpiceProduct(product) ? "Spices that go well together" : `More from ${product.category}`;
}

export const SHOWCASE_INTERVAL = 9;
export const MAX_SHOWCASE_INSERTIONS = 2;

export type ShowcaseProduct = { id: string };

export function sanitizeDiscount(value: number) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 0;
  return Math.max(0, Math.min(99, Math.round(numericValue)));
}

export function productDiscount(discounts: Record<string, number> | undefined, productId: string) {
  const value = Number(discounts?.[productId] ?? 0);
  if (!Number.isFinite(value)) return 0;
  return sanitizeDiscount(value);
}

export function discountedShowcasePrice(regularPrice: number, discountPercent: number) {
  const safePrice = Math.max(0, Number(regularPrice) || 0);
  return Math.max(0, Math.round(safePrice * (1 - sanitizeDiscount(discountPercent) / 100)));
}

export function catalogShowcaseSections<T>(products: T[], interval = SHOWCASE_INTERVAL) {
  const size = Math.max(1, Math.floor(interval));
  const sections: T[][] = [];
  for (let start = 0; start < products.length; start += size) sections.push(products.slice(start, start + size));
  return sections;
}

export function shouldRenderShowcaseForSection(sectionIndex: number, sectionProductCount: number, featuredProductCount: number) {
  return sectionIndex < MAX_SHOWCASE_INSERTIONS && sectionProductCount === SHOWCASE_INTERVAL && featuredProductCount > 0;
}

export function nextShowcaseSlideIndex(currentIndex: number, productCount: number) {
  if (productCount < 2) return 0;
  return (Math.max(0, Math.floor(currentIndex)) + 1) % productCount;
}

function showcaseHash(value: string, seed: number) {
  let hash = seed * 101 + 17;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash;
}

export function randomizeShowcaseProducts<T extends ShowcaseProduct>(products: T[], sectionIndex: number) {
  return [...products].sort((first, second) => showcaseHash(first.id, sectionIndex) - showcaseHash(second.id, sectionIndex));
}

const showcaseTaglines = [
  { title: "Ghar ke liye aur picks", detail: "Owner ke selected useful products" },
  { title: "Aaj ke special picks", detail: "Aapke liye alag useful products" },
  { title: "Quick home essentials", detail: "Daily zaroorat ke selected items" },
  { title: "NIV recommended for you", detail: "Aaj ke practical grocery picks" },
];

export function showcaseTagline(sectionIndex: number) {
  return showcaseTaglines[sectionIndex % showcaseTaglines.length];
}

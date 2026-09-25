export type CatalogSearchProduct = {
  name: string;
  category?: string;
  unit?: string;
};

export type CatalogSearchMatch = {
  productId: string;
  confidence: "high" | "medium";
};

type AliasGroup = {
  phrases: string[];
  productTerms: string[];
};

const ALIAS_GROUPS: AliasGroup[] = [
  { phrases: ["rajma", "red kidney bean", "red kidney beans", "kidney bean", "kidney beans"], productTerms: ["rajma", "red kidney", "kidney bean"] },
  { phrases: ["dal", "daal", "pulses", "lentil", "lentils"], productTerms: ["dal", "daal", "pulses", "lentil"] },
  { phrases: ["chawal", "rice"], productTerms: ["chawal", "rice"] },
  { phrases: ["atta", "aata", "flour", "wheat flour"], productTerms: ["atta", "aata", "flour", "wheat"] },
  { phrases: ["doodh", "dudh", "milk"], productTerms: ["doodh", "dudh", "milk"] },
  { phrases: ["cheeni", "chini", "sugar"], productTerms: ["cheeni", "chini", "sugar"] },
  { phrases: ["namak", "salt"], productTerms: ["namak", "salt"] },
  { phrases: ["haldi", "turmeric"], productTerms: ["haldi", "turmeric"] },
  { phrases: ["mirchi", "mirch", "chilli", "chili", "red chilli", "red chili"], productTerms: ["mirchi", "mirch", "chilli", "chili"] },
  { phrases: ["sabun", "soap"], productTerms: ["sabun", "soap"] },
  { phrases: ["biskut", "biscuit", "biscuits"], productTerms: ["biskut", "biscuit"] },
  { phrases: ["chai", "tea"], productTerms: ["chai", "tea"] },
  { phrases: ["tel", "oil", "cooking oil"], productTerms: ["tel", "oil"] },
];

/** Returns owner catalog products matching a name, category, or pack-size query. */
export function filterOwnerCatalogProducts<T extends CatalogSearchProduct>(products: T[], query: string): T[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return products;

  return products.filter((product) =>
    [product.name, product.category, product.unit]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(normalizedQuery)),
  );
}

export function normalizeCatalogSearch(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\u0900-\u097f]+/gi, " ").replace(/\s+/g, " ").trim();
}

function queryPhrases(query: string) {
  const normalized = normalizeCatalogSearch(query);
  const phrases = new Set<string>(normalized ? [normalized] : []);
  for (const group of ALIAS_GROUPS) {
    if (group.phrases.some((phrase) => normalized.includes(normalizeCatalogSearch(phrase)))) {
      group.productTerms.forEach((term) => phrases.add(normalizeCatalogSearch(term)));
    }
  }
  return [...phrases].filter(Boolean);
}

function levenshtein(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const saved = previous[column];
      previous[column] = left[row - 1] === right[column - 1] ? diagonal : Math.min(diagonal + 1, previous[column - 1] + 1, saved + 1);
      diagonal = saved;
    }
  }
  return previous[right.length];
}

function hasTypoTolerantToken(query: string, productText: string) {
  const queryTokens = query.split(" ").filter((token) => token.length >= 3);
  const productTokens = productText.split(" ").filter((token) => token.length >= 3);
  return queryTokens.some((queryToken) => productTokens.some((productToken) => {
    const distance = levenshtein(queryToken, productToken);
    return distance <= (queryToken.length >= 7 ? 2 : 1);
  }));
}

export function productMatchesCatalogSearch(product: CatalogSearchProduct, query: string) {
  const normalizedQuery = normalizeCatalogSearch(query);
  if (!normalizedQuery) return true;
  const productText = normalizeCatalogSearch(`${product.name} ${product.category ?? ""} ${product.unit ?? ""}`);
  if (productText.includes(normalizedQuery)) return true;
  if (queryPhrases(normalizedQuery).some((phrase) => productText.includes(phrase))) return true;
  return hasTypoTolerantToken(normalizedQuery, productText);
}

export function fallbackCatalogMatches(products: Array<CatalogSearchProduct & { id: string }>, query: string) {
  return products.filter((product) => productMatchesCatalogSearch(product, query)).map((product) => ({ productId: product.id, confidence: "medium" as const }));
}

export function sanitizeCatalogSearchMatches(products: Array<{ id: string }>, matches: unknown) {
  const ids = new Set(products.map((product) => product.id));
  const seen = new Set<string>();
  if (!Array.isArray(matches)) return [] as CatalogSearchMatch[];
  return matches.flatMap((match) => {
    if (!match || typeof match !== "object") return [];
    const candidate = match as { productId?: unknown; confidence?: unknown };
    const productId = typeof candidate.productId === "string" ? candidate.productId : "";
    if (!ids.has(productId) || seen.has(productId)) return [];
    seen.add(productId);
    return [{ productId, confidence: candidate.confidence === "high" ? "high" as const : "medium" as const }];
  }).slice(0, 12);
}

export function catalogSearchSystemPrompt() {
  return "You are NIV Kirana's catalog search assistant. Match the customer's Hindi, Hinglish, English, local grocery name, alternate name, or spelling mistake to products in the supplied catalog. Rajma means red kidney beans, dal/daal means pulses/lentils, chawal means rice, atta means flour, doodh means milk, cheeni/chini means sugar, and sabun means soap. Only return product IDs that exist in the catalog; never invent IDs or products. Return JSON only with matches: an array of objects containing productId and confidence (high or medium). Rank the closest products first and return at most 12 matches.";
}

export function buildCatalogSearchPrompt(query: string, products: Array<{ id: string; name: string; category: string; unit: string }>) {
  const catalog = products.map((product) => `${product.id} | ${product.name} | ${product.category} | ${product.unit}`).join("\n");
  return `Customer search: ${query}\n\nAvailable catalog:\n${catalog}`;
}

export const catalogSearchAliasGroups = ALIAS_GROUPS;

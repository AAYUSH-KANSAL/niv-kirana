export const productEditorTools = [
  {
    key: "picks",
    title: "Picked products",
    shortLabel: "Picks",
    description: "Customer Shop की top horizontal cards चुनें।",
    icon: "view-carousel",
  },
  {
    key: "basket",
    title: "Festival Basket",
    shortLabel: "Festival",
    description: "Festival combo बनाएं, edit करें और publish करें।",
    icon: "celebration",
  },
  {
    key: "scanner",
    title: "AI Product Scanner",
    shortLabel: "Scan",
    description: "Photo से नया product scan करके add करें।",
    icon: "document-scanner",
  },
  {
    key: "categories",
    title: "Customer Categories",
    shortLabel: "Categories",
    description: "Customer filters और product categories manage करें।",
    icon: "category",
  },
] as const;

export type ProductEditorToolKey = (typeof productEditorTools)[number]["key"];

export function productEditorToolFor(key: ProductEditorToolKey) {
  return productEditorTools.find((tool) => tool.key === key)!;
}

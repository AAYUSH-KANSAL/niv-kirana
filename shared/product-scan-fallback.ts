export function createProductScanFallback(imageUrl: string) {
  return {
    name: "",
    mrp: null as number | null,
    category: "Staples",
    unit: "1 pack",
    imageUrl,
    note: "AI product name और MRP पढ़ रहा है। यदि यह clear न हो, तो नीचे details manually भरकर product save करें।",
  };
}

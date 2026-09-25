import { describe, expect, it } from "vitest";
import { discountedShowcasePrice, productDiscount } from "../shared/showcase-promotions";

const formatRupees = (amount?: number | string | null) => {
  const n = typeof amount === "number" ? amount : Number(amount) || 0;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  mrp?: number;
  unit: string;
  stock: number;
  icon: string;
  imageUrl?: string;
  description?: string;
  featured?: boolean;
};

describe("product management and pricing system", () => {
  it("displays product selling price as the current deal price and MRP separately", () => {
    const product: Product = {
      id: "premium-atta-50kg",
      name: "Premium Atta 50kg",
      category: "Staples",
      price: 50000, // Selling price
      mrp: 80000,   // MRP
      unit: "50 kg",
      stock: 10,
      icon: "🌾",
      description: "Organic stone ground wheat flour",
    };

    // Deals of the day calculation
    const promoDiscount = productDiscount(undefined, product.id);
    const sellingPrice =
      promoDiscount > 0
        ? discountedShowcasePrice(product.price, promoDiscount)
        : product.price;
    const regularPrice =
      product.mrp && product.mrp > sellingPrice
        ? product.mrp
        : undefined;
    const discountPercent = regularPrice
      ? Math.round(((regularPrice - sellingPrice) / regularPrice) * 100)
      : promoDiscount;

    expect(sellingPrice).toBe(50000);
    expect(formatRupees(sellingPrice)).toBe("₹50,000");
    expect(regularPrice).toBe(80000);
    expect(formatRupees(regularPrice)).toBe("₹80,000");
    expect(discountPercent).toBe(38); // 38% OFF
  });

  it("updates existing product in catalog without creating duplicate items", () => {
    const initialProducts: Product[] = [
      {
        id: "prod-101",
        name: "Old Biscuit Name",
        category: "Snacks",
        price: 30,
        mrp: 40,
        unit: "1 pack",
        stock: 15,
        icon: "🍪",
        description: "Classic tea biscuits",
        imageUrl: "https://example.com/biscuit.jpg",
      },
      {
        id: "prod-102",
        name: "Daily Tea",
        category: "Beverages",
        price: 140,
        mrp: 160,
        unit: "250 g",
        stock: 20,
        icon: "🍵",
      },
    ];

    const updates: Partial<Product> = {
      name: "Marie Gold Biscuits",
      price: 35,
      mrp: 45,
      unit: "200 g pack",
      stock: 50,
      category: "Snacks",
      description: "Crispy and light wheat biscuits with vitamins",
      imageUrl: "https://example.com/marie-gold.jpg",
    };

    const targetId = "prod-101";

    // Simulate updateProduct operation
    const updatedProducts = initialProducts.map((p) =>
      p.id === targetId ? { ...p, ...updates } : p
    );

    // Verify catalog length has not increased (no duplicate created)
    expect(updatedProducts).toHaveLength(2);

    const updated = updatedProducts.find((p) => p.id === targetId);
    expect(updated).toBeDefined();
    expect(updated?.id).toBe("prod-101");
    expect(updated?.name).toBe("Marie Gold Biscuits");
    expect(updated?.price).toBe(35);
    expect(updated?.mrp).toBe(45);
    expect(updated?.unit).toBe("200 g pack");
    expect(updated?.stock).toBe(50);
    expect(updated?.category).toBe("Snacks");
    expect(updated?.description).toBe("Crispy and light wheat biscuits with vitamins");
    expect(updated?.imageUrl).toBe("https://example.com/marie-gold.jpg");
  });

  it("formats Indian rupees cleanly for high value pricing without string errors", () => {
    expect(formatRupees(50000)).toBe("₹50,000");
    expect(formatRupees(80000)).toBe("₹80,000");
    expect(formatRupees(125000)).toBe("₹1,25,000");
    expect(formatRupees(0)).toBe("₹0");
  });
});

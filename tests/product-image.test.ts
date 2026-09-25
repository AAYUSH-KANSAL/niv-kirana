import { describe, expect, it } from "vitest";

import { preferredProductImageSource, resolveProductImageUri } from "../lib/product-image";

describe("product image URI", () => {
  it("keeps already usable device and remote image URLs unchanged", () => {
    expect(resolveProductImageUri("file:///product.jpg")).toBe("file:///product.jpg");
    expect(resolveProductImageUri("https://cdn.example.com/product.jpg")).toBe("https://cdn.example.com/product.jpg");
  });

  it("combines a stored relative image path with its API host", () => {
    expect(resolveProductImageUri("/storage/products/haldi.jpg", "https://api.niv.example")).toBe("https://api.niv.example/storage/products/haldi.jpg");
    expect(resolveProductImageUri("/storage/products/haldi.jpg", "https://api.niv.example/")).toBe("https://api.niv.example/storage/products/haldi.jpg");
  });

  it("uses the primary image first and falls back to the first stored gallery image", () => {
    expect(preferredProductImageSource({ imageUrl: "https://cdn.example.com/primary.jpg", imageUrls: ["https://cdn.example.com/gallery.jpg"] })).toBe("https://cdn.example.com/primary.jpg");
    expect(preferredProductImageSource({ imageUrls: ["https://cdn.example.com/gallery.jpg"] })).toBe("https://cdn.example.com/gallery.jpg");
  });

  it("returns undefined for a product without a photo", () => {
    expect(resolveProductImageUri()).toBeUndefined();
  });
});

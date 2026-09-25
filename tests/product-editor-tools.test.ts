import { describe, expect, it } from "vitest";

import { productEditorToolFor, productEditorTools } from "../shared/product-editor-tools";

describe("owner product editor tools", () => {
  it("provides the four requested editors in a stable compact launcher order", () => {
    expect(productEditorTools.map((tool) => tool.key)).toEqual(["picks", "basket", "scanner", "categories"]);
  });

  it("returns the matching editor metadata for a launcher action", () => {
    expect(productEditorToolFor("scanner").title).toBe("AI Product Scanner");
  });
});

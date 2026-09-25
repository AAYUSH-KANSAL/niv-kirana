import { describe, expect, it } from "vitest";

import { composeStoreHours } from "../shared/store-hours";

describe("store hours", () => {
  it("combines separately owner-edited open and close times", () => {
    expect(composeStoreHours("8:00 AM", "9:00 PM")).toBe("8:00 AM – 9:00 PM");
  });

  it("keeps missing schedule values explicit", () => {
    expect(composeStoreHours("", "9:00 PM")).toBe("Not set – 9:00 PM");
  });
});

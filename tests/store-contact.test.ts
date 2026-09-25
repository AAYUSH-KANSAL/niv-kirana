import { describe, expect, it } from "vitest";

import { buildStoreContactLinks } from "../shared/store-contact";

describe("store contact links", () => {
  it("formats a 10-digit WhatsApp number with the India country code", () => {
    const links = buildStoreContactLinks("7060902859", "7060902859", "9876543210");

    expect(links.callUrl).toBe("tel:7060902859");
    expect(links.whatsappUrl).toContain("https://wa.me/917060902859");
    expect(links.whatsappUrl).toContain("9876543210");
  });

  it("does not create an action URL when a contact number is missing", () => {
    expect(buildStoreContactLinks("", "", "")).toEqual({ callUrl: null, whatsappUrl: null });
  });
});

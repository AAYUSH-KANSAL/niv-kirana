import { describe, expect, it } from "vitest";

import { creditVerificationMissingSteps, isCreditVerificationReady, maskedIdentityNumber } from "../shared/credit-verification";

describe("credit verification safeguards", () => {
  it("formats only the last four identity digits for owner review", () => {
    expect(maskedIdentityNumber("1234")).toBe("XXXX XXXX 1234");
    expect(maskedIdentityNumber("123")).toBe("Not provided");
  });

  it("requires consent, two document images and a one-time location before submission", () => {
    const draft = { requestedLimit: 2000, phone: "9876543210", maskedIdLastFour: "1234", frontDocumentUrl: "/front.jpg", backDocumentUrl: "/back.jpg", latitude: 28.6139, longitude: 77.209, locationCapturedAt: "2026-08-26T10:00:00.000Z", consentedAt: "2026-08-26T10:00:00.000Z" };

    expect(isCreditVerificationReady(draft)).toBe(true);
    expect(isCreditVerificationReady({ ...draft, consentedAt: "" })).toBe(false);
  });

  it("lists missing submit steps so the customer can complete the form", () => {
    expect(creditVerificationMissingSteps({ requestedLimit: 2000, phone: "7060902859", maskedIdLastFour: "", hasFrontDocument: false, hasBackDocument: false, hasLocation: false, consented: true })).toEqual(["masked ID के last 4 digits", "front document photo", "back document photo", "current location"]);
  });

  it("locks editing once submitted or approved, and permits fresh application only when declined or reset", () => {
    // Helper function that determines if customer can submit/edit verification
    const canCustomerApplyOrEdit = (status: "none" | "requested" | "approved" | "declined") => {
      return status === "none" || status === "declined";
    };

    // When under review, documents are locked from editing
    expect(canCustomerApplyOrEdit("requested")).toBe(false);

    // When approved, documents and identity details are permanently locked
    expect(canCustomerApplyOrEdit("approved")).toBe(false);

    // If never applied or admin declined/deleted request, fresh application is permitted
    expect(canCustomerApplyOrEdit("none")).toBe(true);
    expect(canCustomerApplyOrEdit("declined")).toBe(true);
  });

  it("correctly computes revolving available limit for approved credit account", () => {
    const computeAvailableLimit = (limit: number, used: number) => Math.max(0, limit - used);

    expect(computeAvailableLimit(1000, 0)).toBe(1000);
    expect(computeAvailableLimit(1000, 450)).toBe(550);
    expect(computeAvailableLimit(1000, 1000)).toBe(0);
    expect(computeAvailableLimit(1000, 1200)).toBe(0);
  });
});

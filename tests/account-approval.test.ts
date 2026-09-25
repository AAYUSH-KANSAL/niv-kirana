import { describe, expect, it } from "vitest";

import { accountStatusIsActive, accountStatusIsBlocked, accountStatusIsPending, accountStatusLabel, canCustomerSignIn, nextApprovalStatus } from "../shared/account-approval";

describe("customer account approval lifecycle", () => {
  it("allows only approved accounts to sign in", () => {
    expect(canCustomerSignIn("approved")).toBe(true);
    expect(canCustomerSignIn("pending")).toBe(false);
    expect(canCustomerSignIn("rejected")).toBe(false);
    expect(canCustomerSignIn("suspended")).toBe(false);
  });

  it("keeps legacy accounts compatible as approved", () => {
    expect(canCustomerSignIn(undefined)).toBe(true);
    expect(accountStatusIsActive(undefined)).toBe(true);
  });

  it("describes pending and blocked requests clearly", () => {
    expect(accountStatusIsPending("pending")).toBe(true);
    expect(accountStatusIsBlocked("rejected")).toBe(true);
    expect(accountStatusIsBlocked("suspended")).toBe(true);
    expect(accountStatusLabel("pending")).toBe("Pending owner approval");
    expect(accountStatusLabel("approved")).toBe("Approved customer");
  });

  it("maps owner actions to the expected account status", () => {
    expect(nextApprovalStatus("approve")).toBe("approved");
    expect(nextApprovalStatus("reject")).toBe("rejected");
    expect(nextApprovalStatus("suspend")).toBe("suspended");
    expect(nextApprovalStatus("restore")).toBe("approved");
  });
});

import { describe, expect, it } from "vitest";

import { approvedCredit, cancelledCredit, disabledCredit, normalizeCreditAccount } from "../shared/credit-controls";

describe("per-customer credit controls", () => {
  it("keeps approval enabled only for the approved customer account", () => {
    expect(approvedCredit(2000, 300, "15th")).toMatchObject({ status: "approved", enabled: true, limit: 2000, used: 300 });
    expect(disabledCredit(approvedCredit(2000, 0, "15th")).enabled).toBe(false);
  });

  it("preserves legacy approved credit as enabled and clears a cancelled request", () => {
    expect(normalizeCreditAccount({ status: "approved", limit: 500, used: 0 }).enabled).toBe(true);
    expect(cancelledCredit()).toMatchObject({ status: "none", enabled: false, limit: 0 });
  });
});

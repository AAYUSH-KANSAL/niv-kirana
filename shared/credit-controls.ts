import type { CreditAccount } from "@/lib/niv-store";

export function normalizeCreditAccount(credit?: Partial<CreditAccount>): CreditAccount {
  const status = credit?.status ?? "none";
  return { status, limit: credit?.limit ?? 0, used: credit?.used ?? 0, requestedLimit: credit?.requestedLimit, dueDate: credit?.dueDate, verification: credit?.verification, enabled: credit?.enabled ?? status === "approved" };
}

export function approvedCredit(limit: number, used: number, dueDate: string): CreditAccount {
  return { status: "approved", limit: Math.max(0, limit), used: Math.max(0, used), dueDate, enabled: true };
}

export function disabledCredit(credit: CreditAccount): CreditAccount {
  return { ...credit, enabled: false };
}

export function cancelledCredit(): CreditAccount {
  return { status: "none", limit: 0, used: 0, enabled: false };
}

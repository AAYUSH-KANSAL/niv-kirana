import { normalizeIndianMobile } from "./local-account-rules";

export function shouldRecoverLegacyLocalAccount(existingAccountPhones: string[], legacyCustomerPhone?: string) {
  const legacyPhone = normalizeIndianMobile(legacyCustomerPhone ?? "");
  if (legacyPhone.length !== 10) return false;
  return !existingAccountPhones.some((phone) => normalizeIndianMobile(phone) === legacyPhone);
}

import { ADMIN_CONFIG } from "../config/app-config";

export const OWNER_LOGIN_ID = ADMIN_CONFIG.defaultOwnerEmail;
export const INITIAL_OWNER_PASSWORD = ADMIN_CONFIG.defaultOwnerPassword;

export function isOwnerLoginId(loginId: string) {
  const normalized = loginId.trim().toLowerCase();
  return ADMIN_CONFIG.ownerLoginAliases.includes(normalized);
}

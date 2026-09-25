export const OWNER_DEMO_PIN = "1234";

export function isDemoOwnerAccessCode(value: string) {
  return value.replace(/\D/g, "") === OWNER_DEMO_PIN;
}

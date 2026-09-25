export function composeStoreHours(openingTime: string, closingTime: string) {
  const open = openingTime.trim() || "Not set";
  const close = closingTime.trim() || "Not set";
  return `${open} – ${close}`;
}

export function customerDeliveryStatus(isOpen?: boolean) {
  if (isOpen === false) {
    return "Store Currently Closed · Orders queued for next opening";
  }
  return "Orders accepted anytime";
}

export function storeOperatingBadge(isOpen?: boolean) {
  return isOpen === false ? "Closed" : "Open";
}

export const ownerManagedDeliveryNote = "Shop timing और delivery information केवल Owner Dashboard से बदली जा सकती है; आप कभी भी order place कर सकते हैं।";

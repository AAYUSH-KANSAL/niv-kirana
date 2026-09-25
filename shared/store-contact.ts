function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function whatsappNumber(value: string) {
  const digits = digitsOnly(value);
  return digits.length === 10 ? `91${digits}` : digits;
}

export function buildStoreContactLinks(phone: string, whatsapp: string, customerPhone: string, storeName?: string) {
  const callNumber = digitsOnly(phone);
  const whatsappTarget = whatsappNumber(whatsapp);
  const customer = digitsOnly(customerPhone);
  const name = storeName?.trim() || "Store";
  const message = encodeURIComponent(`Namaste ${name}, mujhe order ke baare mein help chahiye.${customer ? ` Mera number: ${customer}` : ""}`);

  return {
    callUrl: callNumber ? `tel:${callNumber}` : null,
    whatsappUrl: whatsappTarget ? `https://wa.me/${whatsappTarget}?text=${message}` : null,
  };
}

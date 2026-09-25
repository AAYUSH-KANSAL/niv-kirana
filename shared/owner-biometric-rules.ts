export function shouldRequestOwnerBiometric(biometricEnabled: boolean) {
  return biometricEnabled;
}

export function biometricMessage(reason: "unavailable" | "cancelled" | "failed") {
  if (reason === "unavailable") return "इस device में fingerprint/biometric setup नहीं है। Owner password login fallback उपलब्ध रहेगा।";
  if (reason === "cancelled") return "Fingerprint verification cancel कर दिया गया।";
  return "Fingerprint verification सफल नहीं हुई। दोबारा कोशिश करें या Owner password से फिर login करें।";
}

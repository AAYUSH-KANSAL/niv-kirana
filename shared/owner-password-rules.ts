export type PasswordChangeCheck = { valid: true } | { valid: false; message: string };

export function validateOwnerPasswordChange(currentPassword: string, nextPassword: string, confirmation: string): PasswordChangeCheck {
  if (!currentPassword) return { valid: false, message: "पुराना password भरें।" };
  if (nextPassword.length < 8) return { valid: false, message: "नया password कम से कम 8 characters का रखें।" };
  if (nextPassword !== confirmation) return { valid: false, message: "नया password और confirmation match नहीं कर रहे हैं।" };
  if (currentPassword === nextPassword) return { valid: false, message: "नया password पुराने password से अलग रखें।" };
  return { valid: true };
}

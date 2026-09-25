export function hasScannablePhotoData(base64: string | null | undefined) {
  return typeof base64 === "string" && base64.trim().length > 100;
}

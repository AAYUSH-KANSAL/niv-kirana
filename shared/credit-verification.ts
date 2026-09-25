export type CreditVerificationDraft = {
  requestedLimit: number;
  phone: string;
  maskedIdLastFour: string;
  frontDocumentUrl: string;
  backDocumentUrl: string;
  latitude: number;
  longitude: number;
  address?: string;
  locationCapturedAt: string;
  consentedAt: string;
};

export function maskedIdentityNumber(lastFour: string) {
  const digits = lastFour.replace(/\D/g, "");
  return digits.length === 4 ? `XXXX XXXX ${digits}` : "Not provided";
}

export function isCreditVerificationReady(draft: Partial<CreditVerificationDraft>) {
  return Boolean(
    Number.isFinite(draft.requestedLimit) && (draft.requestedLimit ?? 0) >= 500 &&
    /^\d{10}$/.test(draft.phone ?? "") &&
    /^\d{4}$/.test(draft.maskedIdLastFour ?? "") &&
    draft.frontDocumentUrl && draft.backDocumentUrl &&
    Number.isFinite(draft.latitude) && Number.isFinite(draft.longitude) &&
    draft.locationCapturedAt && draft.consentedAt,
  );
}

export function creditVerificationMissingSteps(input: { requestedLimit: number; phone: string; maskedIdLastFour: string; hasFrontDocument: boolean; hasBackDocument: boolean; hasLocation: boolean; consented: boolean }) {
  const missing: string[] = [];
  if (!Number.isFinite(input.requestedLimit) || input.requestedLimit < 500) missing.push("₹500 या ज्यादा credit limit");
  if (!/^\d{10}$/.test(input.phone.replace(/\D/g, ""))) missing.push("registered 10-digit phone");
  if (!/^\d{4}$/.test(input.maskedIdLastFour)) missing.push("masked ID के last 4 digits");
  if (!input.hasFrontDocument) missing.push("front document photo");
  if (!input.hasBackDocument) missing.push("back document photo");
  if (!input.hasLocation) missing.push("current location");
  if (!input.consented) missing.push("consent checkbox");
  return missing;
}

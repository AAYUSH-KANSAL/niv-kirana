const trackingStatuses = ["New", "Packed", "Out for delivery", "Delivered"] as const;

export type TrackingStatus = (typeof trackingStatuses)[number];

export const orderTrackingSteps: { status: TrackingStatus; label: string }[] = [
  { status: "New", label: "Order placed" },
  { status: "Packed", label: "Packed" },
  { status: "Out for delivery", label: "On the way" },
  { status: "Delivered", label: "Delivered" },
];

export function customerOrderStatusLabel(status?: string | null) {
  if (!status) return "Pending";
  const normalized = String(status).toLowerCase();
  if (normalized === "delivered" || normalized === "completed" || normalized === "complete") return "Complete";
  if (normalized === "payment pending" || normalized === "new") return "Pending";
  if (normalized === "cancelled" || normalized === "rejected") return "Cancelled";
  if (normalized === "packed") return "Packed";
  if (normalized === "out for delivery") return "On the way";
  return status;
}


export function customerOrderStatusMessage(status?: string | null) {
  if (!status) return "Order status update ho gaya hai.";
  const normalized = String(status).toLowerCase();
  if (normalized === "delivered" || normalized === "completed" || normalized === "complete") {
    return "Aapka order deliver ho gaya hai.";
  }
  if (normalized === "cancelled" || normalized === "rejected") {
    return "Aapka yeh order cancel ho chuka hai.";
  }
  if (normalized === "packed") {
    return "Aapka saman pack ho gaya hai.";
  }
  if (normalized === "out for delivery") {
    return "Aapka order delivery ke liye nikal chuka hai.";
  }
  if (normalized.includes("payment")) {
    return "UPI payment verification pending hai.";
  }
  if (normalized === "new") {
    return "Aapka order receive ho gaya hai.";
  }
  return "Order status update ho gaya hai.";
}


export function trackingStepState(currentStatus: string, stepStatus: TrackingStatus) {
  if (currentStatus === "Payment pending" || currentStatus === "Cancelled") return "upcoming" as const;
  const currentIndex = trackingStatuses.indexOf(currentStatus as TrackingStatus);
  const stepIndex = trackingStatuses.indexOf(stepStatus);
  if (currentIndex < 0 || stepIndex > currentIndex) return "upcoming" as const;
  return stepIndex === currentIndex ? "current" as const : "complete" as const;
}

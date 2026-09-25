import type { LocalAccountStatus } from "../lib/niv-store";

export function canCustomerSignIn(status?: LocalAccountStatus) {
  return (status ?? "approved") === "approved";
}

export function accountStatusLabel(status?: LocalAccountStatus) {
  switch (status ?? "approved") {
    case "pending":
      return "Pending owner approval";
    case "rejected":
      return "Request declined";
    case "suspended":
      return "Account suspended";
    default:
      return "Approved customer";
  }
}

export function accountStatusIsActive(status?: LocalAccountStatus) {
  return (status ?? "approved") === "approved";
}

export function accountStatusIsPending(status?: LocalAccountStatus) {
  return status === "pending";
}

export function accountStatusIsBlocked(status?: LocalAccountStatus) {
  return status === "rejected" || status === "suspended";
}

export function approvalRequestMessage(status?: LocalAccountStatus) {
  switch (status ?? "approved") {
    case "pending":
      return "आपकी account request Owner approval के लिए भेज दी गई है।";
    case "rejected":
      return "Owner ने अभी इस account request को approve नहीं किया है।";
    case "suspended":
      return "यह account अभी Owner ने temporarily बंद किया है।";
    default:
      return "Account approved है।";
  }
}

export function nextApprovalStatus(action: "approve" | "reject" | "suspend" | "restore"): LocalAccountStatus {
  if (action === "approve" || action === "restore") return "approved";
  if (action === "reject") return "rejected";
  return "suspended";
}

import React from "react";

export interface UniversalScannerProps {
  visible?: boolean;
  onClose?: () => void;
  mode?: "customer" | "admin";
  onProductScanned?: (product: any) => void;
}

export function UniversalScanner(_props: UniversalScannerProps) {
  return null;
}

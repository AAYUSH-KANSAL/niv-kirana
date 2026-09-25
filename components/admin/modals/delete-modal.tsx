import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { LocalCustomerAccount } from "@/lib/niv-store";

interface DeleteModalProps {
  visible: boolean;
  customer: LocalCustomerAccount | null;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
  onClearDues?: (accountId: string) => Promise<void> | void;
}

export function DeleteModal({
  visible,
  customer,
  loading,
  onConfirm,
  onClose,
  onClearDues,
}: DeleteModalProps) {
  if (!customer) return null;

  const dues = customer.credit?.used ?? 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            padding: 20,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 14 }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#FEE2E2",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <MaterialIcons name="delete-forever" size={28} color="#DC2626" />
            </View>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "800",
                color: "#18261F",
                textAlign: "center",
              }}
            >
              Delete Customer Account
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#6E7E73",
                textAlign: "center",
                marginTop: 4,
              }}
            >
              Are you sure you want to delete this customer account?
            </Text>
          </View>

          {/* Pending Credit Dues Warning Banner */}
          {dues > 0 && (
            <View
              style={{
                backgroundColor: "#FEF2F2",
                borderRadius: 14,
                padding: 12,
                borderWidth: 1.5,
                borderColor: "#EF4444",
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                <MaterialIcons name="warning" size={18} color="#DC2626" />
                <Text style={{ fontSize: 13, fontWeight: "900", color: "#DC2626", marginLeft: 6 }}>
                  Pending Khata Dues: ₹{dues}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: "#991B1B", fontWeight: "600", lineHeight: 16 }}>
                Customer par abhi ₹{dues} ke dues baki hain. Delete karne se pehle dues clear (₹0) karna anivarya hai.
              </Text>
              {onClearDues && (
                <TouchableOpacity
                  onPress={() => onClearDues(customer.id)}
                  style={{
                    backgroundColor: "#176B45",
                    paddingVertical: 9,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    marginTop: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name="restart-alt" size={16} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "800", marginLeft: 6 }}>
                    Pehle Dues Clear Karein (₹0)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Target Details Card */}
          <View
            style={{
              backgroundColor: "#FFF5F5",
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: "#FECACA",
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "800", color: "#18261F" }}>
              {customer.customer.name}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: "#DC2626",
                fontWeight: "700",
                marginTop: 2,
              }}
            >
              {customer.customer.phone}
            </Text>
            {customer.customer.email ? (
              <Text style={{ fontSize: 11, color: "#6E7E73", marginTop: 2 }}>
                {customer.customer.email}
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <MaterialIcons name="check-circle" size={14} color="#047857" />
              <Text
                style={{
                  fontSize: 11,
                  color: "#047857",
                  marginLeft: 4,
                  fontWeight: "700",
                  flex: 1,
                }}
              >
                Order history (Delivered / Cancelled) sales analytics ke liye surakshit rahegi.
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#D3DFD8",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#F7FAF5",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#495A50" }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (dues > 0) {
                  return;
                }
                onConfirm();
              }}
              disabled={loading || dues > 0}
              style={{
                flex: 2,
                paddingVertical: 12,
                borderRadius: 14,
                backgroundColor: dues > 0 ? "#9CA3AF" : "#DC2626",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                opacity: dues > 0 ? 0.7 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
              ) : null}
              <Text style={{ fontSize: 13, fontWeight: "800", color: "#FFFFFF" }}>
                {loading
                  ? "Deleting..."
                  : dues > 0
                  ? "Pehle Dues Clear Karein"
                  : "Delete Account"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

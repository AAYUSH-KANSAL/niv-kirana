import React from "react";
import {
  View,
  Text,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { LocalCustomerAccount } from "@/lib/niv-store";

interface SecurityModalProps {
  visible: boolean;
  customer: LocalCustomerAccount | null;
  role: "customer" | "admin";
  onRoleChange: (role: "customer" | "admin") => void;
  status: "approved" | "suspended";
  onStatusChange: (status: "approved" | "suspended") => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export function SecurityModal({
  visible,
  customer,
  role,
  onRoleChange,
  status,
  onStatusChange,
  saving,
  onSave,
  onClose,
}: SecurityModalProps) {
  if (!customer) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
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
              maxWidth: 440,
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
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: "#EFF7E2",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 10,
                  }}
                >
                  <MaterialIcons name="security" size={20} color="#176B45" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#18261F" }}>
                    Security & Access
                  </Text>
                  <Text style={{ fontSize: 11, color: "#6E7E73" }}>
                    Manage role and account access
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={22} color="#6E7E73" />
              </TouchableOpacity>
            </View>

            {/* Customer Info Card */}
            <View
              style={{
                backgroundColor: "#F7FAF5",
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: "#DCECCB",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#18261F" }}>
                {customer.customer.name}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: "#176B45",
                  fontWeight: "700",
                  marginTop: 2,
                }}
              >
                {customer.customer.phone}
              </Text>
              {customer.customer.email ? (
                <Text style={{ fontSize: 11, color: "#495A50", marginTop: 2 }}>
                  {customer.customer.email}
                </Text>
              ) : null}
            </View>

            {/* Section 1: Role Selection */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: "#6E7E73",
                letterSpacing: 0.5,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              System Role
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => onRoleChange("customer")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: role === "customer" ? "#176B45" : "#E2EBE5",
                  backgroundColor: role === "customer" ? "#EFF7E2" : "#FFFFFF",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <MaterialIcons
                    name={
                      role === "customer"
                        ? "radio-button-checked"
                        : "radio-button-unchecked"
                    }
                    size={18}
                    color={role === "customer" ? "#176B45" : "#9AA89F"}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: "#18261F",
                      marginLeft: 6,
                    }}
                  >
                    Customer
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: "#6E7E73" }}>
                  Can shop, place orders, and manage credit khata.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onRoleChange("admin")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: role === "admin" ? "#1E40AF" : "#E2EBE5",
                  backgroundColor: role === "admin" ? "#EFF6FF" : "#FFFFFF",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <MaterialIcons
                    name={
                      role === "admin"
                        ? "radio-button-checked"
                        : "radio-button-unchecked"
                    }
                    size={18}
                    color={role === "admin" ? "#1E40AF" : "#9AA89F"}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: "#18261F",
                      marginLeft: 6,
                    }}
                  >
                    Store Admin
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: "#6E7E73" }}>
                  Full access to Admin Console, stock, and orders.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Section 2: Account Access (Active vs Suspended) */}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: "#6E7E73",
                letterSpacing: 0.5,
                marginBottom: 8,
                textTransform: "uppercase",
              }}
            >
              Account Access
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => onStatusChange("approved")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: status === "approved" ? "#176B45" : "#E2EBE5",
                  backgroundColor: status === "approved" ? "#EFF7E2" : "#FFFFFF",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <MaterialIcons
                    name={
                      status === "approved"
                        ? "check-circle"
                        : "radio-button-unchecked"
                    }
                    size={18}
                    color={status === "approved" ? "#176B45" : "#9AA89F"}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: "#18261F",
                      marginLeft: 6,
                    }}
                  >
                    Active
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: "#6E7E73" }}>
                  Can log in and make purchases normally.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onStatusChange("suspended")}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: status === "suspended" ? "#DC2626" : "#E2EBE5",
                  backgroundColor: status === "suspended" ? "#FFF1F0" : "#FFFFFF",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <MaterialIcons
                    name={
                      status === "suspended" ? "block" : "radio-button-unchecked"
                    }
                    size={18}
                    color={status === "suspended" ? "#DC2626" : "#9AA89F"}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "800",
                      color: "#18261F",
                      marginLeft: 6,
                    }}
                  >
                    Suspended
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: "#6E7E73" }}>
                  Blocked from logging in and placing new orders.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={onClose}
                disabled={saving}
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
                onPress={onSave}
                disabled={saving}
                style={{
                  flex: 2,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: "#176B45",
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                }}
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                ) : null}
                <Text style={{ fontSize: 13, fontWeight: "800", color: "#FFFFFF" }}>
                  {saving ? "Saving..." : "Save Permissions"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Switch, Alert, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  updateOwnerPassword,
  resetOwnerPasswordToDefault,
  forceResetOwnerPassword,
  getDefaultOwnerPassword,
} from "@/lib/owner-credentials";
import { setOwnerBiometricEnabled } from "@/lib/owner-biometric";

interface SecurityTabProps {
  biometricEnabled: boolean;
  onBiometricToggle: (enabled: boolean) => void;
}

export function SecurityTab({
  biometricEnabled,
  onBiometricToggle,
}: SecurityTabProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Fast direct reset state
  const [directResetOpen, setDirectResetOpen] = useState(false);
  const [directNewPassword, setDirectNewPassword] = useState("");
  const [directConfirmPassword, setDirectConfirmPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const handleUpdatePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim()) {
      Alert.alert("Invalid Input", "Please enter your current and new password.");
      return;
    }
    if (newPassword.trim().length < 6) {
      Alert.alert("Weak Password", "New password must be at least 6 characters.");
      return;
    }
    if (confirmPassword.trim() && newPassword.trim() !== confirmPassword.trim()) {
      Alert.alert("Mismatch", "New password and confirm password do not match.");
      return;
    }

    setUpdating(true);
    try {
      const res = await updateOwnerPassword(oldPassword.trim(), newPassword.trim());
      if (res) {
        Alert.alert(
          "Success",
          "Owner master password updated successfully! Next time is password se login karein."
        );
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        Alert.alert("Authentication Failed", "Current password is incorrect. Agar password yaad nahi hai toh neeche 'Reset Master Password' option use karein.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update password.");
    } finally {
      setUpdating(false);
    }
  };

  const handleResetToDefault = () => {
    const defaultPass = getDefaultOwnerPassword();
    Alert.alert(
      "Reset to Default Password",
      `Kya aap admin master password ko default password "${defaultPass}" par reset karna chahte hain?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Reset Password",
          style: "destructive",
          onPress: async () => {
            setResetting(true);
            try {
              await resetOwnerPasswordToDefault();
              Alert.alert(
                "Password Reset Successful",
                `Admin master password successfully reset ho gaya hai.\n\nDefault Password: ${defaultPass}\n\nAb aap is password se login kar sakte hain ya naya password set kar sakte hain.`
              );
              setOldPassword("");
              setNewPassword("");
              setConfirmPassword("");
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to reset password.");
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  const handleDirectForceReset = async () => {
    if (!directNewPassword.trim()) {
      Alert.alert("Invalid Input", "Please enter a new password.");
      return;
    }
    if (directNewPassword.trim().length < 6) {
      Alert.alert("Weak Password", "New password must be at least 6 characters.");
      return;
    }
    if (directConfirmPassword.trim() && directNewPassword.trim() !== directConfirmPassword.trim()) {
      Alert.alert("Mismatch", "New password and confirm password do not match.");
      return;
    }

    setResetting(true);
    try {
      const ok = await forceResetOwnerPassword(directNewPassword.trim());
      if (ok) {
        Alert.alert(
          "Password Reset Done",
          "Naya master password directly save ho gaya hai bina purana password maange! Ab aap is password se login kar sakte hain."
        );
        setDirectNewPassword("");
        setDirectConfirmPassword("");
        setDirectResetOpen(false);
      } else {
        Alert.alert("Error", "Could not set new password. Please try again.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  };

  const handleToggleBiometric = async (val: boolean) => {
    await setOwnerBiometricEnabled(val);
    onBiometricToggle(val);
  };

  return (
    <View className="space-y-4">
      {/* Biometric Toggle Card */}
      <View className="rounded-2xl bg-surface border border-border p-4 mb-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-3">
            <View className="h-10 w-10 rounded-2xl bg-[#EAF4D9] items-center justify-center mr-3">
              <MaterialIcons name="fingerprint" size={24} color="#176B45" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-black text-foreground">
                Biometric Login
              </Text>
              <Text className="text-xs text-muted mt-0.5">
                Use fingerprint or Face ID to quickly unlock the Admin Console.
              </Text>
            </View>
          </View>

          <Switch
            value={biometricEnabled}
            onValueChange={handleToggleBiometric}
            trackColor={{ false: "#D1D5DB", true: "#A7D948" }}
            thumbColor={biometricEnabled ? "#176B45" : "#FFFFFF"}
          />
        </View>
      </View>

      {/* Password Change Card */}
      <View className="rounded-2xl bg-surface border border-border p-4 mb-3">
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center">
            <MaterialIcons name="lock" size={20} color="#176B45" />
            <Text className="text-base font-black text-foreground ml-2">
              Change Master Password
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-[11px] font-bold text-[#176B45]">
              {showPassword ? "Hide Passwords" : "Show Passwords"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-muted mb-4">
          Update the security credentials used to access the Store Owner portal.
        </Text>

        {/* Current Password */}
        <View className="mb-3">
          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-1">
            Current Password
          </Text>
          <TextInput
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry={!showPassword}
            placeholder="Enter current password"
            placeholderTextColor="#74847A"
            className="rounded-xl bg-[#F7FAF5] border border-[#DCECCB] px-3.5 py-2.5 text-xs text-foreground"
          />
        </View>

        {/* New Password */}
        <View className="mb-3">
          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-1">
            New Password (minimum 6 characters)
          </Text>
          <TextInput
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            placeholder="Enter new strong password"
            placeholderTextColor="#74847A"
            className="rounded-xl bg-[#F7FAF5] border border-[#DCECCB] px-3.5 py-2.5 text-xs text-foreground"
          />
        </View>

        {/* Confirm New Password */}
        <View className="mb-4">
          <Text className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-1">
            Confirm New Password
          </Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            placeholder="Re-enter new password"
            placeholderTextColor="#74847A"
            className="rounded-xl bg-[#F7FAF5] border border-[#DCECCB] px-3.5 py-2.5 text-xs text-foreground"
          />
        </View>

        {/* Submit Button with explicit style */}
        <TouchableOpacity
          onPress={handleUpdatePassword}
          disabled={updating}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#176B45",
            borderRadius: 14,
            paddingVertical: 13,
            alignItems: "center",
            justifyContent: "center",
            elevation: 2,
            shadowColor: "#176B45",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "900" }}>
            {updating ? "Updating Master Password..." : "Update Master Password"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Password Reset Options Card */}
      <View className="rounded-2xl bg-surface border border-border p-4 mb-8">
        <View className="flex-row items-center mb-1">
          <MaterialIcons name="restart-alt" size={20} color="#D97706" />
          <Text className="text-base font-black text-foreground ml-2">
            Reset Password Options
          </Text>
        </View>
        <Text className="text-xs text-muted mb-4">
          Purana password bhool gaye ya emergency reset chahiye? Yahan se directly reset karein.
        </Text>

        {/* Fast Action 1: Reset to default */}
        <TouchableOpacity
          onPress={handleResetToDefault}
          disabled={resetting}
          activeOpacity={0.85}
          style={{
            backgroundColor: "#FEF3C7",
            borderColor: "#F59E0B",
            borderWidth: 1,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <View className="flex-row items-center flex-1 mr-2">
            <MaterialIcons name="lock-reset" size={20} color="#B45309" />
            <View className="ml-2.5 flex-1">
              <Text style={{ fontSize: 12, fontWeight: "900", color: "#92400E" }}>
                Reset to Default Password
              </Text>
              <Text style={{ fontSize: 11, color: "#B45309", marginTop: 2 }}>
                Default: {getDefaultOwnerPassword()}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color="#B45309" />
        </TouchableOpacity>

        {/* Fast Action 2: Direct Reset toggle */}
        <TouchableOpacity
          onPress={() => setDirectResetOpen(!directResetOpen)}
          activeOpacity={0.85}
          style={{
            backgroundColor: directResetOpen ? "#EAF4D9" : "#F7FAF5",
            borderColor: directResetOpen ? "#176B45" : "#DCECCB",
            borderWidth: 1,
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View className="flex-row items-center flex-1 mr-2">
            <MaterialIcons name="edit" size={18} color="#176B45" />
            <View className="ml-2.5 flex-1">
              <Text style={{ fontSize: 12, fontWeight: "900", color: "#14221B" }}>
                Directly Set New Password (No Old Password Needed)
              </Text>
              <Text style={{ fontSize: 10.5, color: "#5C6E63", marginTop: 2 }}>
                Kyunki aap already logged-in admin hain, directly naya password daal sakte hain.
              </Text>
            </View>
          </View>
          <MaterialIcons
            name={directResetOpen ? "expand-less" : "expand-more"}
            size={20}
            color="#176B45"
          />
        </TouchableOpacity>

        {/* Direct Reset Form */}
        {directResetOpen ? (
          <View className="mt-3 pt-3 border-t border-[#DCECCB]">
            <View className="mb-2.5">
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-1">
                New Master Password
              </Text>
              <TextInput
                value={directNewPassword}
                onChangeText={setDirectNewPassword}
                secureTextEntry={!showPassword}
                placeholder="Enter new password (min 6 chars)"
                placeholderTextColor="#74847A"
                className="rounded-xl bg-[#F7FAF5] border border-[#DCECCB] px-3.5 py-2.5 text-xs text-foreground"
              />
            </View>

            <View className="mb-3">
              <Text className="text-[11px] font-extrabold uppercase tracking-wider text-muted mb-1">
                Confirm New Master Password
              </Text>
              <TextInput
                value={directConfirmPassword}
                onChangeText={setDirectConfirmPassword}
                secureTextEntry={!showPassword}
                placeholder="Re-enter new password"
                placeholderTextColor="#74847A"
                className="rounded-xl bg-[#F7FAF5] border border-[#DCECCB] px-3.5 py-2.5 text-xs text-foreground"
              />
            </View>

            <TouchableOpacity
              onPress={handleDirectForceReset}
              disabled={resetting}
              activeOpacity={0.85}
              style={{
                backgroundColor: "#176B45",
                borderRadius: 14,
                paddingVertical: 12,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 12.5, fontWeight: "900" }}>
                {resetting ? "Resetting Password..." : "Save New Password Directly"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}

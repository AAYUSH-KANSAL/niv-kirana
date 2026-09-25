import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

export default function OwnerTabRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin" as never);
  }, [router]);
  return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
}

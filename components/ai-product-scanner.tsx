import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { type Product } from "@/lib/niv-store";
import { trpc } from "@/lib/trpc";
import { hasScannablePhotoData } from "@/shared/camera-scan";
import { createProductScanFallback } from "@/shared/product-scan-fallback";

type ProductDraft = ReturnType<typeof createProductScanFallback>;
type ScannablePhoto = { uri: string; base64?: string | null; mimeType?: string | null };

export function AiProductScanner({ onCreateProduct }: { onCreateProduct: (product: Omit<Product, "id">) => void }) {
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [scanAsset, setScanAsset] = useState<ScannablePhoto | null>(null);
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [sellingPrice, setSellingPrice] = useState("");
  const [stock, setStock] = useState("10");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const scanProduct = trpc.niv.scanProductPhoto.useMutation();

  const updateDraft = (next: Partial<ProductDraft>) => setDraft((current) => current ? { ...current, ...next } : current);
  const processPhoto = async (asset: ScannablePhoto) => {
    const rawBase64 = asset.base64?.includes(",") ? asset.base64.slice(asset.base64.indexOf(",") + 1) : asset.base64;
    if (!hasScannablePhotoData(rawBase64)) { Alert.alert("Photo unavailable", "कृपया product packet की photo फिर से लें।"); return; }
    const immediateDraft = createProductScanFallback(asset.uri);
    const mimeType = asset.mimeType?.startsWith("image/") ? asset.mimeType : "image/jpeg";
    const imageDataUrl = rawBase64?.startsWith("data:image/") ? rawBase64 : `data:${mimeType};base64,${rawBase64}`;
    setScanAsset({ ...asset, base64: rawBase64, mimeType });
    setPreviewUri(asset.uri);
    setDraft(immediateDraft);
    setSellingPrice("");
    try {
      const response = await scanProduct.mutateAsync({ imageDataUrl });
      const detectedName = typeof response.productName === "string" ? response.productName.trim() : "";
      const name = detectedName && !/needs review|not visible|unknown/i.test(detectedName) ? detectedName : "";
      setDraft({ name, mrp: response.mrp, category: response.category, unit: response.unit, imageUrl: response.imageUrl || asset.uri, note: name ? response.note : "AI को product name साफ नहीं मिला। Try AI scan again करें या नाम manually भरें।" });
      setSellingPrice(response.mrp ? String(response.mrp) : "");
    } catch {
      setDraft((current) => current ? { ...current, note: "AI scan complete नहीं हुआ। Try AI scan again करें या product name, MRP, selling price और stock manually भरें।" } : immediateDraft);
    }
  };

  const openCamera = async () => {
    if (!cameraPermission?.granted) { const permission = await requestCameraPermission(); if (!permission.granted) { Alert.alert("Camera permission", "Click photo के लिए camera permission allow करें।"); return; } }
    setCameraReady(false); setCameraOpen(true);
  };
  const captureProductPhoto = async () => { const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.65, skipProcessing: false }); if (!photo) return; setCameraOpen(false); await processPhoto({ uri: photo.uri, base64: photo.base64, mimeType: "image/jpeg" }); };
  const selectPhoto = async () => { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], base64: true, quality: 0.65, allowsEditing: false }); if (!result.canceled && result.assets[0]) await processPhoto(result.assets[0]); };
  const saveScannedProduct = () => {
    if (!draft) return;
    const price = Number(sellingPrice); const quantity = Number(stock);
    if (!draft.name.trim()) { Alert.alert("Product name", "AI result का इंतजार करें या product name manually भरें।"); return; }
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity < 0) { Alert.alert("Price and stock", "Selling price और stock quantity सही भरें।"); return; }
    onCreateProduct({ name: draft.name.trim(), price, stock: Math.floor(quantity), category: draft.category || "Staples", unit: draft.unit || "1 pack", icon: "📦", imageUrl: draft.imageUrl, mrp: draft.mrp ?? undefined });
    Alert.alert("Product added", `${draft.name} inventory में add हो गया है।`);
    setPreviewUri(null); setScanAsset(null); setDraft(null); setSellingPrice(""); setStock("10");
  };

  return <View className="rounded-3xl bg-[#EAF4D9] border border-[#D4EAB0] p-4 mb-4"><View className="flex-row items-start"><View className="h-11 w-11 rounded-2xl bg-primary items-center justify-center"><MaterialIcons name="document-scanner" size={22} color="#FFF9EF" /></View><View className="flex-1 ml-3"><Text className="text-base font-extrabold text-foreground">AI Product Scanner</Text><Text className="text-xs leading-5 text-muted mt-1">Photo के तुरंत बाद review form खुलेगा। AI name और MRP भर देगा; जरूरत हो तो आप details बदल सकते हैं।</Text></View></View>{previewUri ? <Image source={{ uri: previewUri }} className="h-40 w-full rounded-2xl bg-surface mt-4" resizeMode="cover" /> : null}{draft ? <View className="rounded-2xl bg-background p-4 mt-4"><View className="flex-row items-center justify-between"><Text className="text-[10px] font-bold tracking-widest text-primary">PRODUCT REVIEW — SAVE AFTER CHECK</Text>{scanProduct.isPending ? <View className="flex-row items-center"><ActivityIndicator size="small" color="#176B45" /><Text className="ml-2 text-[10px] font-bold text-primary">AI reading...</Text></View> : null}</View><Text className="text-[10px] font-bold text-muted mt-4 mb-1">PRODUCT NAME</Text><TextInput value={draft.name} onChangeText={(name) => updateDraft({ name })} placeholder="AI will detect product name" placeholderTextColor="#74847A" className="rounded-xl border border-border bg-surface px-3 py-3 text-sm font-bold text-foreground" /><View className="flex-row mt-3"><View className="flex-1 mr-2"><Text className="text-[10px] font-bold text-muted mb-1">MRP ON PACKET</Text><TextInput value={draft.mrp ? String(draft.mrp) : ""} onChangeText={(value) => updateDraft({ mrp: Number(value) > 0 ? Number(value) : null })} keyboardType="decimal-pad" placeholder="AI MRP" placeholderTextColor="#74847A" className="rounded-xl border border-border bg-surface px-3 py-3 text-sm font-bold text-foreground" /></View><View className="flex-1"><Text className="text-[10px] font-bold text-muted mb-1">PACK SIZE</Text><TextInput value={draft.unit} onChangeText={(unit) => updateDraft({ unit })} placeholder="e.g. 100 g" placeholderTextColor="#74847A" className="rounded-xl border border-border bg-surface px-3 py-3 text-sm font-bold text-foreground" /></View></View><Text className="text-xs leading-5 text-muted mt-3">{draft.note}</Text>{!scanProduct.isPending && scanAsset && !draft.name ? <TouchableOpacity onPress={() => void processPhoto(scanAsset)} activeOpacity={0.82} className="self-start rounded-full bg-[#EAF4D9] px-3 py-2 mt-3"><Text className="text-[10px] font-extrabold text-primary">Try AI scan again</Text></TouchableOpacity> : null}<View className="flex-row mt-4"><View className="flex-1 mr-2"><Text className="text-[10px] font-bold text-muted mb-1">YOUR SELLING PRICE</Text><TextInput value={sellingPrice} onChangeText={setSellingPrice} keyboardType="decimal-pad" placeholder="₹ price" placeholderTextColor="#74847A" className="rounded-xl border border-border bg-surface px-3 py-3 text-sm font-bold text-foreground" /></View><View className="flex-1"><Text className="text-[10px] font-bold text-muted mb-1">STOCK QUANTITY</Text><TextInput value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder="Units" placeholderTextColor="#74847A" className="rounded-xl border border-border bg-surface px-3 py-3 text-sm font-bold text-foreground" /></View></View><TouchableOpacity onPress={saveScannedProduct} activeOpacity={0.82} className="rounded-2xl bg-primary py-3.5 items-center mt-4"><Text className="text-sm font-extrabold text-background">Add scanned product</Text></TouchableOpacity></View> : null}<View className="flex-row mt-4"><TouchableOpacity onPress={() => void openCamera()} disabled={scanProduct.isPending} activeOpacity={0.82} className="flex-1 flex-row items-center justify-center rounded-2xl bg-primary py-3 mr-2"><MaterialIcons name="photo-camera" size={18} color="#FFF9EF" /><Text className="ml-2 text-xs font-bold text-background">Click photo</Text></TouchableOpacity><TouchableOpacity onPress={() => void selectPhoto()} disabled={scanProduct.isPending} activeOpacity={0.82} className="flex-1 flex-row items-center justify-center rounded-2xl border border-primary bg-background py-3"><MaterialIcons name="photo-library" size={18} color="#176B45" /><Text className="ml-2 text-xs font-bold text-primary">Upload photo</Text></TouchableOpacity></View><Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}><View style={styles.cameraShell}><CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" onCameraReady={() => setCameraReady(true)} /><View className="flex-1 justify-between px-5 pt-16 pb-10"><View className="flex-row items-center justify-between"><View className="rounded-2xl bg-black/55 px-4 py-3"><Text className="text-sm font-extrabold text-white">Product packet को frame में रखें</Text><Text className="text-xs text-white/80 mt-1">MRP और product name साफ दिखना चाहिए</Text></View><TouchableOpacity onPress={() => setCameraOpen(false)} className="h-11 w-11 rounded-2xl bg-black/55 items-center justify-center"><MaterialIcons name="close" size={23} color="#FFFFFF" /></TouchableOpacity></View><View className="items-center"><TouchableOpacity disabled={!cameraReady} onPress={() => void captureProductPhoto()} activeOpacity={0.82} className={`h-20 w-20 rounded-full border-4 border-white items-center justify-center ${cameraReady ? "bg-primary" : "bg-white/40"}`}><MaterialIcons name="photo-camera" size={30} color="#FFFFFF" /></TouchableOpacity><Text className="text-xs font-bold text-white mt-3">{cameraReady ? "Tap to capture" : "Camera starting..."}</Text></View></View></View></Modal></View>;
}

const styles = StyleSheet.create({ cameraShell: { flex: 1, backgroundColor: "#000000" } });

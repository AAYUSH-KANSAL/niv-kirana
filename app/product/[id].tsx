import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, Modal, StatusBar, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { getApiBaseUrl } from "@/constants/oauth";
import { money, type Product, useNivStore } from "@/lib/niv-store";
import { resolveProductImageUri } from "@/lib/product-image";
import { relatedProductsFor, relatedProductsLabel } from "@/lib/product-recommendations";
import { normalizeProductVariants, selectedProductVariant, variantTotal } from "@/shared/product-variants";
import { normalizeProductImageUrls } from "@/shared/product-images";
import { galleryIndexFor } from "@/shared/product-gallery";
import { recommendationAddButtonLabel, recommendationQuantityLabel } from "@/shared/recommendation-cart";

export default function ProductDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { products, getProduct, cart, addToCart, changeQuantity } = useNivStore();
  const product = getProduct(productId);
  const variants = useMemo(() => normalizeProductVariants(product?.variants), [product?.variants]);
  const productImages = useMemo(() => normalizeProductImageUrls(product?.imageUrls, product?.imageUrl), [product?.imageUrls, product?.imageUrl]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(product?.variants?.[0]?.id);
  const selectedVariant = selectedProductVariant(variants, selectedVariantId);
  const selectedUnit = selectedVariant?.label ?? product?.unit ?? "1 unit";
  const selectedPrice = selectedVariant?.price ?? product?.price ?? 0;
  const cartQuantity = product ? cart.find((line) => line.productId === product.id && line.variantId === selectedVariant?.id)?.quantity ?? 0 : 0;
  const [quantity, setQuantity] = useState(1);
  const relatedProducts = useMemo(() => product ? relatedProductsFor(product, products) : [], [product, products]);

  if (!product) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5"><View className="flex-1 items-center justify-center"><View className="h-16 w-16 rounded-3xl bg-[#EAF4D9] items-center justify-center"><MaterialIcons name="inventory-2" size={30} color="#176B45" /></View><Text className="text-xl font-extrabold text-foreground mt-5">Product नहीं मिला</Text><Text className="text-sm text-muted text-center mt-2">यह product हटाया जा चुका है या catalog अभी refresh हो रहा है।</Text><TouchableOpacity onPress={() => router.back()} activeOpacity={0.82} className="rounded-2xl bg-[#176B45] px-5 py-3 mt-6"><Text className="text-sm font-bold text-white">Shop पर वापस जाएँ</Text></TouchableOpacity></View></ScreenContainer>;
  }

  const inStock = product.stock > 0;
  const added = cartQuantity > 0;
  const selectedTotal = variantTotal(selectedPrice, quantity);
  const addSelectedQuantity = () => { addToCart(product.id, quantity, selectedPrice, selectedVariant?.id, selectedUnit); setQuantity(1); };
  const sectionLabel = relatedProductsLabel(product);

  return <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-4" containerClassName="bg-background">
    <FlatList
      data={relatedProducts}
      keyExtractor={(item) => item.id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 28 }}
      ListHeaderComponent={<View>
        <View className="flex-row items-center justify-between pt-2 pb-5"><TouchableOpacity accessibilityLabel="Shop पर वापस जाएँ" onPress={() => router.back()} activeOpacity={0.8} className="h-11 w-11 rounded-2xl border border-border bg-surface items-center justify-center"><MaterialIcons name="arrow-back" size={23} color="#183327" /></TouchableOpacity><Text numberOfLines={1} className="flex-1 text-center text-base font-extrabold text-foreground mx-3">Product details</Text><TouchableOpacity accessibilityLabel="Cart खोलें" onPress={() => router.push("/cart" as never)} activeOpacity={0.8} style={{ backgroundColor: cartQuantity > 0 ? "#176B45" : "#EAF4D9", borderColor: cartQuantity > 0 ? "#176B45" : "#CFE6B6", borderWidth: 1 }} className="h-11 w-11 rounded-2xl items-center justify-center relative"><MaterialIcons name="shopping-bag" size={21} color={cartQuantity > 0 ? "#FFFFFF" : "#176B45"} />{cartQuantity > 0 ? <View style={{ backgroundColor: "#FFFFFF" }} className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full items-center justify-center"><Text style={{ color: "#176B45" }} className="text-[10px] font-black">{cartQuantity}</Text></View> : null}</TouchableOpacity></View>
        <View className="rounded-[30px] border border-border bg-surface p-4"><ProductImageGallery product={product} imageUrls={productImages} /><View className="flex-row items-start justify-between mt-5"><View className="flex-1 pr-3"><View className="self-start rounded-full bg-[#EAF4D9] px-3 py-1"><Text className="text-[10px] tracking-wide font-bold text-[#176B45]">{product.category.toUpperCase()}</Text></View><Text className="text-[27px] leading-8 font-extrabold text-foreground mt-3">{product.name}</Text><Text className="text-sm text-muted mt-2">{selectedUnit} · Local delivery available today</Text></View><Text className="text-[25px] font-extrabold text-[#176B45]">{money(selectedPrice)}</Text></View>{product.mrp ? <Text className="text-xs text-muted mt-3">MRP: {money(product.mrp)}</Text> : null}{product.description ? <Text className="text-xs text-[#5C6E63] mt-2 leading-5">{product.description}</Text> : null}</View>
        <View className="rounded-[26px] bg-[#EAF4D9] border border-[#CFE6B6] p-4 mt-4">{variants.length ? <View><Text className="text-sm font-extrabold text-foreground">Choose pack size</Text><Text className="text-xs text-muted mt-1">Owner द्वारा set किया गया size और price चुनें।</Text><View className="flex-row flex-wrap mt-3">{variants.map((variant) => <TouchableOpacity key={variant.id} onPress={() => { setSelectedVariantId(variant.id); setQuantity(1); }} activeOpacity={0.82} className={`rounded-2xl px-3 py-2 mr-2 mb-2 ${selectedVariant?.id === variant.id ? "bg-[#176B45]" : "bg-white border border-[#E2E8D8]"}`}><Text className={`text-xs font-extrabold ${selectedVariant?.id === variant.id ? "text-white" : "text-foreground"}`}>{variant.label}</Text><Text className={`text-[10px] mt-0.5 ${selectedVariant?.id === variant.id ? "text-white" : "text-[#176B45]"}`}>{money(variant.price)}</Text></TouchableOpacity>)}</View></View> : null}<View className="flex-row items-center justify-between mt-4"><View><Text className="text-sm font-extrabold text-foreground">Quantity</Text><Text className="text-xs text-muted mt-1">{inStock ? `${product.stock} units available` : "यह product अभी out of stock है"}</Text></View><View className="flex-row items-center rounded-2xl bg-white border border-[#CFE6B6] px-2 py-2"><TouchableOpacity accessibilityLabel="Quantity कम करें" disabled={!inStock || quantity <= 1} onPress={() => setQuantity((current) => Math.max(1, current - 1))} activeOpacity={0.8} className="h-9 w-9 rounded-xl items-center justify-center"><MaterialIcons name="remove" size={20} color={quantity > 1 && inStock ? "#176B45" : "#B7C9BC"} /></TouchableOpacity><Text className="w-9 text-center text-base font-extrabold text-foreground">{inStock ? quantity : "—"}</Text><TouchableOpacity accessibilityLabel="Quantity बढ़ाएँ" disabled={!inStock || quantity >= product.stock} onPress={() => setQuantity((current) => Math.min(product.stock, current + 1))} activeOpacity={0.8} className="h-9 w-9 rounded-xl bg-[#176B45] items-center justify-center"><MaterialIcons name="add" size={20} color={inStock && quantity < product.stock ? "#FFFFFF" : "#B7C9BC"} /></TouchableOpacity></View></View>{inStock ? <View className="rounded-2xl bg-white border border-[#CFE6B6] px-4 py-3 mt-4 flex-row items-center justify-between"><Text className="text-xs font-bold text-muted">{money(selectedPrice)} × {quantity}</Text><Text className="text-base font-extrabold text-[#176B45]">{money(selectedTotal)}</Text></View> : null}<TouchableOpacity accessibilityLabel={added ? `${product.name} cart में added है` : `${product.name} cart में add करें`} disabled={!inStock} onPress={addSelectedQuantity} activeOpacity={0.82} className={`rounded-2xl py-4 items-center mt-4 ${inStock ? (added ? "bg-[#176B45]" : "bg-[#176B45]") : "bg-border"}`}>{added ? <View className="flex-row items-center"><MaterialIcons name="check-circle" size={19} color="#FFFFFF" /><Text className="ml-2 text-sm font-extrabold text-white">Added · Add {quantity} more · {money(selectedTotal)}</Text></View> : <Text className="text-sm font-extrabold text-white">Add {quantity} to cart · {money(selectedTotal)}</Text>}</TouchableOpacity></View>
        <View className="flex-row items-center justify-between mt-7 mb-3"><View><Text className="text-lg font-extrabold text-foreground">{sectionLabel}</Text><Text className="text-xs text-muted mt-1">You may also need these</Text></View><MaterialIcons name="auto-awesome" size={21} color="#176B45" /></View>
        {relatedProducts.length === 0 ? <View className="rounded-2xl border border-[#CFE6B6] bg-[#EAF4D9] px-4 py-4 mb-4"><Text className="text-sm font-bold text-foreground">Related products coming soon</Text><Text className="text-xs leading-5 text-muted mt-1">Owner जब mirch, dhaniya या अन्य matching products catalog में जोड़ेंगे, वे यहाँ automatically recommend होंगे।</Text></View> : null}
      </View>}
      renderItem={({ item }) => { const currentQuantity = cart.filter((line) => line.productId === item.id && !line.variantId).reduce((sum, line) => sum + line.quantity, 0); return <RelatedProductCard product={item} cartQuantity={currentQuantity} onOpen={() => router.push(`/product/${item.id}` as never)} onCommitQuantity={(targetQuantity: number) => { const delta = targetQuantity - currentQuantity; if (delta > 0) addToCart(item.id, delta); else if (delta < 0) changeQuantity(item.id, delta); }} />; }}
    />
  </ScreenContainer>;
}

function RelatedProductCard({ product, cartQuantity, onOpen, onCommitQuantity }: { product: Product; cartQuantity: number; onOpen: () => void; onCommitQuantity: (targetQuantity: number) => void }) {
  const [draftQuantity, setDraftQuantity] = useState(cartQuantity);
  useEffect(() => setDraftQuantity(cartQuantity), [cartQuantity]);
  const inStock = product.stock > 0;
  const canIncrease = inStock && draftQuantity < product.stock;
  const canAdd = inStock && draftQuantity !== cartQuantity;
  const addSuccess = inStock && draftQuantity > 0 && draftQuantity === cartQuantity;
  const commitQuantity = () => {
    if (!canAdd) return;
    onCommitQuantity(draftQuantity);
  };
  const quantityLabel = recommendationQuantityLabel(draftQuantity);
  const addButtonLabel = recommendationAddButtonLabel(draftQuantity);
  return <View className="flex-row rounded-[24px] border border-border bg-surface p-3 mb-3"><TouchableOpacity accessibilityLabel={`${product.name} details खोलें`} onPress={onOpen} activeOpacity={0.82} className="h-20 w-20 rounded-2xl overflow-hidden"><ProductPhoto product={product} className="h-full w-full" iconSize="text-3xl" /></TouchableOpacity><TouchableOpacity onPress={onOpen} activeOpacity={0.82} className="flex-1 justify-center px-3"><Text numberOfLines={1} className="text-sm font-extrabold text-foreground">{product.name}</Text><Text className="text-xs text-muted mt-1">{product.unit} · {money(product.price)}</Text><Text className="text-[10px] font-bold text-success mt-2">{inStock ? "Ready today" : "Out of stock"}</Text></TouchableOpacity><View className="self-center items-end"><View className="flex-row items-center"><View className="flex-row items-center rounded-xl border border-[#CFE6B6] bg-white p-1"><TouchableOpacity accessibilityLabel={`${product.name} quantity घटाएँ`} disabled={draftQuantity <= 0} onPress={() => setDraftQuantity((current) => Math.max(0, current - 1))} hitSlop={6} activeOpacity={0.8} className="h-8 w-8 rounded-lg items-center justify-center"><MaterialIcons name="remove" size={18} color={draftQuantity > 0 ? "#176B45" : "#B7C9BC"} /></TouchableOpacity><Text accessibilityLabel={`${product.name} quantity ${cartQuantity}`} className="min-w-7 text-center text-sm font-extrabold text-foreground">{quantityLabel || "0"}</Text><TouchableOpacity accessibilityLabel={`${product.name} quantity बढ़ाएँ`} disabled={!canIncrease} onPress={() => setDraftQuantity((current) => Math.min(product.stock, current + 1))} hitSlop={6} activeOpacity={0.8} className={`h-8 w-8 rounded-lg items-center justify-center ${canIncrease ? "bg-[#176B45]" : "bg-border"}`}><MaterialIcons name="add" size={18} color={canIncrease ? "#FFFFFF" : "#74847A"} /></TouchableOpacity></View><TouchableOpacity accessibilityLabel={`${product.name} ${addButtonLabel}`} disabled={!canAdd} onPress={commitQuantity} activeOpacity={0.82} className={`mt-2 rounded-lg px-2.5 py-2 ${addSuccess ? "bg-[#176B45]" : canAdd ? "bg-[#176B45]" : "bg-border"}`}>{addSuccess ? <View className="flex-row items-center"><MaterialIcons name="check" size={14} color="#FFFFFF" /><Text numberOfLines={1} className="ml-1 text-[10px] font-extrabold text-white">Added</Text></View> : <Text numberOfLines={1} className={`text-[10px] font-extrabold ${canAdd ? "text-white" : "text-muted"}`}>{addButtonLabel}</Text>}</TouchableOpacity></View></View></View>;
}

function ProductImageGallery({ product, imageUrls }: { product: Product; imageUrls: string[] }) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const { width } = useWindowDimensions();
  const apiBaseUrl = getApiBaseUrl();
  const pageWidth = Math.max(260, Math.min(720, width - 64));
  if (imageUrls.length === 0) return <ProductPhoto product={product} className="h-72 w-full rounded-[22px]" iconSize="text-8xl" />;
  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };
  return <>
    <View className="h-72 w-full rounded-[22px] overflow-hidden bg-[#FAF8F5]"><FlatList data={imageUrls} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(item, index) => `${item}-${index}`} renderItem={({ item, index }) => { const imageUri = resolveProductImageUri(item, apiBaseUrl); const failed = failedImages[item]; return <TouchableOpacity accessibilityLabel={`${product.name} photo ${index + 1} खोलें`} onPress={() => openViewer(index)} activeOpacity={0.92} style={{ width: pageWidth }} className="h-72 items-center justify-center">{imageUri && !failed ? <Image source={{ uri: imageUri }} accessibilityLabel={`${product.name} product photo`} onError={() => setFailedImages((current) => ({ ...current, [item]: true }))} resizeMode="cover" className="h-72 w-full" /> : <View className="h-72 w-full items-center justify-center bg-[#FAF8F5]"><Text className="text-8xl">{product.icon}</Text></View>}</TouchableOpacity>; }} /><View style={{ pointerEvents: "none" }} className="absolute bottom-3 self-center flex-row rounded-full bg-black/35 px-2 py-1"><Text className="text-[10px] font-bold text-white">Tap to view full photo · {imageUrls.length}</Text></View></View>
    {viewerVisible ? <FullscreenProductPhotoViewer key={`${product.id}-${viewerIndex}`} product={product} imageUrls={imageUrls} initialIndex={viewerIndex} apiBaseUrl={apiBaseUrl} onClose={() => setViewerVisible(false)} /> : null}
  </>;
}

function FullscreenProductPhotoViewer({ product, imageUrls, initialIndex, apiBaseUrl, onClose }: { product: Product; imageUrls: string[]; initialIndex: number; apiBaseUrl: string; onClose: () => void }) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const listRef = useRef<FlatList<string>>(null);
  const viewerWidth = Math.max(1, width);
  const goToIndex = (direction: -1 | 1) => {
    const nextIndex = galleryIndexFor(activeIndex, imageUrls.length, direction);
    setActiveIndex(nextIndex);
    listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };
  return <Modal visible transparent animationType="fade" onRequestClose={onClose} presentationStyle="fullScreen"><StatusBar barStyle="light-content" backgroundColor="#0F1713" /><SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ flex: 1, backgroundColor: "#0F1713" }}><View className="flex-1"><FlatList ref={listRef} data={imageUrls} horizontal pagingEnabled initialScrollIndex={initialIndex} getItemLayout={(_, index) => ({ length: viewerWidth, offset: viewerWidth * index, index })} showsHorizontalScrollIndicator={false} keyExtractor={(item, index) => `${item}-${index}`} onMomentumScrollEnd={(event) => setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / viewerWidth))} renderItem={({ item }) => { const imageUri = resolveProductImageUri(item, apiBaseUrl); const failed = failedImages[item]; return <View style={{ width: viewerWidth }} className="flex-1 items-center justify-center px-3">{imageUri && !failed ? <Image source={{ uri: imageUri }} accessibilityLabel={`${product.name} full-screen photo`} onError={() => setFailedImages((current) => ({ ...current, [item]: true }))} resizeMode="contain" className="h-full w-full" /> : <View className="h-full w-full items-center justify-center"><Text className="text-9xl">{product.icon}</Text><Text className="text-sm text-white/70 mt-4">Photo unavailable</Text></View>}</View>; }} /></View><TouchableOpacity accessibilityLabel="Full-screen photo बंद करें" onPress={onClose} activeOpacity={0.8} className="absolute top-3 right-4 h-11 w-11 rounded-full bg-black/55 items-center justify-center"><MaterialIcons name="close" size={25} color="#FFFFFF" /></TouchableOpacity>{imageUrls.length > 1 ? <><TouchableOpacity accessibilityLabel="Previous product photo" disabled={activeIndex === 0} onPress={() => goToIndex(-1)} activeOpacity={0.8} className="absolute left-3 top-1/2 h-11 w-11 rounded-full bg-black/45 items-center justify-center"><MaterialIcons name="chevron-left" size={30} color={activeIndex === 0 ? "#8A968F" : "#FFFFFF"} /></TouchableOpacity><TouchableOpacity accessibilityLabel="Next product photo" disabled={activeIndex === imageUrls.length - 1} onPress={() => goToIndex(1)} activeOpacity={0.8} className="absolute right-3 top-1/2 h-11 w-11 rounded-full bg-black/45 items-center justify-center"><MaterialIcons name="chevron-right" size={30} color={activeIndex === imageUrls.length - 1 ? "#8A968F" : "#FFFFFF"} /></TouchableOpacity></> : null}<View className="absolute bottom-4 self-center rounded-full bg-black/55 px-3 py-1.5"><Text className="text-xs font-bold text-white">{activeIndex + 1} / {imageUrls.length}</Text></View></SafeAreaView></Modal>;
}

function ProductPhoto({ product, className, iconSize }: { product: Product; className: string; iconSize: string }) {
  const [failed, setFailed] = useState(false);
  const imageUri = resolveProductImageUri(product.imageUrl, getApiBaseUrl());
  if (imageUri && !failed) return <Image source={{ uri: imageUri }} accessibilityLabel={`${product.name} product photo`} onError={() => setFailed(true)} resizeMode="cover" className={className} />;
  return <View className={`items-center justify-center bg-[#FAF8F5] ${className}`}><Text className={iconSize}>{product.icon}</Text></View>;
}

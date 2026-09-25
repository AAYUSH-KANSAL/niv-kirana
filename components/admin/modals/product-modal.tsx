import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import type { Product } from "@/lib/niv-store";
import { uploadProductImageToSupabase } from "@/lib/supabase-service";
import { compressImageUnder60Kb } from "@/lib/image-compressor";

interface ProductModalProps {
  visible: boolean;
  productToEdit?: Product | null;
  categories?: string[];
  onSave: (
    product: Omit<Product, "id"> & { id?: string },
    newCategories?: string[]
  ) => Promise<void>;
  onClose: () => void;
  onAddNewCategory?: (category: string) => Promise<void>;
}

const defaultProductCategories = [
  "Staples",
  "Pulses",
  "Dairy",
  "Fresh",
  "Snacks",
  "Beverages",
  "Home care",
  "Personal care",
];

export function ProductModal({
  visible,
  productToEdit,
  categories = [],
  onSave,
  onClose,
  onAddNewCategory,
}: ProductModalProps) {
  const isEditing = Boolean(productToEdit);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productMrp, setProductMrp] = useState("");
  const [productUnit, setProductUnit] = useState("1 pack");
  const [productStock, setProductStock] = useState("10");
  const [productCategory, setProductCategory] = useState("Staples");
  const [productDescription, setProductDescription] = useState("");

  // Category Dropdown & Custom Creation State
  const [availableCategories, setAvailableCategories] = useState<string[]>(() => {
    const list = [
      ...defaultProductCategories,
      ...categories.filter((c) => c && c.toLowerCase() !== "all"),
    ];
    return Array.from(new Set(list));
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  React.useEffect(() => {
    if (categories && categories.length > 0) {
      setAvailableCategories((prev) => {
        const merged = [
          ...defaultProductCategories,
          ...prev,
          ...categories.filter((c) => c && c.toLowerCase() !== "all"),
        ];
        return Array.from(new Set(merged));
      });
    }
  }, [categories]);

  // Image Upload State
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const [isFeatured, setIsFeatured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>("");

  const resetForm = () => {
    setProductName("");
    setProductPrice("");
    setProductMrp("");
    setProductUnit("1 pack");
    setProductStock("10");
    setProductCategory("Staples");
    setProductDescription("");
    setDropdownOpen(false);
    setIsCreatingCategory(false);
    setNewCategoryName("");
    setImageUri(null);
    setImageBase64(null);
    setImageMimeType(null);
    setImageSizeKb(null);
    setManualImageUrl("");
    setShowUrlInput(false);
    setIsFeatured(false);
    setUploadStep("");
  };

  React.useEffect(() => {
    if (visible && productToEdit) {
      setProductName(productToEdit.name || "");
      setProductPrice(
        productToEdit.price !== undefined ? String(productToEdit.price) : ""
      );
      setProductMrp(
        productToEdit.mrp !== undefined && productToEdit.mrp !== null
          ? String(productToEdit.mrp)
          : ""
      );
      setProductUnit(productToEdit.unit || "1 pack");
      setProductStock(
        productToEdit.stock !== undefined ? String(productToEdit.stock) : "10"
      );
      setProductCategory(productToEdit.category || "Staples");
      setProductDescription(productToEdit.description || "");
      setIsFeatured(Boolean(productToEdit.featured));
      setImageUri(productToEdit.imageUrl || null);
      setImageBase64(null);
      setImageMimeType(null);
      setImageSizeKb(null);
      setManualImageUrl("");
      setShowUrlInput(false);
      setUploadStep("");
    } else if (visible && !productToEdit) {
      resetForm();
    }
  }, [visible, productToEdit]);

  const handleAddNewCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      Alert.alert("Category Name Required", "Kripya nayi category ka naam likhein.");
      return;
    }
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    if (formatted.toLowerCase() === "all") {
      Alert.alert("Invalid Name", "'All' category reserve hai.");
      return;
    }

    if (!availableCategories.some((c) => c.toLowerCase() === formatted.toLowerCase())) {
      const updated = [...availableCategories, formatted];
      setAvailableCategories(updated);
      setProductCategory(formatted);
    } else {
      const existing =
        availableCategories.find((c) => c.toLowerCase() === formatted.toLowerCase()) || formatted;
      setProductCategory(existing);
    }

    if (onAddNewCategory) {
      void onAddNewCategory(formatted);
    }

    setNewCategoryName("");
    setIsCreatingCategory(false);
    setDropdownOpen(false);
    Alert.alert(
      "Category Added",
      `"${formatted}" category store me add kar di gayi hai aur is product ke liye select ho gayi hai.`
    );
  };

  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo gallery permission is required to choose a product image."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadStep("Compressing photo (< 50 KB)...");
        const comp = await compressImageUnder60Kb(asset.uri, { maxKb: 50, initialWidth: 480 });
        setImageUri(comp.uri);
        setImageBase64(comp.base64);
        setImageMimeType(comp.mimeType);
        setImageSizeKb(comp.sizeKb);
        setManualImageUrl("");
        setUploadStep("");
      }
    } catch (e: any) {
      Alert.alert("Gallery Error", e?.message || "Failed to open gallery.");
      setUploadStep("");
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera permission is required to capture product photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadStep("Compressing photo (< 50 KB)...");
        const comp = await compressImageUnder60Kb(asset.uri, { maxKb: 50, initialWidth: 480 });
        setImageUri(comp.uri);
        setImageBase64(comp.base64);
        setImageMimeType(comp.mimeType);
        setImageSizeKb(comp.sizeKb);
        setManualImageUrl("");
        setUploadStep("");
      }
    } catch (e: any) {
      Alert.alert("Camera Error", e?.message || "Failed to open camera.");
      setUploadStep("");
    }
  };

  const handleSave = async () => {
    const price = Number(productPrice);
    const stock = Number(productStock);

    if (!productName.trim() || !price || price <= 0) {
      Alert.alert("Invalid Input", "Please provide a valid product name and selling price.");
      return;
    }

    setSaving(true);
    setUploadStep("Processing product...");

    try {
      let finalImageUrl: string | undefined = undefined;

      // 1. If user selected an image file (local URI), upload directly to Supabase product-images bucket
      if (imageUri && (imageUri.startsWith("file://") || imageUri.startsWith("content://") || imageUri.startsWith("data:") || imageUri.startsWith("blob:"))) {
        setUploadStep("Uploading image to Supabase Bucket...");
        try {
          finalImageUrl = await uploadProductImageToSupabase({
            uri: imageUri,
            base64: imageBase64,
            mimeType: imageMimeType,
          });
        } catch (uploadErr) {
          console.warn("Product image upload exception, fallback to data URI:", uploadErr);
          if (imageBase64) {
            finalImageUrl = `data:${imageMimeType || "image/jpeg"};base64,${imageBase64}`;
          }
        }
      } else if (manualImageUrl.trim().startsWith("http")) {
        finalImageUrl = manualImageUrl.trim();
      } else if (imageUri && imageUri.startsWith("http")) {
        finalImageUrl = imageUri;
      } else if (productToEdit?.imageUrl) {
        finalImageUrl = productToEdit.imageUrl;
      }

      setUploadStep(isEditing ? "Updating Product in Supabase..." : "Saving to Store Catalog...");
      await onSave(
        {
          ...(productToEdit ? { id: productToEdit.id } : {}),
          name: productName.trim(),
          price,
          mrp: productMrp ? Number(productMrp) : undefined,
          unit: productUnit.trim() || "1 pack",
          stock: Math.max(0, stock || 10),
          category: productCategory.trim() || "Staples",
          description: productDescription.trim() || undefined,
          icon: productToEdit?.icon || "📦",
          imageUrl: finalImageUrl,
          imageUrls: finalImageUrl
            ? [finalImageUrl]
            : productToEdit?.imageUrls || [],
          featured: isFeatured,
        },
        availableCategories
      );

      resetForm();
      onClose();
      Alert.alert(
        isEditing ? "Product Updated" : "Product Added",
        isEditing
          ? `${productName.trim()} has been updated successfully.`
          : `${productName.trim()} has been saved to your catalog${
              finalImageUrl ? " with product photo in Supabase bucket" : ""
            }.`
      );
    } catch (e: any) {
      Alert.alert("Save Failed", e?.message || "Failed to save product.");
    } finally {
      setSaving(false);
      setUploadStep("");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
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
            backgroundColor: "rgba(0,0,0,0.55)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 20,
              maxHeight: "92%",
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <View>
                <Text style={{ fontSize: 17, fontWeight: "900", color: "#1C1C1C" }}>
                  {isEditing ? "Edit Product / बदलाव करें" : "Add New Product"}
                </Text>
                <Text style={{ fontSize: 11, color: "#687178", marginTop: 2 }}>
                  {isEditing
                    ? `Editing "${productToEdit?.name}"`
                    : "Catalog item with Supabase cloud image storage"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: "#F5F5F5",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="close" size={20} color="#687178" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {/* Product Photo Upload Section */}
              <View
                style={{
                  backgroundColor: "#F8F9FA",
                  borderWidth: 1,
                  borderColor: "#E8E8E8",
                  borderRadius: 16,
                  padding: 12,
                  marginBottom: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: "#1C1C1C",
                    marginBottom: 8,
                  }}
                >
                  PRODUCT PHOTO (SUPABASE BUCKET)
                </Text>

                {imageUri ? (
                  /* Selected Image Preview */
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={{ uri: imageUri }}
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 12,
                        backgroundColor: "#EAEAEA",
                        borderWidth: 1,
                        borderColor: "#DCECCB",
                      }}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "800",
                          color: "#16A34A",
                        }}
                      >
                        ✓ Compressed · {imageSizeKb ? `${imageSizeKb} KB` : "< 50 KB"} (Under 60 KB ✓)
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#687178",
                          marginTop: 2,
                        }}
                      >
                        Saved to Supabase product-images bucket
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 6,
                        }}
                      >
                        <TouchableOpacity
                          onPress={handlePickFromGallery}
                          activeOpacity={0.7}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: "#FFFFFF",
                            borderWidth: 1,
                            borderColor: "#E8E8E8",
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: "700", color: "#1C1C1C" }}>
                            Change
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => {
                            setImageUri(null);
                            setImageBase64(null);
                            setImageMimeType(null);
                          }}
                          activeOpacity={0.7}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: "#FAF8F5",
                            borderWidth: 1,
                            borderColor: "#E2E8D8",
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: "700", color: "#DC2626" }}>
                            Remove
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  /* Pick Action Buttons */
                  <View>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity
                        onPress={handleTakePhoto}
                        activeOpacity={0.75}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#FFFFFF",
                          borderWidth: 1,
                          borderColor: "#E2E8D8",
                          borderRadius: 12,
                          paddingVertical: 10,
                        }}
                      >
                        <MaterialIcons name="photo-camera" size={18} color="#176B45" />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "800",
                            color: "#14221B",
                            marginLeft: 6,
                          }}
                        >
                          Camera
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handlePickFromGallery}
                        activeOpacity={0.75}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#FFFFFF",
                          borderWidth: 1,
                          borderColor: "#E2E8D8",
                          borderRadius: 12,
                          paddingVertical: 10,
                        }}
                      >
                        <MaterialIcons name="photo-library" size={18} color="#176B45" />
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "800",
                            color: "#14221B",
                            marginLeft: 6,
                          }}
                        >
                          Gallery
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Or URL input toggle */}
                    <TouchableOpacity
                      onPress={() => setShowUrlInput(!showUrlInput)}
                      style={{ marginTop: 8, alignSelf: "center" }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#176B45" }}>
                        {showUrlInput ? "Hide Web URL input" : "+ Or enter web image URL"}
                      </Text>
                    </TouchableOpacity>

                    {showUrlInput && (
                      <TextInput
                        value={manualImageUrl}
                        onChangeText={setManualImageUrl}
                        placeholder="https://example.com/product.jpg"
                        placeholderTextColor="#828282"
                        style={{
                          backgroundColor: "#FFFFFF",
                          borderWidth: 1,
                          borderColor: "#E8E8E8",
                          borderRadius: 10,
                          padding: 8,
                          fontSize: 11,
                          color: "#1C1C1C",
                          marginTop: 6,
                        }}
                      />
                    )}
                  </View>
                )}
              </View>

              {/* Product Name */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  color: "#687178",
                  marginBottom: 4,
                }}
              >
                PRODUCT NAME *
              </Text>
              <TextInput
                value={productName}
                onChangeText={setProductName}
                placeholder="e.g. Fortune Kachi Ghani Mustard Oil"
                placeholderTextColor="#828282"
                style={{
                  backgroundColor: "#F8F9FA",
                  borderWidth: 1,
                  borderColor: "#E8E8E8",
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 10,
                  fontSize: 13,
                  color: "#1C1C1C",
                  fontWeight: "600",
                }}
              />

              {/* Category Dropdown Picker */}
              <View style={{ marginBottom: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: "#687178",
                    }}
                  >
                    CATEGORY *
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setIsCreatingCategory(!isCreatingCategory);
                      if (!isCreatingCategory) setDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "800",
                        color: "#176B45",
                      }}
                    >
                      {isCreatingCategory ? "✕ Cancel" : "+ Create New Category"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Create New Category Inline Input */}
                {isCreatingCategory ? (
                  <View
                    style={{
                      backgroundColor: "#EAF4D9",
                      borderWidth: 1,
                      borderColor: "#CFE6B6",
                      borderRadius: 12,
                      padding: 10,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "800",
                        color: "#176B45",
                        marginBottom: 6,
                      }}
                    >
                      Add New Category to Store
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TextInput
                        value={newCategoryName}
                        onChangeText={setNewCategoryName}
                        placeholder="e.g. Spices, Bakery, Organic..."
                        placeholderTextColor="#828282"
                        autoFocus
                        style={{
                          flex: 1,
                          backgroundColor: "#FFFFFF",
                          borderWidth: 1,
                          borderColor: "#E2E8D8",
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 7,
                          fontSize: 12,
                          color: "#14221B",
                          fontWeight: "600",
                        }}
                      />
                      <TouchableOpacity
                        onPress={handleAddNewCategory}
                        activeOpacity={0.8}
                        style={{
                          backgroundColor: "#176B45",
                          paddingHorizontal: 14,
                          borderRadius: 8,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>
                          Add
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {/* Dropdown Selector Button */}
                <TouchableOpacity
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: "#FAF8F5",
                    borderWidth: 1,
                    borderColor: dropdownOpen ? "#176B45" : "#E2E8D8",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialIcons
                      name="category"
                      size={18}
                      color="#176B45"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#14221B" }}>
                      {productCategory}
                    </Text>
                  </View>
                  <MaterialIcons
                    name={dropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    size={22}
                    color="#5C6E63"
                  />
                </TouchableOpacity>

                {/* Dropdown Options List */}
                {dropdownOpen && (
                  <View
                    style={{
                      marginTop: 6,
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1,
                      borderColor: "#E2E8D8",
                      borderRadius: 12,
                      padding: 6,
                      maxHeight: 180,
                    }}
                  >
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                      {availableCategories.map((cat, index) => {
                        const isSelected = productCategory.toLowerCase() === cat.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={`cat-opt-${cat}-${index}`}
                            onPress={() => {
                              setProductCategory(cat);
                              setDropdownOpen(false);
                            }}
                            activeOpacity={0.7}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingHorizontal: 10,
                              paddingVertical: 8,
                              borderRadius: 8,
                              backgroundColor: isSelected ? "#EAF4D9" : "transparent",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: isSelected ? "800" : "600",
                                color: isSelected ? "#176B45" : "#14221B",
                              }}
                            >
                              {cat}
                            </Text>
                            {isSelected && (
                              <MaterialIcons name="check" size={16} color="#176B45" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Price & MRP */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: "#687178",
                      marginBottom: 4,
                    }}
                  >
                    SELLING PRICE (₹) *
                  </Text>
                  <TextInput
                    value={productPrice}
                    onChangeText={setProductPrice}
                    keyboardType="numeric"
                    placeholder="120"
                    placeholderTextColor="#828282"
                    style={{
                      backgroundColor: "#F8F9FA",
                      borderWidth: 1,
                      borderColor: "#E8E8E8",
                      borderRadius: 12,
                      padding: 10,
                      fontSize: 13,
                      color: "#1C1C1C",
                      fontWeight: "700",
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: "#687178",
                      marginBottom: 4,
                    }}
                  >
                    MRP (OPTIONAL)
                  </Text>
                  <TextInput
                    value={productMrp}
                    onChangeText={setProductMrp}
                    keyboardType="numeric"
                    placeholder="140"
                    placeholderTextColor="#828282"
                    style={{
                      backgroundColor: "#F8F9FA",
                      borderWidth: 1,
                      borderColor: "#E8E8E8",
                      borderRadius: 12,
                      padding: 10,
                      fontSize: 13,
                      color: "#1C1C1C",
                    }}
                  />
                </View>
              </View>

              {/* Unit & Stock */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: "#687178",
                      marginBottom: 4,
                    }}
                  >
                    PACK SIZE / UNIT
                  </Text>
                  <TextInput
                    value={productUnit}
                    onChangeText={setProductUnit}
                    placeholder="1 L / 500 g / 1 pack"
                    placeholderTextColor="#828282"
                    style={{
                      backgroundColor: "#F8F9FA",
                      borderWidth: 1,
                      borderColor: "#E8E8E8",
                      borderRadius: 12,
                      padding: 10,
                      fontSize: 13,
                      color: "#1C1C1C",
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: "#687178",
                      marginBottom: 4,
                    }}
                  >
                    INITIAL STOCK
                  </Text>
                  <TextInput
                    value={productStock}
                    onChangeText={setProductStock}
                    keyboardType="number-pad"
                    placeholder="10"
                    placeholderTextColor="#828282"
                    style={{
                      backgroundColor: "#F8F9FA",
                      borderWidth: 1,
                      borderColor: "#E8E8E8",
                      borderRadius: 12,
                      padding: 10,
                      fontSize: 13,
                      color: "#1C1C1C",
                      fontWeight: "700",
                    }}
                  />
                </View>
              </View>

              {/* Product Description */}
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: "#687178",
                    marginBottom: 4,
                  }}
                >
                  PRODUCT DESCRIPTION (विवरण)
                </Text>
                <TextInput
                  value={productDescription}
                  onChangeText={setProductDescription}
                  placeholder="e.g. 100% Shuddh Chakki Atta, high fiber, daily fresh stock"
                  placeholderTextColor="#828282"
                  multiline
                  numberOfLines={2}
                  style={{
                    backgroundColor: "#F8F9FA",
                    borderWidth: 1,
                    borderColor: "#E8E8E8",
                    borderRadius: 12,
                    padding: 10,
                    fontSize: 13,
                    color: "#1C1C1C",
                    minHeight: 52,
                    textAlignVertical: "top",
                  }}
                />
              </View>

              {/* Deal of the Day Toggle */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsFeatured(!isFeatured)}
                style={{
                  backgroundColor: isFeatured ? "#FFFBEB" : "#F8F9FA",
                  borderWidth: 1,
                  borderColor: isFeatured ? "#FCD34D" : "#E8E8E8",
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 }}>
                  <View
                    style={{
                      height: 36,
                      width: 36,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                      backgroundColor: isFeatured ? "#F59E0B" : "#E5E7EB",
                    }}
                  >
                    <MaterialIcons
                      name="star"
                      size={18}
                      color={isFeatured ? "#FFFFFF" : "#6B7280"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "900", color: "#1C1C1C" }}>
                      Deals of the Day (आज का Special Pick)
                    </Text>
                    <Text style={{ fontSize: 11, color: "#687178", marginTop: 2 }}>
                      Customer home screen par top deals carousel me dikhega
                    </Text>
                  </View>
                </View>
                <MaterialIcons
                  name={isFeatured ? "check-box" : "check-box-outline-blank"}
                  size={24}
                  color={isFeatured ? "#D97706" : "#9CA3AF"}
                />
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
                style={{
                  backgroundColor: saving ? "#5C6E63" : "#176B45",
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                {saving && (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                )}
                <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 14 }}>
                  {saving
                    ? (uploadStep || (isEditing ? "Updating Product..." : "Saving Product..."))
                    : isEditing
                    ? "Update Product / बदलाव सेव करें"
                    : "Save Product to Catalog"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

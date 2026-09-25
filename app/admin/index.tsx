import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { isOwnerBiometricEnabled } from "@/lib/owner-biometric";
import {
  useNivStore,
  type LocalCustomerAccount,
  type OrderStatus,
  type Product,
  type StoreSettings,
} from "@/lib/niv-store";
import {
  addProductToDb,
  approveCustomerInDb,
  deleteCustomerFromDb,
  deleteOrderInDb,
  deleteProductFromDb,
  rejectCustomerInDb,
  setCustomerRoleInDb,
  setCustomerStatusInDb,
  signOut as supabaseSignOut,
  updateOrderStatusInDb,
  updateProductInDb,
  updateStoreSettingsInDb,
  upsertCreditAccountInDb,
  deleteCreditAccountInDb,
} from "@/lib/supabase-service";
import { splitOrdersByDay } from "@/shared/owner-order-sections";
import type { OwnerOrder } from "@/shared/owner-order-routing";
import {
  addCatalogCategory,
  usableCatalogCategories,
  DEFAULT_CATALOG_CATEGORIES,
} from "@/shared/catalog-categories";

// Modular Admin Components
import { AdminHeader } from "@/components/admin/admin-header";
import type { AdminTab } from "@/components/admin/admin-tabs-nav";
import { AdminBottomNavbar } from "@/components/admin/admin-bottom-navbar";
import { OverviewTab } from "@/components/admin/tabs/overview-tab";
import { OrdersTab } from "@/components/admin/tabs/orders-tab";
import { ProductsTab } from "@/components/admin/tabs/products-tab";
import { CustomersTab } from "@/components/admin/tabs/customers-tab";
import { CreditTab } from "@/components/admin/tabs/credit-tab";
import { SettingsTab } from "@/components/admin/tabs/settings-tab";
import { SecurityTab } from "@/components/admin/tabs/security-tab";
import { FestivalBasketManager } from "@/components/festival-basket-manager";

// Modular Modals
import { SecurityModal } from "@/components/admin/modals/security-modal";
import { DeleteModal } from "@/components/admin/modals/delete-modal";
import { ProductModal } from "@/components/admin/modals/product-modal";

export default function AdminScreen() {
  const router = useRouter();
  const {
    ownerMode,
    hydrated,
    accounts,
    ownerOrders,
    products,
    settings,
    exitOwnerMode,
    syncAllDataFromCloud,
    updateOwnerOrderStatus,
    updateOwnerOrderTotal,
    deleteOwnerOrder,
    addProduct,
    updateProduct,
    removeProduct,
    getProduct,
    approveOwnerCredit,
    declineOwnerCredit,
    deleteOwnerCredit,
    setOwnerCreditEnabled,
    resetOwnerCreditUsed,
    setOwnerCreditLimit,
    updateSettings,
    approveCustomerAccount,
    rejectCustomerAccount,
    deleteCustomerAccount,
    setCustomerAccountSuspended,
    setCustomerAccountRole,
  } = useNivStore();

  // Navigation & Sync State
  const [tab, setTab] = useState<AdminTab>("Overview");
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  // Orders State
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("Active Orders");

  // Products State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState("");

  // Customers State
  const [customerSearch, setCustomerSearch] = useState("");

  // Security Modal State
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<LocalCustomerAccount | null>(null);
  const [selectedRole, setSelectedRole] = useState<"customer" | "admin">("customer");
  const [selectedStatus, setSelectedStatus] = useState<"approved" | "suspended">("approved");
  const [securitySaving, setSecuritySaving] = useState(false);

  // Delete Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<LocalCustomerAccount | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Biometric State
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    isOwnerBiometricEnabled().then(setBiometricEnabled);
  }, []);

  // Real-time Cloud Sync
  const handleManualSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncAllDataFromCloud();
      const now = new Date();
      setLastSyncTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } catch (e) {
      console.warn("Manual sync error:", e);
    } finally {
      setSyncing(false);
    }
  }, [syncAllDataFromCloud]);

  useEffect(() => {
    void handleManualSync();
    const interval = setInterval(() => {
      void syncAllDataFromCloud();
    }, 10000);
    return () => clearInterval(interval);
  }, [handleManualSync, syncAllDataFromCloud]);

  // Derived Computations
  const pendingCustomerRequests = useMemo(
    () => accounts.filter((a) => a.status === "pending"),
    [accounts]
  );
  const approvedCustomers = useMemo(
    () => accounts.filter((a) => a.status !== "pending"),
    [accounts]
  );
  const creditAccounts = useMemo(
    () => accounts,
    [accounts]
  );

  const { current: currentOrders } = useMemo(
    () => splitOrdersByDay(ownerOrders),
    [ownerOrders]
  );
  const todayLiveOrders = useMemo(
    () => currentOrders.filter((o) => o.status !== "Delivered" && o.status !== "Cancelled"),
    [currentOrders]
  );
  const todaySales = useMemo(
    () => currentOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0),
    [currentOrders]
  );
  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock <= 5),
    [products]
  );

  const filteredOrders = useMemo(() => {
    return ownerOrders.filter((order) => {
      const matchSearch =
        !orderSearch.trim() ||
        order.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
        (order.customer.name && order.customer.name.toLowerCase().includes(orderSearch.toLowerCase())) ||
        (order.customer.phone && order.customer.phone.includes(orderSearch.trim()));

      const matchStatus = (() => {
        if (orderStatusFilter === "Active Orders" || orderStatusFilter === "Active") {
          return order.status !== "Delivered" && order.status !== "Cancelled";
        }
        if (orderStatusFilter === "All") {
          return true;
        }
        if (orderStatusFilter === "Completed") {
          return order.status === "Delivered" || (order.status as string) === "Completed";
        }
        if (orderStatusFilter === "Cancelled") {
          return order.status === "Cancelled";
        }
        return order.status === orderStatusFilter;
      })();

      return matchSearch && matchStatus;
    });
  }, [ownerOrders, orderSearch, orderStatusFilter]);

  // Action Handlers
  const handleAdminLogout = () => {
    Alert.alert("Store Admin Logout", "Console lock karke login screen par jana hai?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabaseSignOut();
          exitOwnerMode();
          router.replace("/login" as never);
        },
      },
    ]);
  };

  const handleOrderStatusUpdate = async (order: OwnerOrder, newStatus: OrderStatus) => {
    updateOwnerOrderStatus(order.accountId, order.id, newStatus);
    await updateOrderStatusInDb(order.id, newStatus);
  };

  const handleCancelOrder = (order: OwnerOrder) => {
    if (order.status === "Delivered") {
      Alert.alert(
        "Action Not Allowed",
        "Delivered orders cannot be cancelled or deleted as they form permanent sales records."
      );
      return;
    }
    if (order.status === "Cancelled") {
      Alert.alert("Already Cancelled", `Order #${order.id} pehle se cancel ho chuka hai.`);
      return;
    }

    Alert.alert(
      "Cancel Order",
      `Order #${order.id} ko cancel karna chahte hain?\n\nCustomer app par order Cancel dikhayi dega aur product stock / credit restore kar diya jayega.`,
      [
        { text: "Nahi, Back", style: "cancel" },
        {
          text: "Haan, Cancel Karein",
          style: "destructive",
          onPress: async () => {
            // 1. Update status in local store and Supabase
            updateOwnerOrderStatus(order.accountId, order.id, "Cancelled");
            try {
              await updateOrderStatusInDb(order.id, "Cancelled");
            } catch (e) {
              console.warn("DB update error on cancel:", e);
            }

            // 2. Restore product stock in local store and Supabase
            if (order.items && order.items.length > 0) {
              for (const line of order.items) {
                const prod = getProduct(line.productId);
                if (prod) {
                  const restoredStock = (prod.stock ?? 0) + line.quantity;
                  updateProduct(prod.id, { stock: restoredStock });
                  try {
                    await updateProductInDb(prod.id, { stock: restoredStock });
                  } catch (e) {
                    console.warn("Product stock restore error:", e);
                  }
                }
              }
            }

            // 3. If paid with NIV Credit, refund used credit in database
            if (order.payment === "NIV Credit") {
              const account = accounts.find((a) => a.id === order.accountId);
              if (account) {
                const newUsed = Math.max(0, (account.credit.used ?? 0) - order.total);
                try {
                  await upsertCreditAccountInDb({
                    customerId: account.id,
                    status: account.credit.status,
                    limitAmount: account.credit.limit,
                    usedAmount: newUsed,
                    enabled: account.credit.enabled ?? true,
                  });
                } catch (e) {
                  console.warn("Credit refund DB error:", e);
                }
              }
            }
          },
        },
      ]
    );
  };

  const handleDeleteOrder = (_order: OwnerOrder) => {
    Alert.alert(
      "Action Not Allowed",
      "Orders cannot be deleted as they form permanent records for store sales analytics and audit history."
    );
  };

  const handleUpdateProductStock = async (product: Product, newStock: number) => {
    updateProduct(product.id, { stock: newStock });
    try {
      await updateProductInDb(product.id, { stock: newStock });
    } catch (e) {
      console.warn("handleUpdateProductStock sync error:", e);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert("Delete Product", `Delete ${product.name} from catalog?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          removeProduct(product.id);
          try {
            await deleteProductFromDb(product.id);
          } catch (e) {
            console.warn("handleDeleteProduct sync error:", e);
          }
        },
      },
    ]);
  };

  const handleAddCategory = async (newCategory: string) => {
    try {
      const currentList = settings.catalogCategories ?? DEFAULT_CATALOG_CATEGORIES;
      const updated = addCatalogCategory(currentList, newCategory);
      await handleSaveSettings({ catalogCategories: updated });
      await syncAllDataFromCloud();
    } catch (e) {
      console.warn("handleAddCategory sync error:", e);
    }
  };

  const handleToggleFeaturedProduct = async (product: Product) => {
    const isCurrentlyFeatured =
      Boolean(product.featured) ||
      Boolean(settings.featuredProductIds?.includes(product.id));
    const nextFeatured = !isCurrentlyFeatured;

    updateProduct(product.id, { featured: nextFeatured });
    try {
      await updateProductInDb(product.id, { featured: nextFeatured });
    } catch (e) {
      console.warn("handleToggleFeaturedProduct product sync error:", e);
    }

    const currentList = settings.featuredProductIds || [];
    const nextList = nextFeatured
      ? Array.from(new Set([...currentList, product.id]))
      : currentList.filter((id) => id !== product.id);

    await handleSaveSettings({ featuredProductIds: nextList });
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (
    productData: Omit<Product, "id"> & { id?: string },
    newCategories?: string[]
  ) => {
    try {
      if (productData.id) {
        // UPDATE EXISTING PRODUCT
        const id = productData.id;
        updateProduct(id, productData);
        await updateProductInDb(id, productData);

        // Update featured status in settings if changed
        const currentFeatured = settings.featuredProductIds || [];
        let nextFeatured = currentFeatured;
        if (productData.featured && !currentFeatured.includes(id)) {
          nextFeatured = [...currentFeatured, id];
        } else if (!productData.featured && currentFeatured.includes(id)) {
          nextFeatured = currentFeatured.filter((fId) => fId !== id);
        }
        if (nextFeatured !== currentFeatured) {
          await handleSaveSettings({ featuredProductIds: nextFeatured });
        }

        const currentList = settings.catalogCategories ?? DEFAULT_CATALOG_CATEGORIES;
        const fullList = usableCatalogCategories([
          ...currentList,
          ...(newCategories ?? []),
          productData.category,
        ]);
        await handleSaveSettings({ catalogCategories: fullList });
        await syncAllDataFromCloud();
      } else {
        // ADD NEW PRODUCT
        const newId = `product-${Date.now()}`;
        const productRecord = { id: newId, ...productData };
        addProduct(productRecord as any);
        await addProductToDb(productRecord as any);

        if (productData.featured) {
          const currentFeatured = settings.featuredProductIds || [];
          if (!currentFeatured.includes(newId)) {
            await handleSaveSettings({
              featuredProductIds: [...currentFeatured, newId],
            });
          }
        }

        const currentList = settings.catalogCategories ?? DEFAULT_CATALOG_CATEGORIES;
        const fullList = usableCatalogCategories([
          ...currentList,
          ...(newCategories ?? []),
          productData.category,
        ]);
        await handleSaveSettings({ catalogCategories: fullList });
        await syncAllDataFromCloud();
      }
    } catch (e) {
      console.warn("handleSaveProduct sync error:", e);
    }
  };

  const handleApproveCustomer = async (acc: LocalCustomerAccount) => {
    try {
      approveCustomerAccount(acc.id);
      await approveCustomerInDb(acc.id);
      await syncAllDataFromCloud();
      Alert.alert(
        "Account Approved",
        `${acc.customer.name || "Customer"} ka account approve ho gaya hai. Status: Active & Lifetime Free.`
      );
    } catch (err: any) {
      console.warn("Approve error:", err);
      Alert.alert("Approval Error", err?.message || "Failed to approve account.");
    }
  };

  const handleRejectCustomer = async (acc: LocalCustomerAccount) => {
    rejectCustomerAccount(acc.id);
    await rejectCustomerInDb(acc.id);
    await syncAllDataFromCloud();
  };

  const handleOpenSecurity = (acc: LocalCustomerAccount) => {
    setSelectedCustomer(acc);
    setSelectedRole(acc.role === "admin" ? "admin" : "customer");
    setSelectedStatus(acc.status === "suspended" ? "suspended" : "approved");
    setSecurityModalVisible(true);
  };

  const handleSaveSecurity = async () => {
    if (!selectedCustomer) return;
    setSecuritySaving(true);
    try {
      setCustomerAccountRole(selectedCustomer.id, selectedRole);
      setCustomerAccountSuspended(selectedCustomer.id, selectedStatus === "suspended");
      await setCustomerRoleInDb(selectedCustomer.id, selectedRole);
      await setCustomerStatusInDb(selectedCustomer.id, selectedStatus);
      await syncAllDataFromCloud();
      setSecurityModalVisible(false);
      Alert.alert(
        "Security Permissions Saved",
        `${selectedCustomer.customer.name} permissions updated.`
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update permissions.");
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleClearDuesForDelete = async (accountId: string) => {
    resetOwnerCreditUsed(accountId);
    const target = accounts.find((a) => a.id === accountId);
    try {
      await upsertCreditAccountInDb({
        customerId: accountId,
        status: "approved",
        limitAmount: target?.credit?.limit || 0,
        usedAmount: 0,
        enabled: true,
      });
      if (customerToDelete && customerToDelete.id === accountId) {
        setCustomerToDelete({
          ...customerToDelete,
          credit: { ...customerToDelete.credit, used: 0 },
        });
      }
      Alert.alert(
        "Dues Cleared (₹0)",
        "Customer ke dues clear ho gaye hain. Ab aap delete proceed kar sakte hain."
      );
    } catch (e) {
      console.warn("Error clearing dues:", e);
    }
  };

  const handleOpenDelete = (acc: LocalCustomerAccount) => {
    const dues = acc.credit?.used ?? 0;
    if (dues > 0) {
      Alert.alert(
        "⚠️ Pending Khata Dues!",
        `Customer "${acc.customer.name}" par abhi ₹${dues} ke dues baki hain!\n\nPehle dues clear karein ya payment collect karein, tabhi account delete ho sakta hai.\n\nKya aap abhi dues clear (₹0) karke delete modal open karna chahte hain?`,
        [
          { text: "Nahi, Cancel", style: "cancel" },
          {
            text: "Dues Clear (₹0) & Delete",
            style: "destructive",
            onPress: async () => {
              await handleClearDuesForDelete(acc.id);
              setCustomerToDelete({
                ...acc,
                credit: { ...acc.credit, used: 0 },
              });
              setDeleteModalVisible(true);
            },
          },
        ]
      );
      return;
    }
    setCustomerToDelete(acc);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    const dues = customerToDelete.credit?.used ?? 0;
    if (dues > 0) {
      Alert.alert(
        "Pending Khata Dues",
        `Customer par ₹${dues} ke dues baki hain. Delete karne se pehle dues clear karna anivarya hai.`
      );
      return;
    }
    setDeleteLoading(true);
    try {
      const acc = customerToDelete;
      deleteCustomerAccount(acc.id);
      await deleteCustomerFromDb({
        id: acc.id,
        phone: acc.customer.phone,
        email: acc.customer.email,
      });
      await syncAllDataFromCloud();
      setDeleteModalVisible(false);
      setCustomerToDelete(null);
      Alert.alert(
        "Customer Deleted",
        `${acc.customer.name} ka account delete ho gaya hai. Order history store sales analytics ke liye surakshit rahegi.`
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to delete customer.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleApproveCredit = async (accountId: string, limit: number) => {
    approveOwnerCredit(accountId, limit, "Lifetime");
    await upsertCreditAccountInDb({
      customerId: accountId,
      status: "approved",
      limitAmount: limit,
      usedAmount: 0,
      enabled: true,
    });
    await syncAllDataFromCloud();
  };

  const handleDeclineCredit = async (accountId: string) => {
    declineOwnerCredit(accountId);
    await upsertCreditAccountInDb({
      customerId: accountId,
      status: "declined",
      limitAmount: 0,
      usedAmount: 0,
      enabled: false,
    });
    await syncAllDataFromCloud();
  };

  const handleDeleteCredit = async (accountId: string) => {
    deleteOwnerCredit(accountId);
    await deleteCreditAccountInDb(accountId);
    await syncAllDataFromCloud();
  };

  const handleToggleCredit = async (accountId: string, enabled: boolean) => {
    setOwnerCreditEnabled(accountId, enabled);
    const target = creditAccounts.find((c) => c.id === accountId);
    if (target) {
      await upsertCreditAccountInDb({
        customerId: accountId,
        status: target.credit.status,
        limitAmount: target.credit.limit || 0,
        usedAmount: target.credit.used || 0,
        enabled,
      });
      await syncAllDataFromCloud();
    }
  };

  const handleResetCreditUsed = async (accountId: string) => {
    resetOwnerCreditUsed(accountId);
    const target = creditAccounts.find((c) => c.id === accountId);
    await upsertCreditAccountInDb({
      customerId: accountId,
      status: "approved",
      limitAmount: target?.credit?.limit || 0,
      usedAmount: 0,
      enabled: true,
    });
    await syncAllDataFromCloud();
  };

  const handleSetCreditLimit = async (accountId: string, newLimit: number) => {
    setOwnerCreditLimit(accountId, newLimit);
    const target = creditAccounts.find((c) => c.id === accountId);
    await upsertCreditAccountInDb({
      customerId: accountId,
      status: newLimit > 0 ? "approved" : "none",
      limitAmount: newLimit,
      usedAmount: target?.credit?.used || 0,
      enabled: newLimit > 0,
    });
    await syncAllDataFromCloud();
  };

  const handleSaveSettings = async (updates: Partial<StoreSettings>) => {
    updateSettings(updates);
    try {
      await updateStoreSettingsInDb(updates);
      await syncAllDataFromCloud();
    } catch (e) {
      console.warn("handleSaveSettings sync error:", e);
    }
  };

  const handleToggleStoreStatus = async () => {
    try {
      const nextStatus = settings.isOpen === false ? true : false;
      await handleSaveSettings({ isOpen: nextStatus });
      Alert.alert(
        nextStatus ? "🟢 Dukaan Khul Gayi Hai" : "🔴 Dukaan Band Kar Di Gayi Hai",
        nextStatus
          ? "Store ab customer app par OPEN dikhega aur orders accept honge."
          : "Store ab customer app par CLOSED dikhega."
      );
    } catch (e) {
      console.warn("handleToggleStoreStatus error:", e);
    }
  };

  useEffect(() => {
    if (hydrated && !ownerMode) {
      router.replace("/login" as never);
    }
  }, [hydrated, ownerMode, router]);

  if (hydrated && !ownerMode) {
    return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
  }

  return (
    <ScreenContainer className="px-0">
      <View className="px-4">
        {/* Top Header */}
        <AdminHeader
          storeName={settings.storeName}
          syncing={syncing}
          lastSyncTime={lastSyncTime}
          isOpen={settings.isOpen !== false}
          onToggleStoreStatus={handleToggleStoreStatus}
          onSync={handleManualSync}
          onLogout={handleAdminLogout}
        />
      </View>

      {/* Main Tab Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        {tab === "Overview" && (
          <OverviewTab
            todaySales={todaySales}
            ordersCount={todayLiveOrders.length}
            pendingOrdersCount={
              todayLiveOrders.filter((o) => o.status === "New" || o.status === "Packed").length
            }
            todayLiveOrders={todayLiveOrders}
            lowStockProducts={lowStockProducts}
            pendingApprovalsCount={pendingCustomerRequests.length}
            onNavigateTab={setTab}
            onOpenProductForm={handleOpenAddProduct}
          />
        )}

        {tab === "Orders" && (
          <OrdersTab
            orders={filteredOrders}
            orderSearch={orderSearch}
            onSearchChange={setOrderSearch}
            statusFilter={orderStatusFilter}
            onStatusFilterChange={setOrderStatusFilter}
            onUpdateStatus={handleOrderStatusUpdate}
            onUpdateOrderTotal={(order, amount) => updateOwnerOrderTotal(order.accountId, order.id, amount)}
            onDeleteOrder={handleDeleteOrder}
            onCancelOrder={handleCancelOrder}
          />
        )}

        {tab === "Products" && (
          <ProductsTab
            products={products}
            productSearch={productSearch}
            onSearchChange={setProductSearch}
            onOpenAddModal={handleOpenAddProduct}
            onEditProduct={handleOpenEditProduct}
            onUpdateStock={handleUpdateProductStock}
            onDeleteProduct={handleDeleteProduct}
            categories={settings.catalogCategories}
            onAddCategory={handleAddCategory}
            featuredProductIds={settings.featuredProductIds}
            onToggleFeaturedProduct={handleToggleFeaturedProduct}
          />
        )}

        {tab === "Customers" && (
          <CustomersTab
            pendingCustomers={pendingCustomerRequests}
            approvedCustomers={approvedCustomers}
            customerSearch={customerSearch}
            onSearchChange={setCustomerSearch}
            onApproveCustomer={handleApproveCustomer}
            onRejectCustomer={handleRejectCustomer}
            onOpenSecurity={handleOpenSecurity}
            onOpenDelete={handleOpenDelete}
          />
        )}

        {tab === "Credit" && (
          <CreditTab
            creditAccounts={creditAccounts}
            onApproveCredit={handleApproveCredit}
            onDeclineCredit={handleDeclineCredit}
            onDeleteCredit={handleDeleteCredit}
            onToggleCredit={handleToggleCredit}
            onResetCreditUsed={handleResetCreditUsed}
            onSetCreditLimit={handleSetCreditLimit}
          />
        )}

        {tab === "Basket" && (
          <FestivalBasketManager />
        )}

        {tab === "Settings" && (
          <SettingsTab
            settings={settings}
            onSaveSettings={handleSaveSettings}
          />
        )}

        {tab === "Security" && (
          <SecurityTab
            biometricEnabled={biometricEnabled}
            onBiometricToggle={setBiometricEnabled}
          />
        )}
      </ScrollView>

      {/* Fixed Admin Bottom Navigation Bar */}
      <AdminBottomNavbar
        currentTab={tab}
        onSelectTab={setTab}
        pendingOrdersCount={
          ownerOrders.filter((o) => o.status === "New" || o.status === "Packed").length
        }
        pendingApprovalsCount={pendingCustomerRequests.length}
        lowStockCount={lowStockProducts.length}
      />

      {/* Security & Access Modal */}
      <SecurityModal
        visible={securityModalVisible}
        customer={selectedCustomer}
        role={selectedRole}
        onRoleChange={setSelectedRole}
        status={selectedStatus}
        onStatusChange={setSelectedStatus}
        saving={securitySaving}
        onSave={handleSaveSecurity}
        onClose={() => setSecurityModalVisible(false)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteModal
        visible={deleteModalVisible}
        customer={customerToDelete}
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClearDues={handleClearDuesForDelete}
        onClose={() => {
          setDeleteModalVisible(false);
          setCustomerToDelete(null);
        }}
      />

      {/* Add / Edit Product Modal */}
      <ProductModal
        visible={showProductModal}
        productToEdit={editingProduct}
        categories={settings.catalogCategories}
        onSave={handleSaveProduct}
        onClose={() => {
          setShowProductModal(false);
          setEditingProduct(null);
        }}
        onAddNewCategory={handleAddCategory}
      />
    </ScreenContainer>
  );
}

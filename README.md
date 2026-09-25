# 🛒 NIV Kirana

> **Smart Digital Kirana & Khata Commerce Platform**  
> Built with **Google Antigravity**, **React Native (Expo SDK 57)**, and **Supabase Cloud Backend**.

---

## 🌟 Features Overview

### 1. 🛍️ Customer Portal (`/(tabs)`)
- **Interactive Shop**: Browse kirana catalog by category (Atta, Dal, Oil, Spices, Dairy, Personal Care).
- **Universal Scanner**: Instant barcode & QR code lookup directly from the search bar.
- **Festival Baskets**: Pre-curated bundles (e.g., Diwali Puja Basket, Daily Ration Pack) with one-click cart addition.
- **Voice Ordering**: Record Hindi/Hinglish audio voice orders with real-time transcription and parsing.
- **Khata Credit Ledger**: View current credit balance, transaction history, and credit activation status.
- **Store Contact & Support**: Direct WhatsApp ordering, phone hotline, and store timing badges.

### 2. 🏪 Store Admin Console (`/admin`)
- **Decoupled Architecture**: Fully separated from customer screens for security and focus.
- **Live Orders Queue**: Real-time incoming orders with status progression (`New` → `Accepted` → `Dispatched` → `Completed`) and instant WhatsApp customer messaging.
- **Catalog & Inventory Restock**: Live product management with real-time stock counters, low-stock warnings, and barcode scanner integration.
- **Customer CRM & Approvals**: One-click approval/rejection of new customer accounts and Khata credit limit assignments.
- **Store Operations**: Shop open/close hours, UPI ID configuration, credit toggles, and delivery radius settings.

### 3. 📷 Universal Scanner (`components/universal-scanner.tsx`)
- **Live Barcode / QR Scanning**: Built on `expo-camera` (`CameraView`) supporting `EAN-13`, `EAN-8`, `UPC-A`, `UPC-E`, `Code 128`, `Code 39`, and `QR`.
- **Instant Product Match**: Auto-detects matching products from the database, highlights item details, and enables instant cart addition (customer) or restock (admin).
- **AI Packet Photo Analysis**: Camera snapshot fallback designed for unbranded Indian spice/grain packet labels.
- **Haptic Feedback**: Tactile vibration confirmation on successful detection.

### 4. ⚡ Supabase Cloud Backend & RBAC Security
- **Project Reference:** `ztvikgbtmsvlqlwotzkf` (`niv-kirana`, Mumbai region)
- **PostgreSQL Database Tables**:
  - `profiles`: Customer and Admin profiles with role-based access (`customer` | `admin`) and status (`pending` | `approved` | `rejected`).
  - `products`: Product catalog with categories, pricing, MRP, stock levels, and barcodes.
  - `orders`: Cloud persistence for customer orders, totals, and delivery snapshots.
  - `store_settings`: Shop configuration, UPI ID, opening/closing hours, and hotlines.
  - `credit_accounts`: Khata balances, ledger history, and credit limits.
  - `festival_baskets`: Curated bundles.
- **Row-Level Security (RLS)**: Strictly limits customer access to their own data while granting administrators full management control.
- **PostgreSQL Triggers**: Automatic profile provisioning on Supabase Auth signup (`on_auth_user_created`).

---

## 🔐 Credentials & Default Accounts

### Store Owner (Admin)
- **Portal URL:** `http://localhost:8081/admin` (or choose **Store Owner Login** on `/login`)
- **Email:** `owner@nivkirana.com`
- **Password:** `Owner@123`
- **Role:** `admin` (Status: `approved`)

### Customer Registration
- New customers can sign up with their phone/email and delivery address.
- Submissions enter the Store Owner's CRM for review and approval before placing orders.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Development Environment** | Google Antigravity |
| **Frontend Framework** | React Native (Expo SDK ~57.0.24, Expo Router v7) |
| **Backend & Database** | Supabase Cloud (PostgreSQL 15, Auth, RLS, Storage) |
| **Styling** | NativeWind (Tailwind CSS) with light & dark theme tokens |
| **Camera & Hardware** | `expo-camera`, `expo-haptics`, `expo-audio`, `expo-location` |
| **State Management** | React Context (`NivStoreProvider`) + AsyncStorage local persistence |
| **Data Fetching** | TanStack React Query + tRPC |
| **Testing** | Vitest (149 unit tests passing across 51 test suites) |
| **Language** | TypeScript (Strict mode, 0 errors) |

---

## 🚀 Getting Started

```bash
cd niv-kirana

# Install dependencies
pnpm install

# Start Expo Metro web server
npx expo start --web -p 8081

# Run tests
pnpm test
```

---

## 📄 License
Private and proprietary — NIV Kirana. Powered by Google Antigravity.

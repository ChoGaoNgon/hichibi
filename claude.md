# Project Context & AI System Prompts (Hi chibi Coffee House)

This file (`claude.md`) provides the architectural context, technological stack, and strict coding conventions for AI assistants (like Claude) to follow when contributing to the **Hi chibi Coffee House** project.

## 1. Project Overview
A multi-platform (Mobile, Tablet, Desktop) web application for ordering and managing a coffee shop. It includes customer ordering features, a streamlined tablet POS interface for on-site staff, and a comprehensive Admin dashboard.

## 2. Tech Stack Core
- **Framework:** Vue 3 (Composition API, `<script setup>`)
- **State Management:** Pinia (e.g., `authStore`, `cartStore`)
- **Routing:** Vue Router
- **Styling:** Tailwind CSS, Lucide Icons (for UI components), Motion/Vue (for transitions)
- **Backend/DB:** Firebase (Authentication, Cloud Firestore)
- **Language:** TypeScript
- **Integrations:** Telegram Bot API (Order Notifications), Google Sheets API (Data Sync), Google Calendar API.

## 3. Architecture & Strict Paradigms

### A. Database Reads & Cost Optimization (CRITICAL)
- **HYBRID FETCHING / MICRO REAL-TIME:** We generally avoid broad `onSnapshot` global listeners to save Firestore read costs. However, there is ONE highly optimized exception: A limited global listener in `App.vue` tracks ONLY the top 2 newest active orders (`limit(2)`) for the logged-in user. 
- **Event-Driven Reactivity:** This `limit(2)` listener ignores terminal states locally (`completed`, `cancelled`) and dispatches a `CustomEvent('order-status-updated')` on the `window`. Components like `Orders.vue` listen to this event to reactively update the UI and fire Toast notifications without refetching large lists.
- **On-Demand Fetching:** For full lists (Admin dashboards, full order histories, etc.), use `getDocs()`, `getDoc()`, and manual "Refresh" buttons (icon-only `RefreshCw`). **Do NOT** implement new `onSnapshot` routines without explicit permission and strict limits.
- **Offline Cache System:** The Customer Menu heavily relies on `localStorage`. The system fetches a `lastUpdated` timestamp from the `settings/cache_info` document. The client compares this timestamp with its local version and only re-fetches the entire products/categories collections if the server timestamp is newer.

### B. UI/UX Conventions
- **Space Optimization:** For Admin and Staff dashboards, use icons (from `lucide-vue-next`) instead of text for repetitive actions (e.g., Refresh, Add Product/Category). Include tooltips (`title="..."`) for clarity.
- **Mobile-First:** Ensure all tables, grids, and dialogs are responsive. Use horizontal scrolling for data-heavy tables on mobile screens. 
- **Feedback:** Use `vue-sonner` (toast notifications) for success/error states instead of native `alert()`.

### C. Authentication & Role-Based Access Control (RBAC)
- **Auth Provider:** Google Sign-in (`signInWithPopup`).
- **Roles:** `admin`, `staff`, `tablet`, `customer`.
- **Enforcement:** Role checks must be done at the UI level (`v-if="authStore.isAdmin"`), Router level (`beforeEach` guards), and Firestore Security Rules.
- **Tablet Mode:** The `/tablet` route is a fast-POS mode. It skips customer info requirements and goes straight to check out and print bills.

## 4. Firestore Database Structure

Always adhere to this document structure when writing queries or types:

1. **`users`**: `{ uid, email, displayName, role, createdAt }`
2. **`categories`**: `{ name, slug, order, image }`
3. **`products`**: `{ name, description, price, image, category, isAvailable, isTrending, options: { sizes, toppings } }`
4. **`orders`**: `{ userId, customerName, customerPhone, items, totalAmount, subtotal, status, deliveryMethod, address, note, createdAt, updatedAt, paymentMethod }`
    - *Statuses:* `pending` -> `processing` -> `delivering` -> `completed` (or `cancelled`).
5. **`vouchers`**: `{ code, discountType, discountValue, minOrderAmount, maxUsage, usedCount, startDate, endDate, isActive }`
6. **`settings`**:
    - `store_info`: Store metadata, social links, `telegramBotToken`, `googleSheetsUrl`.
    - `cache_info`: `{ lastUpdated, autoUpdate }`.

## 5. Coding Standards & Rules for AI

When generating code for this project, you MUST adhere to the following rules:

1. **Composition API Only:** Use `<script setup lang="ts">`. Do not use the Options API.
2. **Firebase V9+ Modular SDK:** Always import modular functions (e.g., `import { collection, query, getDocs } from 'firebase/firestore'`). Do not use the compat API.
3. **Vue Reactivity:** Use `ref` for primitives and `reactive` for complex objects. Prefer `ref` generally for consistency across the codebase.
4. **Styling:** Use Tailwind CSS utility classes exclusively. Do not write custom CSS in `<style>` blocks unless absolutely necessary for complex animations. Use `flex` and `grid` predominantly.
5. **Type Safety:** Always define TS Interfaces/Types for Firestore documents in the script block or a separate types file before mapping data. Use `as Product`, `as Order`, etc., when pulling `doc.data()`.
6. **Error Handling:** Wrap all async Firebase operations in `try/catch` and display a user-friendly toast message upon failure.

## 6. How to Implement Features (AI Workflow)
If asked to add a new feature:
1. Check if the database needs schema updates. If yes, respect NoSQL best practices.
2. Ensure you are NOT adding `onSnapshot`. Use `getDocs` and a state variable.
3. Update the UI using Tailwind forms or tables. Check responsive breakpoints (`sm:`, `md:`, `lg:`).
4. Verify standard RBAC. Is this an `admin` only feature or `staff` as well? Wrap with UI guards.

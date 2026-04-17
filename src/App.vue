<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { Toaster, toast } from 'vue-sonner';
import Navbar from './components/Navbar.vue';
import WebViewGuard from './components/WebViewGuard.vue';
import { db, collection, query, where, onSnapshot } from './firebase';
import type { Order, OrderStatus } from './types';

const authStore = useAuthStore();
const route = useRoute();
let unsubscribe: (() => void) | null = null;
const knownOrderStatuses = ref<Record<string, OrderStatus>>({});
const isInitialLoad = ref(true);

const setupOrderListener = (userId: string) => {
  if (unsubscribe) unsubscribe();

  const q = query(
    collection(db, 'orders'),
    where('userId', '==', userId)
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docs.forEach(doc => {
      const orderData = doc.data() as Order;
      const orderId = doc.id;
      const currentStatus = orderData.status;

      if (!isInitialLoad.value) {
        const previousStatus = knownOrderStatuses.value[orderId];
        if (previousStatus && previousStatus !== currentStatus) {
          showStatusToast(orderId, currentStatus);
        }
      }
      
      knownOrderStatuses.value[orderId] = currentStatus;
    });
    
    isInitialLoad.value = false;
  });
};

const showStatusToast = (orderId: string, status: OrderStatus) => {
  // Don't show toast if user is already on the Orders page (it has its own listener)
  if (route.path === '/orders') return;

  const statusLabels: Record<OrderStatus, string> = {
    'pending': 'đang chờ xác nhận',
    'processing': 'đang được xử lý',
    'delivering': 'đang được giao đi',
    'completed': 'đã hoàn thành',
    'cancelled': 'đã bị hủy'
  };

  const label = statusLabels[status] || status;
  
  toast.info(`Đơn hàng #${orderId.slice(-6).toUpperCase()} ${label}`, {
    description: 'Trạng thái đơn hàng của bạn vừa được cập nhật.',
    duration: 5000,
  });
};

watch(() => authStore.user?.uid, (newUid) => {
  if (newUid) {
    isInitialLoad.value = true;
    setupOrderListener(newUid);
  } else {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    knownOrderStatuses.value = {};
  }
}, { immediate: true });

onMounted(() => {
  authStore.init();
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});
</script>

<template>
  <Toaster position="top-center" richColors :expand="false" :offset="32" />
  <WebViewGuard />
  <div v-if="authStore.loading" class="h-screen flex items-center justify-center bg-orange-50">
    <div class="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
  <div v-else class="min-h-screen bg-white flex flex-col font-sans print:bg-white print:block">
    <Navbar v-if="route.path !== '/' && route.path !== '/checkout' && route.path !== '/cart' && route.path !== '/tablet'" class="print:hidden" />
    <main class="flex-grow print:m-0 print:p-0">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile first adjustments */
@media (max-width: 640px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>

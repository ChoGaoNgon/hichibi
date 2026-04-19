<script setup lang="ts">
import { onMounted, watch, ref, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { Toaster, toast } from 'vue-sonner';
import Navbar from './components/Navbar.vue';
import WebViewGuard from './components/WebViewGuard.vue';
import { db, collection, query, where, orderBy, limit, onSnapshot } from './firebase';
import type { Order } from './types';

const authStore = useAuthStore();
const route = useRoute();

const unsubscribeActiveOrders = ref<() => void>();
const knownOrderStatuses = ref<Record<string, string>>({});

watch(() => authStore.user, (user) => {
  if (unsubscribeActiveOrders.value) {
    unsubscribeActiveOrders.value();
    unsubscribeActiveOrders.value = undefined;
    knownOrderStatuses.value = {};
  }
  
  // Listen to top 2 newest orders to improve UX for customers/staff
  if (user) {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(2)
    );
    
    unsubscribeActiveOrders.value = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const order = change.doc.data() as Order;
        const oId = change.doc.id;
        
        // Dispatch global event so UI component (Orders.vue) can update in real-time
        window.dispatchEvent(new CustomEvent('order-status-updated', {
          detail: { id: oId, status: order.status }
        }));
        
        const oldStatus = knownOrderStatuses.value[oId];

        if (change.type === 'added') {
          // If first loaded and it's already terminal, do not track for live toasts.
          if (!['completed', 'cancelled'].includes(order.status)) {
            knownOrderStatuses.value[oId] = order.status;
          }
        } else if (change.type === 'modified') {
          // If tracked status changed
          if (oldStatus && oldStatus !== order.status) {
            const statusMap: Record<string, string> = {
              'pending': 'Chờ xác nhận',
              'processing': 'Đang pha chế',
              'delivering': 'Đang giao hàng',
              'completed': 'Đã hoàn thành',
              'cancelled': 'Đã hủy',
            };
            toast.info(`Đơn hàng #${oId.slice(-6).toUpperCase()}`, {
              description: `Trạng thái mới: ${statusMap[order.status] || order.status}`,
              duration: 5000,
            });
            
            // If it reached a terminal state, stop tracking
            if (['completed', 'cancelled'].includes(order.status)) {
              delete knownOrderStatuses.value[oId];
            } else {
              knownOrderStatuses.value[oId] = order.status;
            }
          // If it started tracking later (e.g. was offline/reconnected)
          } else if (!oldStatus && !['completed', 'cancelled'].includes(order.status)) {
            knownOrderStatuses.value[oId] = order.status;
          }
        }
      });
    }, (error) => {
      console.warn('Active orders listener error:', error);
    });
  }
});

onUnmounted(() => {
  if (unsubscribeActiveOrders.value) {
    unsubscribeActiveOrders.value();
  }
});

onMounted(() => {
  authStore.init();
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

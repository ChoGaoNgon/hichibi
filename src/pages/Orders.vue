<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  ChevronRight, 
  Package, 
  Truck, 
  XCircle,
  Copy,
  Plus
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { db, collection, query, where, orderBy, onSnapshot, Timestamp, doc, updateDoc, handleFirestoreError, OperationType } from '../firebase';
import type { Order, OrderStatus } from '../types';
import { toast } from 'vue-sonner';

const authStore = useAuthStore();
const cartStore = useCartStore();
const router = useRouter();

const orders = ref<Order[]>([]);
const loading = ref(true);
const selectedOrder = ref<Order | null>(null);
const orderToCancel = ref<Order | null>(null);
const isCancelling = ref(false);
let unsubscribe: (() => void) | null = null;

const openDetails = (order: Order) => {
  selectedOrder.value = order;
};

const closeDetails = () => {
  selectedOrder.value = null;
};

const confirmCancel = (order: Order) => {
  orderToCancel.value = order;
};

const cancelCancel = () => {
  orderToCancel.value = null;
};

const proceedCancel = async () => {
  if (!orderToCancel.value) return;
  const order = orderToCancel.value;
  
  isCancelling.value = true;
  try {
    const orderRef = doc(db, 'orders', order.id);
    await updateDoc(orderRef, {
      status: 'cancelled',
      updatedAt: Timestamp.now()
    });
    
    toast.success('Đã hủy đơn hàng thành công');
    closeDetails();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
    toast.error('Có lỗi xảy ra khi hủy đơn hàng');
  } finally {
    isCancelling.value = false;
    orderToCancel.value = null;
  }
};

const setupRealtimeOrders = () => {
  if (!authStore.user) return;
  
  loading.value = true;
  const q = query(
    collection(db, 'orders'),
    where('userId', '==', authStore.user.uid),
    orderBy('createdAt', 'desc')
  );

  unsubscribe = onSnapshot(q, (snapshot) => {
    const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    
    // Check for status changes to show toast
    if (!loading.value && orders.value.length > 0) {
      newOrders.forEach(newOrder => {
        const oldOrder = orders.value.find(o => o.id === newOrder.id);
        if (oldOrder && oldOrder.status !== newOrder.status) {
          showStatusToast(newOrder);
          
          // Update selected order if it's the one that changed
          if (selectedOrder.value && selectedOrder.value.id === newOrder.id) {
            selectedOrder.value = { ...newOrder };
          }
        }
      });
    }

    orders.value = newOrders;
    loading.value = false;
  }, (error) => {
    console.error('Error listening to orders', error);
    toast.error('Có lỗi xảy ra khi tải lịch sử đơn hàng');
    loading.value = false;
  });
};

const showStatusToast = (order: Order) => {
  const statusLabels: Record<OrderStatus, string> = {
    'pending': 'đang chờ xác nhận',
    'processing': 'đang được xử lý',
    'delivering': 'đang được giao đi',
    'completed': 'đã hoàn thành',
    'cancelled': 'đã bị hủy'
  };

  const label = statusLabels[order.status] || order.status;
  
  toast.info(`Đơn hàng #${order.id.slice(-6).toUpperCase()} ${label}`, {
    description: 'Trạng thái đơn hàng của bạn vừa được cập nhật.',
    duration: 5000,
  });
};

onMounted(() => {
  setupRealtimeOrders();
});

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return 'bg-orange-100 text-orange-600';
    case 'processing': return 'bg-blue-100 text-blue-600';
    case 'delivering': return 'bg-purple-100 text-purple-600';
    case 'completed': return 'bg-green-100 text-green-600';
    case 'cancelled': return 'bg-red-100 text-red-600';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const getStatusLabel = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return 'Chờ xác nhận';
    case 'processing': return 'Đang xử lý';
    case 'delivering': return 'Đang giao hàng';
    case 'completed': return 'Đã hoàn thành';
    case 'cancelled': return 'Đã hủy';
    default: return status;
  }
};

const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return Clock;
    case 'processing': return Package;
    case 'delivering': return Truck;
    case 'completed': return CheckCircle;
    case 'cancelled': return XCircle;
    default: return Clock;
  }
};

const copyOrder = (order: Order) => {
  cartStore.clearCart();
  order.items.forEach(item => {
    cartStore.addToCart({ ...item });
  });
  toast.success('Đã sao chép đơn hàng vào giỏ hàng');
  router.push('/cart');
};

const formatDate = (timestamp: Timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate();
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
</script>

<template>
  <div class="min-h-screen bg-[#FFF8F6] flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden">
    <!-- Header -->
    <header class="px-6 pt-8 pb-4 flex items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <button @click="router.back()" class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-900 shadow-sm border border-gray-100">
        <ArrowLeft :size="20" />
      </button>
      <h1 class="text-xl font-black text-gray-900 uppercase tracking-tighter">Lịch sử đơn hàng</h1>
    </header>

    <div class="flex-grow overflow-y-auto p-6 no-scrollbar pb-32">
      <div v-if="!authStore.user" class="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
          <ShoppingBag :size="48" />
        </div>
        <div class="space-y-2">
          <h2 class="text-xl font-black text-gray-900 uppercase tracking-tighter">BẠN CHƯA ĐĂNG NHẬP</h2>
          <p class="text-gray-400 text-sm font-medium">Vui lòng đăng nhập để xem lịch sử mua hàng.</p>
        </div>
        <button
          @click="authStore.login()"
          class="w-full py-4 bg-[#C04D1E] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#C04D1E]/30"
        >
          Đăng nhập ngay
        </button>
      </div>

      <div v-else-if="loading" class="flex justify-center py-20">
        <div class="w-8 h-8 border-3 border-[#C04D1E] border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="orders.length === 0" class="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
          <ShoppingBag :size="48" />
        </div>
        <div class="space-y-2">
          <h2 class="text-xl font-black text-gray-900 uppercase tracking-tighter">CHƯA CÓ ĐƠN HÀNG</h2>
          <p class="text-gray-400 text-sm font-medium">Bạn chưa thực hiện đơn hàng nào.</p>
        </div>
        <button
          @click="router.push('/')"
          class="w-full py-4 bg-[#C04D1E] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#C04D1E]/30"
        >
          Mua sắm ngay
        </button>
      </div>

      <div v-else class="space-y-6">
        <div 
          v-for="order in orders" 
          :key="order.id"
          class="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden"
        >
          <!-- Order Header -->
          <div class="p-6 border-b border-gray-50 flex justify-between items-start">
            <div class="space-y-1">
              <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">MÃ ĐƠN HÀNG</p>
              <p class="font-black text-gray-900 uppercase tracking-tight">#{{ order.id.slice(-6).toUpperCase() }}</p>
              <p class="text-[10px] text-gray-400 font-bold tracking-tight">{{ formatDate(order.createdAt) }}</p>
            </div>
            <div :class="['px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors duration-500', getStatusColor(order.status)]">
              <component :is="getStatusIcon(order.status)" :size="12" />
              <transition name="fade-status" mode="out-in">
                <span :key="order.status">
                  {{ getStatusLabel(order.status) }}
                </span>
              </transition>
            </div>
          </div>

          <!-- Order Items Preview -->
          <div class="p-6 space-y-4">
            <div v-for="(item, i) in order.items.slice(0, 2)" :key="i" class="flex gap-4">
              <div class="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                <img :src="item.image" alt="" class="w-full h-full object-cover" />
              </div>
              <div class="flex-grow py-0.5">
                <h4 class="text-[10px] font-black text-gray-900 line-clamp-1 uppercase tracking-tight">{{ item.name }}</h4>
                <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest">x{{ item.quantity }} • {{ item.size }}</p>
              </div>
            </div>
            <div v-if="order.items.length > 2" class="text-[10px] text-gray-400 font-bold uppercase tracking-widest pl-16">
              Và {{ order.items.length - 2 }} món khác...
            </div>
          </div>

          <!-- Order Footer -->
          <div class="p-6 bg-gray-50 flex items-center justify-between">
            <div>
              <p class="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">TỔNG CỘNG</p>
              <p class="text-lg font-black text-[#C04D1E] tracking-tighter">{{ (order.totalAmount || 0).toLocaleString() }}đ</p>
            </div>
            <div class="flex gap-2">
              <button 
                @click="copyOrder(order)"
                class="w-10 h-10 bg-white text-gray-900 rounded-xl flex items-center justify-center shadow-sm border border-gray-200 hover:bg-gray-100 transition-all"
                title="Sao chép đơn hàng"
              >
                <Copy :size="18" />
              </button>
              <button 
                @click="openDetails(order)"
                class="px-6 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all"
              >
                Chi tiết
                <ChevronRight :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Order Details Modal -->
    <div v-if="selectedOrder" class="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeDetails"></div>
      <div class="relative bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-black text-gray-900 uppercase tracking-tighter">Chi tiết đơn hàng</h3>
          <button @click="closeDetails" class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
            <XCircle :size="20" />
          </button>
        </div>
        
        <div class="space-y-6">
          <!-- Status & Info -->
          <div class="bg-gray-50 rounded-2xl p-4 space-y-3">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Mã đơn</span>
              <span class="font-black text-gray-900 uppercase tracking-tight">#{{ selectedOrder.id.slice(-6).toUpperCase() }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Trạng thái</span>
              <div :class="['px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-colors duration-500', getStatusColor(selectedOrder.status)]">
                <component :is="getStatusIcon(selectedOrder.status)" :size="12" />
                <transition name="fade-status" mode="out-in">
                  <span :key="selectedOrder.status">
                    {{ getStatusLabel(selectedOrder.status) }}
                  </span>
                </transition>
              </div>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Thời gian</span>
              <span class="text-xs font-bold text-gray-900">{{ formatDate(selectedOrder.createdAt) }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Phương thức</span>
              <span class="text-xs font-bold text-gray-900">{{ selectedOrder.deliveryMethod === 'delivery' ? 'Giao hàng' : (selectedOrder.deliveryMethod === 'pickup' ? 'Nhận tại cửa hàng' : 'Uống tại quán') }}</span>
            </div>
          </div>

          <!-- Customer Info -->
          <div class="space-y-2">
            <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Thông tin người nhận</h4>
            <div class="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
              <p class="text-sm font-bold text-gray-900">{{ selectedOrder.customerName }}</p>
              <p class="text-sm text-gray-600">{{ selectedOrder.customerPhone }}</p>
              <p v-if="selectedOrder.address" class="text-sm text-gray-600">{{ selectedOrder.address }}</p>
            </div>
          </div>

          <!-- Items -->
          <div class="space-y-2">
            <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sản phẩm</h4>
            <div class="space-y-3">
              <div v-for="(item, i) in selectedOrder.items" :key="i" class="flex gap-4 bg-white border border-gray-100 rounded-2xl p-3">
                <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <img :src="item.image" alt="" class="w-full h-full object-cover" />
                </div>
                <div class="flex-grow py-1">
                  <div class="flex justify-between items-start mb-1">
                    <h4 class="text-xs font-black text-gray-900 uppercase tracking-tight">{{ item.name }}</h4>
                    <span class="text-xs font-black text-[#C04D1E]">{{ (item.price * item.quantity).toLocaleString() }}đ</span>
                  </div>
                  <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">x{{ item.quantity }} • {{ item.size }}</p>
                  <p v-if="item.options" class="text-[10px] text-gray-400 line-clamp-1">{{ item.options }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="space-y-2 pt-4 border-t border-gray-100">
            <div v-if="selectedOrder.discountAmount" class="flex justify-between items-center">
              <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">Giảm giá</span>
              <span class="text-xs font-black text-green-600">-{{ (selectedOrder.discountAmount || 0).toLocaleString() }}đ</span>
            </div>
            <div class="flex justify-between items-center pt-2">
              <span class="text-sm font-black text-gray-900 uppercase tracking-widest">Tổng cộng</span>
              <span class="text-xl font-black text-[#C04D1E] tracking-tighter">{{ (selectedOrder.totalAmount || 0).toLocaleString() }}đ</span>
            </div>
          </div>
          
          <div v-if="selectedOrder.status === 'pending'" class="pt-4">
            <button 
              @click="confirmCancel(selectedOrder)"
              :disabled="isCancelling"
              class="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50"
            >
              Hủy đơn hàng này
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Confirm Modal -->
    <div v-if="orderToCancel" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="cancelCancel"></div>
      <div class="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <h3 class="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">Xác nhận hủy</h3>
        <p class="text-gray-600 mb-6 text-sm">Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này không thể hoàn tác.</p>
        <div class="flex gap-3">
          <button 
            @click="cancelCancel"
            :disabled="isCancelling"
            class="flex-1 py-3 bg-gray-100 text-gray-900 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
          >
            Không
          </button>
          <button 
            @click="proceedCancel"
            :disabled="isCancelling"
            class="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 flex justify-center items-center"
          >
            <span v-if="isCancelling" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span v-else>Có, Hủy</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-status-enter-active,
.fade-status-leave-active {
  transition: all 0.3s ease;
}
.fade-status-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.fade-status-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

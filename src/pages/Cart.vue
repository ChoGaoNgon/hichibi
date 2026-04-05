<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ChevronRight, 
  ArrowLeft, 
  Coffee, 
  MapPin, 
  CreditCard,
  Truck,
  Utensils,
  X,
  AlertTriangle
} from 'lucide-vue-next';
import { useCartStore } from '../stores/cart';

const cartStore = useCartStore();
const router = useRouter();

const isConfirmModalOpen = ref(false);
const itemIndexToRemove = ref<number | null>(null);

const requestRemove = (index: number) => {
  itemIndexToRemove.value = index;
  isConfirmModalOpen.value = true;
};

const confirmRemove = () => {
  if (itemIndexToRemove.value !== null) {
    cartStore.removeFromCart(itemIndexToRemove.value);
    isConfirmModalOpen.value = false;
    itemIndexToRemove.value = null;
  }
};

const handleUpdateQuantity = (index: number, delta: number) => {
  const item = cartStore.cart[index];
  if (item.quantity + delta <= 0) {
    requestRemove(index);
  } else {
    cartStore.updateQuantity(index, delta);
  }
};
</script>

<template>
  <div class="min-h-screen bg-[#FFF8F6] flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden">
    <!-- Header -->
    <header class="px-6 pt-8 pb-4 flex items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <button @click="router.back()" class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-900 shadow-sm border border-gray-100">
        <ArrowLeft :size="20" />
      </button>
      <h1 class="text-xl font-black text-gray-900 uppercase tracking-tighter">Giỏ hàng</h1>
    </header>

    <div class="flex-grow overflow-y-auto p-6 no-scrollbar pb-32">
      <div v-if="cartStore.cart.length === 0" class="flex flex-col items-center justify-center py-20 text-center space-y-8">
        <div class="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shadow-xl shadow-orange-600/10">
          <ShoppingBag :size="64" />
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">Giỏ hàng trống</h2>
          <p class="text-gray-400 text-sm font-medium px-8">Hãy lấp đầy nó bằng những món uống ngon tuyệt nhé!</p>
        </div>
        <button
          @click="router.push('/')"
          class="w-full py-5 bg-[#C04D1E] text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#C04D1E]/30 flex items-center justify-center gap-3"
        >
          <Coffee :size="20" />
          Đến thực đơn ngay
        </button>
      </div>

      <div v-else class="space-y-6">
        <!-- Delivery Method Display -->
        <div class="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex items-center gap-4">
          <div class="w-12 h-12 bg-[#FFF1ED] text-[#C04D1E] rounded-2xl flex items-center justify-center">
            <Truck v-if="cartStore.deliveryMethod === 'delivery'" :size="24" />
            <ShoppingBag v-else-if="cartStore.deliveryMethod === 'pickup'" :size="24" />
            <Utensils v-else :size="24" />
          </div>
          <div class="flex-grow">
            <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">PHƯƠNG THỨC</p>
            <p class="font-black text-gray-900 uppercase tracking-tight">
              {{ cartStore.deliveryMethod === 'delivery' ? 'Giao hàng tận nơi' : (cartStore.deliveryMethod === 'pickup' ? 'Đến lấy mang đi' : 'Uống tại quán') }}
            </p>
          </div>
          <button @click="router.push('/')" class="text-[10px] font-black text-[#C04D1E] uppercase tracking-widest underline">Thay đổi</button>
        </div>

        <!-- Cart Items -->
        <div class="space-y-4">
          <div
            v-for="(item, index) in cartStore.cart"
            :key="`${item.productId}-${index}`"
            class="bg-white p-4 rounded-[32px] shadow-sm border border-gray-100 flex gap-4 group"
          >
            <div class="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
              <img :src="item.image" :alt="item.name" class="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div class="flex-grow flex flex-col justify-between py-1">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-black text-xs text-gray-900 uppercase tracking-tight line-clamp-1">{{ item.name }}</h3>
                  <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Size: {{ item.size }}</p>
                </div>
                <button
                  @click="requestRemove(index)"
                  class="text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
              <div class="flex justify-between items-center mt-2">
                <div class="flex items-center gap-3 bg-gray-50 p-1 rounded-xl">
                  <button
                    @click="handleUpdateQuantity(index, -1)"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-white transition-all"
                  >
                    <Minus :size="16" />
                  </button>
                  <span class="w-4 text-center font-black text-sm tracking-tighter">{{ item.quantity }}</span>
                  <button
                    @click="handleUpdateQuantity(index, 1)"
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-white transition-all"
                  >
                    <Plus :size="16" />
                  </button>
                </div>
                <span class="text-sm font-black text-[#C04D1E] tracking-tighter">{{ (item.price * item.quantity).toLocaleString() }}đ</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Summary -->
        <div class="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 space-y-4">
          <h3 class="font-black text-gray-900 uppercase tracking-widest text-[10px] flex items-center gap-2">
            <CreditCard :size="14" class="text-[#C04D1E]" />
            TỔNG CỘNG
          </h3>
          <div class="space-y-2">
            <div class="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Tạm tính ({{ cartStore.totalItems }} món)</span>
              <span>{{ cartStore.totalPrice.toLocaleString() }}đ</span>
            </div>
            <div class="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Phí giao hàng</span>
              <span class="text-green-600">Miễn phí</span>
            </div>
            <div class="flex justify-between items-end pt-2 border-t border-gray-50">
              <span class="text-sm font-black text-gray-900 uppercase tracking-tight">Tổng cộng</span>
              <span class="text-xl font-black text-[#C04D1E] tracking-tighter">{{ cartStore.totalPrice.toLocaleString() }}đ</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Action -->
    <div v-if="cartStore.cart.length > 0" class="absolute bottom-0 left-0 right-0 p-8 bg-white/90 backdrop-blur-xl border-t border-gray-100 z-50">
      <button
        @click="router.push('/checkout')"
        class="w-full py-5 bg-[#C04D1E] text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-[#A03D18] transition-all shadow-xl shadow-[#C04D1E]/30 flex items-center justify-center gap-3 group"
      >
        Tiến hành đặt hàng
        <ChevronRight :size="20" class="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>

    <!-- Confirmation Modal -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isConfirmModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="isConfirmModalOpen = false"></div>
        <div class="relative bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl text-center space-y-6">
          <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
            <AlertTriangle :size="40" />
          </div>
          <div class="space-y-2">
            <h3 class="text-xl font-black text-gray-900 uppercase tracking-tighter">Xoá sản phẩm?</h3>
            <p class="text-gray-400 text-sm font-medium leading-relaxed">Bạn có chắc chắn muốn xoá món này khỏi giỏ hàng không?</p>
          </div>
          <div class="flex gap-3">
            <button
              @click="isConfirmModalOpen = false"
              class="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              Hủy bỏ
            </button>
            <button
              @click="confirmRemove"
              class="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
            >
              Đồng ý xoá
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

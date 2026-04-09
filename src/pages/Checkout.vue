<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { 
  CheckCircle, 
  ArrowLeft, 
  MapPin, 
  Phone, 
  User, 
  CreditCard, 
  Truck, 
  ShoppingBag, 
  ChevronRight, 
  AlertCircle,
  Utensils,
  Ticket,
  X
} from 'lucide-vue-next';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { db, collection, addDoc, Timestamp, OperationType, handleFirestoreError, getDocs, query, where, doc, updateDoc, increment } from '../firebase';
import type { Order, OrderStatus, Voucher } from '../types';
import { sendTelegramNotification } from '../services/telegramService';
import { syncOrderToGoogleSheets } from '../services/googleSheetsService';

const cartStore = useCartStore();
const authStore = useAuthStore();
const router = useRouter();

const customerName = ref(authStore.profile?.displayName || '');
const customerPhone = ref(authStore.profile?.phoneNumber || '');
const address = ref(authStore.profile?.address || '');
const note = ref('');

// Auto-fill when profile loads
watch(() => authStore.profile, (newProfile) => {
  if (newProfile) {
    if (!customerName.value || customerName.value === '') {
      customerName.value = newProfile.displayName || '';
    }
    if (!customerPhone.value || customerPhone.value === '') {
      customerPhone.value = newProfile.phoneNumber || '';
    }
    if (!address.value || address.value === '') {
      address.value = newProfile.address || '';
    }
  }
}, { immediate: true });

const isSubmitting = ref(false);
const orderSuccess = ref<string | null>(null);
const error = ref<string | null>(null);

// Voucher logic
const voucherInput = ref('');
const appliedVoucher = ref<Voucher | null>(null);
const voucherError = ref<string | null>(null);
const isApplyingVoucher = ref(false);

const applyVoucher = async () => {
  if (!voucherInput.value) return;
  
  isApplyingVoucher.value = true;
  voucherError.value = null;
  
  try {
    const q = query(
      collection(db, 'vouchers'), 
      where('code', '==', voucherInput.value.toUpperCase()),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      voucherError.value = 'Mã giảm giá không tồn tại hoặc đã hết hạn.';
      return;
    }
    
    const voucherDoc = snapshot.docs[0];
    const voucherData = { id: voucherDoc.id, ...voucherDoc.data() } as Voucher;
    
    const now = Timestamp.now();
    if (now < voucherData.startDate || now > voucherData.endDate) {
      voucherError.value = 'Mã giảm giá không trong thời gian sử dụng.';
      return;
    }
    
    if (voucherData.usedCount >= voucherData.maxUsage) {
      voucherError.value = 'Mã giảm giá đã hết lượt sử dụng.';
      return;
    }
    
    if (cartStore.totalPrice < voucherData.minOrderAmount) {
      voucherError.value = `Đơn hàng tối thiểu ${voucherData.minOrderAmount.toLocaleString()}đ để áp dụng.`;
      return;
    }
    
    appliedVoucher.value = voucherData;
    voucherInput.value = '';
  } catch (err) {
    console.error('Error applying voucher', err);
    voucherError.value = 'Có lỗi xảy ra khi áp dụng mã giảm giá.';
  } finally {
    isApplyingVoucher.value = false;
  }
};

const removeVoucher = () => {
  appliedVoucher.value = null;
};

const discountAmount = computed(() => {
  if (!appliedVoucher.value) return 0;
  if (appliedVoucher.value.discountType === 'percentage') {
    return Math.floor((cartStore.totalPrice * appliedVoucher.value.discountValue) / 100);
  }
  return appliedVoucher.value.discountValue;
});

const finalTotal = computed(() => Math.max(0, cartStore.totalPrice - discountAmount.value));

const handleSubmit = async () => {
  // Contact info is optional for tablet role
  if (!authStore.isTablet) {
    if (!customerName.value || !customerPhone.value || (cartStore.deliveryMethod === 'delivery' && !address.value)) {
      error.value = 'Vui lòng điền đầy đủ thông tin liên hệ và địa chỉ.';
      return;
    }
  }

  isSubmitting.value = true;
  error.value = null;

  let currentOperation = { type: OperationType.CREATE, path: 'orders' };
  try {
    const orderData: Omit<Order, 'id'> = {
      userId: authStore.user?.uid || 'guest',
      customerName: customerName.value || (authStore.isTablet ? 'Tablet Order' : 'Guest'),
      customerPhone: customerPhone.value || (authStore.isTablet ? 'N/A' : 'N/A'),
      items: cartStore.cart,
      totalAmount: finalTotal.value,
      status: 'pending' as OrderStatus,
      deliveryMethod: cartStore.deliveryMethod,
      address: cartStore.deliveryMethod === 'delivery' ? address.value : (cartStore.deliveryMethod === 'pickup' ? 'Nhận tại cửa hàng' : 'Uống tại quán'),
      note: note.value,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      ...(appliedVoucher.value ? {
        voucherCode: appliedVoucher.value.code,
        discountAmount: discountAmount.value
      } : {})
    };

    currentOperation = { type: OperationType.CREATE, path: 'orders' };
    const docRef = await addDoc(collection(db, 'orders'), orderData);
    
    // Update voucher usage
    if (appliedVoucher.value) {
      currentOperation = { type: OperationType.UPDATE, path: `vouchers/${appliedVoucher.value.id}` };
      await updateDoc(doc(db, 'vouchers', appliedVoucher.value.id), {
        usedCount: increment(1)
      });
    }

    orderSuccess.value = docRef.id;
    cartStore.clearCart();

    // Send Telegram Notification
    sendTelegramNotification({ id: docRef.id, ...orderData });
    
    // Sync to Google Sheets
    syncOrderToGoogleSheets({ id: docRef.id, ...orderData });
    
    // Redirect to orders for tablet role
    if (authStore.isTablet) {
      setTimeout(() => {
        router.push('/admin?tab=orders');
      }, 1500);
    }
  } catch (err) {
    handleFirestoreError(err, currentOperation.type, currentOperation.path);
    error.value = 'Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại.';
  } finally {
    isSubmitting.value = false;
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
      <h1 class="text-xl font-black text-gray-900 uppercase tracking-tighter">Thanh toán</h1>
    </header>

    <div class="flex-grow overflow-y-auto p-6 no-scrollbar pb-32">
      <div v-if="orderSuccess" class="flex flex-col items-center justify-center py-12 text-center space-y-8">
        <div class="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-xl shadow-green-600/10">
          <CheckCircle :size="64" />
        </div>
        <div class="space-y-2">
          <h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">ĐẶT HÀNG THÀNH CÔNG!</h2>
          <p class="text-gray-400 text-sm font-medium px-4">
            Mã đơn hàng: <span class="font-black text-[#C04D1E]">#{{ orderSuccess }}</span>. 
            Chúng tôi sẽ sớm liên hệ với bạn.
          </p>
        </div>
        <button
          @click="router.push('/')"
          class="w-full py-5 bg-[#C04D1E] text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#C04D1E]/30"
        >
          Tiếp tục mua sắm
        </button>
      </div>

      <div v-else class="space-y-8">
        <!-- Delivery Method Display -->
        <div class="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex items-center gap-4">
          <div class="w-12 h-12 bg-[#FFF1ED] text-[#C04D1E] rounded-2xl flex items-center justify-center">
            <Truck v-if="cartStore.deliveryMethod === 'delivery'" :size="24" />
            <ShoppingBag v-else-if="cartStore.deliveryMethod === 'pickup'" :size="24" />
            <Utensils v-else :size="24" />
          </div>
          <div>
            <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">PHƯƠNG THỨC</p>
            <p class="font-black text-gray-900 uppercase tracking-tight">
              {{ cartStore.deliveryMethod === 'delivery' ? 'Giao hàng tận nơi' : (cartStore.deliveryMethod === 'pickup' ? 'Đến lấy mang đi' : 'Uống tại quán') }}
            </p>
          </div>
        </div>

        <!-- Contact Info -->
        <div class="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
          <h3 class="font-black text-gray-900 uppercase tracking-widest text-[10px] flex items-center gap-2">
            <User :size="14" class="text-[#C04D1E]" />
            THÔNG TIN LIÊN HỆ
          </h3>
          <div class="space-y-4">
            <div class="relative">
              <User class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" :size="16" />
              <input
                :required="!authStore.isTablet"
                type="text"
                placeholder="Họ và tên"
                v-model="customerName"
                class="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#C04D1E] transition-all"
              />
            </div>
            <div class="relative">
              <Phone class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" :size="16" />
              <input
                :required="!authStore.isTablet"
                type="tel"
                placeholder="Số điện thoại"
                v-model="customerPhone"
                class="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#C04D1E] transition-all"
              />
            </div>
            <div v-if="cartStore.deliveryMethod === 'delivery'" class="relative">
              <MapPin class="absolute left-4 top-4 text-gray-400" :size="16" />
              <textarea
                :required="!authStore.isTablet"
                placeholder="Địa chỉ giao hàng"
                v-model="address"
                rows="2"
                class="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#C04D1E] transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Order Summary -->
        <div class="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 space-y-6">
          <h3 class="font-black text-gray-900 uppercase tracking-widest text-[10px] flex items-center gap-2">
            <ShoppingBag :size="14" class="text-[#C04D1E]" />
            ĐƠN HÀNG CỦA BẠN
          </h3>
          <div class="space-y-4">
            <div v-for="(item, i) in cartStore.cart" :key="i" class="flex gap-4">
              <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                <img :src="item.image" alt="" class="w-full h-full object-cover" />
              </div>
              <div class="flex-grow py-1">
                <h4 class="text-xs font-black text-gray-900 line-clamp-1 uppercase tracking-tight">{{ item.name }}</h4>
                <p class="text-[9px] text-gray-400 font-bold uppercase tracking-widest">x{{ item.quantity }} • {{ item.size }}</p>
                <p class="text-sm font-black text-[#C04D1E] tracking-tighter mt-1">{{ (item.price * item.quantity).toLocaleString() }}đ</p>
              </div>
            </div>
          </div>

          <!-- Voucher Input -->
          <div class="pt-6 border-t border-gray-50 space-y-4">
            <h4 class="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
              <Ticket :size="14" class="text-[#C04D1E]" />
              MÃ GIẢM GIÁ
            </h4>
            
            <div v-if="!appliedVoucher" class="space-y-2">
              <div class="flex gap-2">
                <input 
                  v-model="voucherInput"
                  type="text" 
                  placeholder="Nhập mã voucher"
                  class="flex-grow px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-[#C04D1E]"
                />
                <button 
                  @click="applyVoucher"
                  :disabled="isApplyingVoucher || !voucherInput"
                  class="px-6 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black disabled:bg-gray-300 transition-all"
                >
                  Áp dụng
                </button>
              </div>
              <p v-if="voucherError" class="text-[9px] text-red-500 font-bold uppercase tracking-widest">{{ voucherError }}</p>
            </div>

            <div v-else class="flex items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-2xl">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-orange-600 text-white rounded-lg flex items-center justify-center">
                  <Ticket :size="16" />
                </div>
                <div>
                  <p class="text-xs font-black text-gray-900 uppercase tracking-tight">{{ appliedVoucher.code }}</p>
                  <p class="text-[9px] text-orange-600 font-black uppercase tracking-widest">
                    {{ appliedVoucher.discountType === 'percentage' ? `Giảm ${appliedVoucher.discountValue}%` : `Giảm ${appliedVoucher.discountValue.toLocaleString()}đ` }}
                  </p>
                </div>
              </div>
              <button @click="removeVoucher" class="p-2 text-gray-400 hover:text-red-600 transition-colors">
                <X :size="16" />
              </button>
            </div>
          </div>

          <!-- Customer Note -->
          <div class="pt-6 border-t border-gray-50 space-y-4">
            <h4 class="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
              <AlertCircle :size="14" class="text-[#C04D1E]" />
              GHI CHÚ ĐƠN HÀNG
            </h4>
            <div class="relative">
              <textarea
                placeholder="Ghi chú cho cửa hàng (ví dụ: ít đường, không đá...)"
                v-model="note"
                rows="2"
                class="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#C04D1E] transition-all resize-none"
              ></textarea>
            </div>
          </div>

          <div class="pt-4 border-t border-gray-50 space-y-2">
            <div class="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Tạm tính</span>
              <span>{{ cartStore.totalPrice.toLocaleString() }}đ</span>
            </div>
            <div v-if="appliedVoucher" class="flex justify-between text-[10px] font-black text-orange-600 uppercase tracking-widest">
              <span>Giảm giá</span>
              <span>-{{ discountAmount.toLocaleString() }}đ</span>
            </div>
            <div class="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <span>Phí giao hàng</span>
              <span class="text-green-600">Miễn phí</span>
            </div>
            <div class="flex justify-between items-end pt-2">
              <span class="text-sm font-black text-gray-900 uppercase tracking-tight">Tổng cộng</span>
              <span class="text-xl font-black text-[#C04D1E] tracking-tighter">{{ finalTotal.toLocaleString() }}đ</span>
            </div>
          </div>
        </div>

        <!-- Payment Method -->
        <div class="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 space-y-4">
          <h3 class="font-black text-gray-900 uppercase tracking-widest text-[10px] flex items-center gap-2">
            <CreditCard :size="14" class="text-[#C04D1E]" />
            THANH TOÁN
          </h3>
          <div class="p-4 rounded-2xl border-2 border-[#C04D1E] bg-[#FFF1ED] flex items-center justify-between">
            <div class="flex items-center gap-3">
              <CreditCard :size="20" class="text-[#C04D1E]" />
              <span class="font-black text-xs text-gray-900 uppercase tracking-tight">Tiền mặt (COD)</span>
            </div>
            <CheckCircle :size="16" class="text-[#C04D1E]" />
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Action -->
    <div v-if="!orderSuccess && cartStore.cart.length > 0" class="absolute bottom-0 left-0 right-0 p-8 bg-white/90 backdrop-blur-xl border-t border-gray-100 z-50">
      <div v-if="error" class="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold flex items-start gap-2 border border-red-100">
        <AlertCircle :size="16" class="flex-shrink-0" />
        <p>{{ error }}</p>
      </div>
      <button
        @click="handleSubmit"
        :disabled="isSubmitting"
        class="w-full py-5 text-white rounded-3xl font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3"
        :class="isSubmitting ? 'bg-gray-400' : 'bg-[#C04D1E] shadow-[#C04D1E]/30'"
      >
        <template v-if="isSubmitting">
          <div class="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
        </template>
        <template v-else>
          Xác nhận đặt hàng
          <ChevronRight :size="20" />
        </template>
      </button>
    </div>
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

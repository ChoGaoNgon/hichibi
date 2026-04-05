<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { 
  Search, 
  Plus, 
  Minus, 
  X, 
  Check, 
  ShoppingBag, 
  ChevronDown, 
  MapPin,
  Flame,
  UtensilsCrossed,
  Utensils,
  IceCream,
  GlassWater,
  Star,
  MessageSquare,
  Receipt,
  User,
  Coffee,
  ChevronRight,
  Phone,
  Truck,
  Download
} from 'lucide-vue-next';
import { db, collection, query, orderBy, getDocs } from '../firebase';
import type { Product, Category, CartItem } from '../types';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { usePWA } from '../composables/usePWA';

const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const searchQuery = ref('');
const selectedProduct = ref<Product | null>(null);
const loading = ref(true);
const isDeliveryPopupOpen = ref(false);

const cartStore = useCartStore();
const authStore = useAuthStore();
const router = useRouter();
const { isInstallable, installApp } = usePWA();

// Scroll Spy Logic
const activeCategory = ref('');

const onScroll = (e: Event) => {
  const container = e.target as HTMLElement;
  const scrollPosition = container.scrollTop + 100;

  const sections = container.querySelectorAll('.category-section');
  sections.forEach((section: any) => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    if (scrollPosition >= top && scrollPosition < top + height) {
      activeCategory.value = section.id;
    }
  });
};

const scrollToCategory = (slug: string) => {
  activeCategory.value = slug;
  const element = document.getElementById(slug);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

onMounted(async () => {
  try {
    const [catSnapshot, prodSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'categories'), orderBy('order', 'asc'))),
      getDocs(collection(db, 'products'))
    ]);
    
    categories.value = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    products.value = prodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));

    // Set initial active category
    const hasTrending = products.value.some(p => p.isAvailable && p.isTrending);
    if (hasTrending) {
      activeCategory.value = 'trending';
    } else if (categories.value.length > 0) {
      activeCategory.value = categories.value[0].slug;
    }
  } catch (error) {
    console.error('Error fetching menu data:', error);
  } finally {
    loading.value = false;
  }
});

const groupedProducts = computed(() => {
  const groups: Record<string, Product[]> = {};
  
  // Filter by search first
  const filtered = products.value.filter(p => 
    p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );

  if (searchQuery.value) {
    return { 'search-results': filtered };
  }

  // Always include trending first
  const trendingProds = filtered.filter(p => p.isAvailable && p.isTrending);
  if (trendingProds.length > 0) {
    groups['trending'] = trendingProds;
  }

  categories.value.forEach(cat => {
    const catProds = filtered.filter(p => p.category === cat.slug);
    if (catProds.length > 0) {
      groups[cat.slug] = catProds;
    }
  });
  
  return groups;
});

const getCategoryIcon = (slug: string) => {
  switch (slug) {
    case 'trending': return Flame;
    case 'appetizers': return UtensilsCrossed;
    case 'main-course': return Utensils;
    case 'desserts': return IceCream;
    case 'drinks': return GlassWater;
    case 'specials': return Star;
    default: return Coffee;
  }
};

const getDeliveryLabel = (method: string) => {
  switch (method) {
    case 'delivery': return 'Giao hàng tận nơi';
    case 'pickup': return 'Đến lấy mang đi';
    case 'dine-in': return 'Uống tại quán';
    default: return '';
  }
};

const openProductModal = (product: Product) => {
  selectedProduct.value = product;
  resetModalState();
  document.body.style.overflow = 'hidden';
};

const closeProductModal = () => {
  selectedProduct.value = null;
  document.body.style.overflow = '';
};

// Modal State
const quantity = ref(1);
const selectedSize = ref('');
const selectedToppings = ref<string[]>([]);

const resetModalState = () => {
  quantity.value = 1;
  selectedSize.value = selectedProduct.value?.options.sizes[0]?.name || '';
  selectedToppings.value = [];
};

const handleAdd = (item: CartItem) => {
  cartStore.addToCart(item);
  closeProductModal();
};

const selectDeliveryMethod = (method: 'delivery' | 'pickup' | 'dine-in') => {
  cartStore.setDeliveryMethod(method);
  isDeliveryPopupOpen.value = false;
};
</script>

<template>
  <div class="min-h-screen bg-[#FFF8F6] flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden h-screen">
    <!-- Top Header -->
    <header class="px-6 pt-8 pb-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-[#C04D1E]/10 rounded-2xl flex items-center justify-center text-[#C04D1E]">
          <Coffee :size="20" />
        </div>
        <div @click="isDeliveryPopupOpen = true" class="cursor-pointer">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-xs font-black text-[#C04D1E] uppercase tracking-tighter">Hichibi</span>
            <span class="text-[8px] font-black text-gray-300 uppercase tracking-widest">•</span>
            <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">DELIVER TO</p>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-sm font-black text-gray-900 uppercase tracking-tight">
              {{ getDeliveryLabel(cartStore.deliveryMethod) }}
            </span>
            <ChevronDown :size="14" class="text-gray-400" />
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button v-if="isInstallable" @click="installApp" class="w-10 h-10 bg-orange-50 text-[#C04D1E] rounded-2xl flex items-center justify-center shadow-sm border border-orange-100 animate-bounce" title="Cài đặt ứng dụng">
          <Download :size="20" />
        </button>
        <router-link to="/cart" class="relative w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
          <ShoppingBag :size="24" class="text-gray-900" />
          <span v-if="cartStore.totalItems > 0" class="absolute -top-1 -right-1 w-5 h-5 bg-[#C04D1E] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
            {{ cartStore.totalItems }}
          </span>
        </router-link>
      </div>
    </header>

    <!-- Search Bar -->
    <div class="px-6 py-4 bg-white/80 backdrop-blur-md sticky top-[80px] z-40">
      <div class="relative">
        <Search class="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" :size="18" />
        <input
          type="text"
          placeholder="Tìm kiếm món uống..."
          v-model="searchQuery"
          class="w-full pl-14 pr-6 py-4 bg-[#F3F4F6] border-none rounded-3xl text-sm font-bold focus:ring-2 focus:ring-[#C04D1E] transition-all"
        />
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex flex-grow overflow-hidden">
      <!-- Left Sidebar (Categories) -->
      <aside class="w-24 bg-[#FFF1ED] flex flex-col items-center py-6 gap-8 overflow-y-auto border-r border-orange-100/50 no-scrollbar">
        <button
          v-if="groupedProducts['trending']"
          @click="scrollToCategory('trending')"
          class="flex flex-col items-center gap-2 group transition-all px-2"
          :class="activeCategory === 'trending' ? 'scale-110' : 'opacity-50'"
        >
          <div :class="[
            'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300',
            activeCategory === 'trending' ? 'bg-[#C04D1E] text-white shadow-lg shadow-[#C04D1E]/30' : 'bg-white text-gray-400'
          ]">
            <Flame :size="24" />
          </div>
          <span class="text-[9px] font-black uppercase tracking-widest text-center leading-tight" :class="activeCategory === 'trending' ? 'text-[#C04D1E]' : 'text-gray-400'">TRENDING</span>
        </button>

        <button
          v-for="cat in categories"
          :key="cat.id"
          @click="scrollToCategory(cat.slug)"
          class="flex flex-col items-center gap-2 group transition-all px-2"
          :class="activeCategory === cat.slug ? 'scale-110' : 'opacity-50'"
        >
          <div :class="[
            'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 overflow-hidden',
            activeCategory === cat.slug ? 'bg-[#C04D1E] text-white shadow-lg shadow-[#C04D1E]/30' : 'bg-white text-gray-400'
          ]">
            <img v-if="cat.image" :src="cat.image" alt="" class="w-full h-full object-cover" />
            <component v-else :is="getCategoryIcon(cat.slug)" :size="24" />
          </div>
          <span class="text-[9px] font-black uppercase tracking-widest text-center leading-tight" :class="activeCategory === cat.slug ? 'text-[#C04D1E]' : 'text-gray-400'">{{ cat.name }}</span>
        </button>
      </aside>

      <!-- Right Content (Products) -->
      <main @scroll="onScroll" class="flex-grow overflow-y-auto p-4 no-scrollbar pb-32">
        <div v-if="loading" class="flex justify-center py-12">
          <div class="w-8 h-8 border-3 border-[#C04D1E] border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        <div v-else class="space-y-10">
          <div 
            v-for="(prods, slug) in groupedProducts" 
            :key="slug" 
            :id="slug" 
            class="category-section space-y-4"
          >
            <div class="flex items-center gap-2 px-2">
              <component :is="getCategoryIcon(slug)" :size="18" class="text-[#C04D1E]" />
              <h2 class="text-lg font-black text-gray-900 uppercase tracking-tight">
                {{ slug === 'search-results' ? 'Kết quả' : (slug === 'trending' ? 'Trending' : categories.find(c => c.slug === slug)?.name) }}
              </h2>
            </div>

            <div class="space-y-3">
              <div
                v-for="product in prods"
                :key="product.id"
                class="bg-white p-3 rounded-[28px] flex gap-3 shadow-sm hover:shadow-md transition-all group relative"
              >
                <div 
                  class="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer"
                  @click="openProductModal(product)"
                >
                  <img
                    :src="product.image"
                    :alt="product.name"
                    class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div class="flex-grow flex flex-col justify-center py-0.5">
                  <h3 class="font-black text-xs text-gray-900 uppercase tracking-tight line-clamp-2 leading-tight mb-2">{{ product.name }}</h3>
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-black text-[#C04D1E] tracking-tighter">
                      {{ product.price.toLocaleString() }}đ
                    </span>
                    <button
                      @click="openProductModal(product)"
                      class="w-7 h-7 bg-[#C04D1E] text-white rounded-lg flex items-center justify-center hover:bg-[#A03D18] transition-all shadow-lg shadow-[#C04D1E]/20"
                    >
                      <Plus :size="14" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!loading && Object.keys(groupedProducts).length === 0" class="text-center py-12">
          <p class="text-gray-400 font-bold text-sm">No items found</p>
        </div>
      </main>
    </div>

    <!-- Floating Buttons -->
    <div class="fixed bottom-24 right-6 flex flex-col gap-4 z-50">
      <a href="tel:19001833" class="w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40">
        <Phone :size="24" />
      </a>
      <button class="w-14 h-14 bg-[#C04D1E] text-white rounded-full flex items-center justify-center shadow-2xl shadow-[#C04D1E]/40">
        <MessageSquare :size="24" />
      </button>
      <router-link to="/cart" class="w-14 h-14 bg-[#C04D1E] text-white rounded-full flex items-center justify-center shadow-2xl shadow-[#C04D1E]/40 relative">
        <ShoppingBag :size="24" />
        <span v-if="cartStore.totalItems > 0" class="absolute -top-1 -right-1 w-6 h-6 bg-white text-[#C04D1E] text-xs font-black rounded-full flex items-center justify-center border-2 border-[#C04D1E]">
          {{ cartStore.totalItems }}
        </span>
      </router-link>
    </div>

    <!-- Bottom Navigation -->
    <nav class="absolute bottom-0 left-0 right-0 h-20 bg-white/90 backdrop-blur-xl border-t border-gray-100 flex items-center justify-around px-6 z-50">
      <button class="flex flex-col items-center gap-1 text-[#C04D1E]">
        <div class="w-12 h-12 bg-[#C04D1E] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#C04D1E]/30">
          <Utensils :size="20" />
        </div>
        <span class="text-[10px] font-black uppercase tracking-widest">MENU</span>
      </button>
      <button @click="router.push('/orders')" class="flex flex-col items-center gap-1 text-gray-400">
        <Receipt :size="24" />
        <span class="text-[10px] font-black uppercase tracking-widest">ORDERS</span>
      </button>
      <button @click="authStore.user ? router.push('/profile') : authStore.login()" class="flex flex-col items-center gap-1 text-gray-400">
        <User :size="24" />
        <span class="text-[10px] font-black uppercase tracking-widest">ME</span>
      </button>
    </nav>

    <!-- Delivery Method Popup -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isDeliveryPopupOpen" class="fixed inset-0 z-[100] flex items-end justify-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="isDeliveryPopupOpen = false"></div>
        <transition
          enter-active-class="transition duration-500 ease-out"
          enter-from-class="translate-y-full"
          enter-to-class="translate-y-0"
          leave-active-class="transition duration-300 ease-in"
          leave-from-class="translate-y-0"
          leave-to-class="translate-y-full"
        >
          <div class="relative bg-white w-full max-w-md rounded-t-[48px] overflow-hidden shadow-2xl p-8 pt-4">
            <div class="h-1.5 w-12 bg-gray-200 rounded-full mx-auto mt-4 mb-8"></div>
            <h3 class="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-8 text-center">Chọn phương thức nhận hàng</h3>
            
            <div class="space-y-4">
              <button
                @click="selectDeliveryMethod('delivery')"
                class="w-full flex items-center gap-6 p-6 rounded-3xl border-2 transition-all"
                :class="cartStore.deliveryMethod === 'delivery' ? 'border-[#C04D1E] bg-[#FFF1ED]' : 'border-gray-50 bg-gray-50'"
              >
                <div :class="['w-14 h-14 rounded-2xl flex items-center justify-center transition-all', cartStore.deliveryMethod === 'delivery' ? 'bg-[#C04D1E] text-white shadow-lg shadow-[#C04D1E]/30' : 'bg-white text-gray-400']">
                  <Truck :size="28" />
                </div>
                <div class="text-left">
                  <p class="font-black text-lg text-gray-900 uppercase tracking-tight">Giao hàng tận nơi</p>
                  <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Giao nhanh trong 30 phút</p>
                </div>
                <Check v-if="cartStore.deliveryMethod === 'delivery'" class="ml-auto text-[#C04D1E]" :size="24" />
              </button>

              <button
                @click="selectDeliveryMethod('pickup')"
                class="w-full flex items-center gap-6 p-6 rounded-3xl border-2 transition-all"
                :class="cartStore.deliveryMethod === 'pickup' ? 'border-[#C04D1E] bg-[#FFF1ED]' : 'border-gray-50 bg-gray-50'"
              >
                <div :class="['w-14 h-14 rounded-2xl flex items-center justify-center transition-all', cartStore.deliveryMethod === 'pickup' ? 'bg-[#C04D1E] text-white shadow-lg shadow-[#C04D1E]/30' : 'bg-white text-gray-400']">
                  <ShoppingBag :size="28" />
                </div>
                <div class="text-left">
                  <p class="font-black text-lg text-gray-900 uppercase tracking-tight">Đến lấy mang đi</p>
                  <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Tiết kiệm thời gian chờ</p>
                </div>
                <Check v-if="cartStore.deliveryMethod === 'pickup'" class="ml-auto text-[#C04D1E]" :size="24" />
              </button>

              <button
                @click="selectDeliveryMethod('dine-in')"
                class="w-full flex items-center gap-6 p-6 rounded-3xl border-2 transition-all"
                :class="cartStore.deliveryMethod === 'dine-in' ? 'border-[#C04D1E] bg-[#FFF1ED]' : 'border-gray-50 bg-gray-50'"
              >
                <div :class="['w-14 h-14 rounded-2xl flex items-center justify-center transition-all', cartStore.deliveryMethod === 'dine-in' ? 'bg-[#C04D1E] text-white shadow-lg shadow-[#C04D1E]/30' : 'bg-white text-gray-400']">
                  <Utensils :size="28" />
                </div>
                <div class="text-left">
                  <p class="font-black text-lg text-gray-900 uppercase tracking-tight">Uống tại quán</p>
                  <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Thưởng thức tại chỗ</p>
                </div>
                <Check v-if="cartStore.deliveryMethod === 'dine-in'" class="ml-auto text-[#C04D1E]" :size="24" />
              </button>
            </div>
            <div class="h-8"></div>
          </div>
        </transition>
      </div>
    </transition>

    <!-- Product Modal (Mobile First Popup) -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="selectedProduct" class="fixed inset-0 z-[100] flex items-end justify-center">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeProductModal"></div>
        
        <transition
          enter-active-class="transition duration-500 ease-out"
          enter-from-class="translate-y-full"
          enter-to-class="translate-y-0"
          leave-active-class="transition duration-300 ease-in"
          leave-from-class="translate-y-0"
          leave-to-class="translate-y-full"
          @before-enter="resetModalState"
        >
          <div class="relative bg-white w-full max-w-md rounded-t-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div class="h-1.5 w-12 bg-gray-200 rounded-full mx-auto mt-4 mb-2"></div>
            
            <div class="overflow-y-auto no-scrollbar p-8 pt-4">
              <div class="relative h-64 rounded-[32px] overflow-hidden mb-8">
                <img
                  :src="selectedProduct.image"
                  :alt="selectedProduct.name"
                  class="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button @click="closeProductModal" class="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-md rounded-xl flex items-center justify-center text-gray-900 shadow-lg">
                  <X :size="20" />
                </button>
              </div>

              <div class="space-y-8">
                <div>
                  <h2 class="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-3">{{ selectedProduct.name }}</h2>
                  <p class="text-gray-400 font-medium text-sm leading-relaxed">{{ selectedProduct.description }}</p>
                </div>

                <!-- Size Selection -->
                <div v-if="selectedProduct.options.sizes.length > 0" class="space-y-4">
                  <h4 class="font-black text-gray-900 uppercase tracking-widest text-[10px]">CHỌN SIZE</h4>
                  <div class="grid grid-cols-3 gap-3">
                    <button
                      v-for="size in selectedProduct.options.sizes"
                      :key="size.name"
                      @click="selectedSize = size.name"
                      class="py-4 px-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all"
                      :class="selectedSize === size.name 
                        ? 'border-[#C04D1E] bg-[#FFF1ED] text-[#C04D1E]' 
                        : 'border-gray-50 text-gray-400 bg-gray-50'"
                    >
                      {{ size.name }}
                      <div class="opacity-70 mt-0.5">+{{ size.price.toLocaleString() }}đ</div>
                    </button>
                  </div>
                </div>

                <!-- Toppings -->
                <div v-if="selectedProduct.options.toppings.length > 0" class="space-y-4 pb-8">
                  <h4 class="font-black text-gray-900 uppercase tracking-widest text-[10px]">TOPPING</h4>
                  <div class="space-y-2">
                    <button
                      v-for="topping in selectedProduct.options.toppings"
                      :key="topping.name"
                      @click="() => {
                        if (selectedToppings.includes(topping.name)) {
                          selectedToppings = selectedToppings.filter(t => t !== topping.name);
                        } else {
                          selectedToppings.push(topping.name);
                        }
                      }"
                      class="w-full flex justify-between items-center p-4 rounded-2xl border-2 transition-all"
                      :class="selectedToppings.includes(topping.name)
                        ? 'border-[#C04D1E] bg-[#FFF1ED]'
                        : 'border-gray-50 bg-gray-50'"
                    >
                      <div class="flex items-center gap-3">
                        <div :class="[
                          'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all',
                          selectedToppings.includes(topping.name) ? 'bg-[#C04D1E] border-[#C04D1E] text-white' : 'border-gray-300'
                        ]">
                          <Check v-if="selectedToppings.includes(topping.name)" :size="14" />
                        </div>
                        <span class="font-black text-xs text-gray-700 uppercase tracking-tight">{{ topping.name }}</span>
                      </div>
                      <span class="text-[#C04D1E] font-black text-xs">+{{ topping.price.toLocaleString() }}đ</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer Action -->
            <div class="p-8 bg-white border-t border-gray-100 flex flex-col gap-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4 bg-gray-100 p-1.5 rounded-2xl">
                  <button
                    @click="quantity = Math.max(1, quantity - 1)"
                    class="w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:bg-white transition-all"
                  >
                    <Minus :size="20" />
                  </button>
                  <span class="w-6 text-center font-black text-lg tracking-tighter">{{ quantity }}</span>
                  <button
                    @click="quantity++"
                    class="w-10 h-10 rounded-xl flex items-center justify-center text-gray-600 hover:bg-white transition-all"
                  >
                    <Plus :size="20" />
                  </button>
                </div>
                <div class="text-right">
                  <p class="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">TỔNG CỘNG</p>
                  <p class="text-2xl font-black text-[#C04D1E] tracking-tighter">
                    {{ ((selectedProduct.price + (selectedProduct.options.sizes.find(s => s.name === selectedSize)?.price || 0) + selectedToppings.reduce((acc, t) => acc + (selectedProduct?.options.toppings.find(top => top.name === t)?.price || 0), 0)) * quantity).toLocaleString() }}đ
                  </p>
                </div>
              </div>
              <button
                @click="handleAdd({
                  productId: selectedProduct.id,
                  name: selectedProduct.name,
                  quantity,
                  price: (selectedProduct.price + (selectedProduct.options.sizes.find(s => s.name === selectedSize)?.price || 0) + selectedToppings.reduce((acc, t) => acc + (selectedProduct?.options.toppings.find(top => top.name === t)?.price || 0), 0)),
                  size: selectedSize,
                  toppings: [...selectedToppings],
                  image: selectedProduct.image
                })"
                class="w-full py-5 bg-[#C04D1E] text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-[#A03D18] transition-all shadow-xl shadow-[#C04D1E]/30 flex items-center justify-center gap-3"
              >
                <ShoppingBag :size="20" />
                Thêm vào giỏ hàng
              </button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
  width: 0 !important;
  height: 0 !important;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

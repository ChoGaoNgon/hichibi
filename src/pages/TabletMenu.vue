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
  Coffee,
  Flame,
  UtensilsCrossed,
  Utensils,
  IceCream,
  GlassWater,
  Star,
  Receipt,
  User,
  LogOut
} from 'lucide-vue-next';
import { db, collection, query, orderBy, getDocs, doc, getDoc } from '../firebase';
import type { Product, Category, CartItem } from '../types';
import { useCartStore } from '../stores/cart';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';

const products = ref<Product[]>([]);
const categories = ref<Category[]>([]);
const searchQuery = ref('');
const selectedProduct = ref<Product | null>(null);
const loading = ref(true);
const activeCategory = ref('all');

const cartStore = useCartStore();
const authStore = useAuthStore();
const router = useRouter();

onMounted(async () => {
  try {
    const [catSnapshot, prodSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'categories'), orderBy('order', 'asc'))),
      getDocs(collection(db, 'products'))
    ]);
    
    categories.value = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    products.value = prodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  } catch (error) {
    console.error('Error fetching menu data:', error);
  } finally {
    loading.value = false;
  }
});

const filteredProducts = computed(() => {
  let filtered = products.value;

  // Search filter
  if (searchQuery.value) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  // Category filter
  if (activeCategory.value === 'all') {
    return filtered;
  } else if (activeCategory.value === 'trending') {
    return filtered.filter(p => p.isAvailable && p.isTrending);
  } else {
    return filtered.filter(p => p.category === activeCategory.value);
  }
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

const openProductModal = (product: Product) => {
  selectedProduct.value = product;
  resetModalState();
};

const closeProductModal = () => {
  selectedProduct.value = null;
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

const logout = async () => {
  await authStore.logout();
  router.push('/');
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
    <!-- Top Header -->
    <header class="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
          <Coffee :size="24" />
        </div>
        <div>
          <h1 class="text-xl font-black text-gray-900 uppercase tracking-tighter">Hichibi Tablet</h1>
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Staff Mode • {{ authStore.user?.email }}</p>
        </div>
      </div>

      <div class="flex items-center gap-6">
        <!-- Search -->
        <div class="relative w-80">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" :size="18" />
          <input
            type="text"
            placeholder="Tìm kiếm món uống..."
            v-model="searchQuery"
            class="w-full pl-12 pr-4 py-3 bg-gray-100 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
          />
        </div>

        <!-- Cart Summary -->
        <router-link to="/cart" class="flex items-center gap-3 bg-orange-50 px-4 py-2 rounded-2xl border border-orange-100">
          <div class="relative">
            <ShoppingBag :size="24" class="text-orange-600" />
            <span v-if="cartStore.totalItems > 0" class="absolute -top-2 -right-2 w-5 h-5 bg-orange-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
              {{ cartStore.totalItems }}
            </span>
          </div>
          <div class="text-right">
            <p class="text-[8px] font-black text-orange-400 uppercase tracking-widest leading-none">GIỎ HÀNG</p>
            <p class="text-sm font-black text-orange-600 tracking-tighter">{{ cartStore.totalPrice.toLocaleString() }}đ</p>
          </div>
        </router-link>

        <button @click="logout" class="w-12 h-12 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
          <LogOut :size="20" />
        </button>
      </div>
    </header>

    <!-- Category Menu (Horizontal Top) -->
    <nav class="bg-white border-b border-gray-100 px-8 py-4 flex items-center gap-4 overflow-x-auto no-scrollbar shrink-0">
      <button
        @click="activeCategory = 'all'"
        class="flex items-center gap-3 px-6 py-3 rounded-2xl transition-all whitespace-nowrap border-2"
        :class="activeCategory === 'all' ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-gray-50 border-gray-50 text-gray-500 hover:bg-gray-100'"
      >
        <Utensils :size="18" />
        <span class="text-xs font-black uppercase tracking-widest">Tất cả</span>
      </button>

      <button
        @click="activeCategory = 'trending'"
        class="flex items-center gap-3 px-6 py-3 rounded-2xl transition-all whitespace-nowrap border-2"
        :class="activeCategory === 'trending' ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-gray-50 border-gray-50 text-gray-500 hover:bg-gray-100'"
      >
        <Flame :size="18" />
        <span class="text-xs font-black uppercase tracking-widest">Trending</span>
      </button>

      <div class="w-px h-8 bg-gray-200 mx-2"></div>

      <button
        v-for="cat in categories"
        :key="cat.id"
        @click="activeCategory = cat.slug"
        class="flex items-center gap-3 px-6 py-3 rounded-2xl transition-all whitespace-nowrap border-2"
        :class="activeCategory === cat.slug ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-gray-50 border-gray-50 text-gray-500 hover:bg-gray-100'"
      >
        <img v-if="cat.image" :src="cat.image" alt="" class="w-6 h-6 object-cover rounded-lg" />
        <component v-else :is="getCategoryIcon(cat.slug)" :size="18" />
        <span class="text-xs font-black uppercase tracking-widest">{{ cat.name }}</span>
      </button>
    </nav>

    <!-- Product Grid -->
    <main class="flex-grow overflow-y-auto p-8 no-scrollbar">
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="filteredProducts.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="bg-white rounded-[32px] p-4 shadow-sm hover:shadow-xl transition-all group flex flex-col"
          @click="openProductModal(product)"
        >
          <div class="relative aspect-square rounded-[24px] overflow-hidden mb-4">
            <img
              :src="product.image"
              :alt="product.name"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div v-if="product.isTrending" class="absolute top-3 right-3 bg-orange-600 text-white p-2 rounded-xl shadow-lg">
              <Flame :size="16" />
            </div>
          </div>
          
          <div class="flex-grow">
            <h3 class="font-black text-sm text-gray-900 uppercase tracking-tight line-clamp-2 leading-tight mb-2">
              {{ product.name }}
            </h3>
            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">
              {{ categories.find(c => c.slug === product.category)?.name }}
            </p>
          </div>

          <div class="flex items-center justify-between mt-auto">
            <span class="text-lg font-black text-orange-600 tracking-tighter">
              {{ product.price.toLocaleString() }}đ
            </span>
            <div class="w-10 h-10 bg-orange-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20 group-hover:scale-110 transition-all">
              <Plus :size="20" />
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col items-center justify-center py-20 text-gray-400">
        <Search :size="48" class="mb-4 opacity-20" />
        <p class="font-black uppercase tracking-widest text-sm">Không tìm thấy sản phẩm nào</p>
      </div>
    </main>

    <!-- Bottom Navigation (Optional for Tablet) -->
    <nav class="bg-white border-t border-gray-200 px-8 py-4 flex justify-center gap-12 shrink-0">
      <button class="flex flex-col items-center gap-1 text-orange-600">
        <Utensils :size="24" />
        <span class="text-[10px] font-black uppercase tracking-widest">Thực đơn</span>
      </button>
      <button @click="router.push('/orders')" class="flex flex-col items-center gap-1 text-gray-400 hover:text-orange-600 transition-colors">
        <Receipt :size="24" />
        <span class="text-[10px] font-black uppercase tracking-widest">Đơn hàng</span>
      </button>
      <button @click="router.push('/profile')" class="flex flex-col items-center gap-1 text-gray-400 hover:text-orange-600 transition-colors">
        <User :size="24" />
        <span class="text-[10px] font-black uppercase tracking-widest">Cá nhân</span>
      </button>
    </nav>

    <!-- Product Modal -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="selectedProduct" class="fixed inset-0 z-[100] flex items-center justify-center p-8">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeProductModal"></div>
        
        <div class="relative bg-white w-full max-w-4xl rounded-[48px] overflow-hidden shadow-2xl flex h-[80vh]">
          <!-- Left: Image -->
          <div class="w-1/2 relative bg-gray-100">
            <img
              :src="selectedProduct.image"
              :alt="selectedProduct.name"
              class="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <button @click="closeProductModal" class="absolute top-6 left-6 w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-gray-900 shadow-lg">
              <X :size="24" />
            </button>
          </div>

          <!-- Right: Options -->
          <div class="w-1/2 flex flex-col">
            <div class="flex-grow overflow-y-auto p-10 no-scrollbar">
              <div class="mb-8">
                <h2 class="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-4">{{ selectedProduct.name }}</h2>
                <p class="text-gray-400 font-medium text-base leading-relaxed">{{ selectedProduct.description }}</p>
              </div>

              <!-- Size Selection -->
              <div v-if="selectedProduct.options.sizes.length > 0" class="space-y-4 mb-8">
                <h4 class="font-black text-gray-900 uppercase tracking-widest text-xs">CHỌN SIZE</h4>
                <div class="grid grid-cols-3 gap-4">
                  <button
                    v-for="size in selectedProduct.options.sizes"
                    :key="size.name"
                    @click="selectedSize = size.name"
                    class="py-5 px-4 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all"
                    :class="selectedSize === size.name 
                      ? 'border-orange-600 bg-orange-50 text-orange-600' 
                      : 'border-gray-50 text-gray-400 bg-gray-50'"
                  >
                    {{ size.name }}
                    <div class="opacity-70 mt-1">+{{ size.price.toLocaleString() }}đ</div>
                  </button>
                </div>
              </div>

              <!-- Toppings -->
              <div v-if="selectedProduct.options.toppings.length > 0" class="space-y-4">
                <h4 class="font-black text-gray-900 uppercase tracking-widest text-xs">TOPPING</h4>
                <div class="grid grid-cols-2 gap-3">
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
                    class="flex justify-between items-center p-4 rounded-2xl border-2 transition-all"
                    :class="selectedToppings.includes(topping.name)
                      ? 'border-orange-600 bg-orange-50'
                      : 'border-gray-50 bg-gray-50'"
                  >
                    <div class="flex items-center gap-3">
                      <div :class="[
                        'w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all',
                        selectedToppings.includes(topping.name) ? 'bg-orange-600 border-orange-600 text-white' : 'border-gray-300'
                      ]">
                        <Check v-if="selectedToppings.includes(topping.name)" :size="14" />
                      </div>
                      <span class="font-black text-[10px] text-gray-700 uppercase tracking-tight">{{ topping.name }}</span>
                    </div>
                    <span class="text-orange-600 font-black text-[10px]">+{{ topping.price.toLocaleString() }}đ</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="p-10 bg-white border-t border-gray-100 space-y-6">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-6 bg-gray-100 p-2 rounded-2xl">
                  <button
                    @click="quantity = Math.max(1, quantity - 1)"
                    class="w-12 h-12 rounded-xl flex items-center justify-center text-gray-600 hover:bg-white transition-all"
                  >
                    <Minus :size="24" />
                  </button>
                  <span class="w-8 text-center font-black text-2xl tracking-tighter">{{ quantity }}</span>
                  <button
                    @click="quantity++"
                    class="w-12 h-12 rounded-xl flex items-center justify-center text-gray-600 hover:bg-white transition-all"
                  >
                    <Plus :size="24" />
                  </button>
                </div>
                <div class="text-right">
                  <p class="text-xs text-gray-400 font-black uppercase tracking-widest mb-1">TỔNG CỘNG</p>
                  <p class="text-4xl font-black text-orange-600 tracking-tighter">
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
                class="w-full py-6 bg-orange-600 text-white rounded-[24px] font-black text-base uppercase tracking-widest hover:bg-orange-700 transition-all shadow-2xl shadow-orange-600/30 flex items-center justify-center gap-4"
              >
                <ShoppingBag :size="24" />
                Thêm vào giỏ hàng
              </button>
            </div>
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

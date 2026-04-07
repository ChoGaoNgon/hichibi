<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useCartStore } from '../stores/cart';
import { useRoute } from 'vue-router';
import { 
  ShoppingBag, 
  User, 
  LogIn, 
  LogOut, 
  Menu as MenuIcon, 
  X, 
  Coffee, 
  LayoutDashboard, 
  ShoppingCart,
  Utensils
} from 'lucide-vue-next';

const authStore = useAuthStore();
const cartStore = useCartStore();
const isMenuOpen = ref(false);
const route = useRoute();

const navLinks = computed(() => {
  const links = [
    { name: 'Thực đơn', path: '/', icon: Coffee },
    { name: 'Giỏ hàng', path: '/cart', icon: ShoppingCart },
  ];
  
  // Hide menu for tablet role
  if (authStore.isTablet) {
    return links.filter(l => l.path !== '/');
  }
  
  return links;
});

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const closeMenu = () => {
  isMenuOpen.value = false;
};
</script>

<template>
  <nav class="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16 items-center">
        <div class="flex items-center">
          <router-link to="/" class="flex items-center gap-2 group">
            <div class="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white group-hover:scale-110 transition-transform">
              <Coffee :size="24" />
            </div>
            <span class="text-xl font-bold text-gray-900 hidden sm:block uppercase tracking-tight">THE COFFEE HOUSE</span>
          </router-link>
        </div>

        <!-- Desktop Nav -->
        <div class="hidden md:flex items-center space-x-8">
          <router-link
            v-for="link in navLinks"
            :key="link.path"
            :to="link.path"
            class="text-sm font-bold transition-colors hover:text-orange-600 uppercase tracking-wider"
            :class="route.path === link.path ? 'text-orange-600' : 'text-gray-600'"
          >
            {{ link.name }}
          </router-link>
          
          <router-link
            v-if="authStore.isAdmin || authStore.isTablet"
            to="/tablet"
            class="text-sm font-bold transition-colors hover:text-orange-600 uppercase tracking-wider"
            :class="route.path === '/tablet' ? 'text-orange-600' : 'text-gray-600'"
          >
            Thực đơn Tablet
          </router-link>
          
          <router-link
            v-if="authStore.isStaff"
            to="/admin"
            class="text-sm font-bold transition-colors hover:text-orange-600 uppercase tracking-wider"
            :class="route.path.startsWith('/admin') ? 'text-orange-600' : 'text-gray-600'"
          >
            Quản trị
          </router-link>
          
          <div v-if="authStore.user" class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm font-medium text-gray-700">
              <div class="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                <img v-if="authStore.user.photoURL" :src="authStore.user.photoURL" :alt="authStore.user.displayName || ''" class="w-full h-full object-cover" />
                <User v-else :size="20" class="m-1.5 text-gray-500" />
              </div>
              <span class="hidden lg:block font-bold">{{ authStore.user.displayName }}</span>
            </div>
            <button @click="authStore.logout" class="text-gray-500 hover:text-red-600 transition-colors">
              <LogOut :size="20" />
            </button>
          </div>
          <button
            v-else
            @click="authStore.login"
            class="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-full text-sm font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20"
          >
            <LogIn :size="18" />
            Đăng nhập
          </button>
          
          <router-link to="/cart" class="relative p-2 text-gray-600 hover:text-orange-600 transition-colors">
            <ShoppingBag :size="24" />
            <span v-if="cartStore.totalItems > 0" class="absolute top-0 right-0 w-5 h-5 bg-orange-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {{ cartStore.totalItems }}
            </span>
          </router-link>
        </div>

        <!-- Mobile Nav Toggle -->
        <div class="md:hidden flex items-center gap-4">
          <router-link to="/cart" class="relative p-2 text-gray-600">
            <ShoppingBag :size="24" />
            <span v-if="cartStore.totalItems > 0" class="absolute top-0 right-0 w-5 h-5 bg-orange-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {{ cartStore.totalItems }}
            </span>
          </router-link>
          <button @click="toggleMenu" class="p-2 text-gray-600">
            <X v-if="isMenuOpen" :size="28" />
            <MenuIcon v-else :size="28" />
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Menu -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div v-if="isMenuOpen" class="md:hidden bg-white border-t border-gray-100 overflow-hidden shadow-xl">
        <div class="px-4 py-8 space-y-6">
          <router-link
            v-for="link in navLinks"
            :key="link.path"
            :to="link.path"
            @click="closeMenu"
            class="flex items-center gap-4 text-xl font-black text-gray-900 p-4 rounded-2xl hover:bg-orange-50 transition-colors uppercase tracking-tight"
          >
            <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <component :is="link.icon" :size="24" />
            </div>
            {{ link.name }}
          </router-link>
          
          <router-link
            v-if="authStore.isAdmin || authStore.isTablet"
            to="/tablet"
            @click="closeMenu"
            class="flex items-center gap-4 text-xl font-black text-gray-900 p-4 rounded-2xl hover:bg-orange-50 transition-colors uppercase tracking-tight"
          >
            <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <Utensils :size="24" />
            </div>
            Thực đơn Tablet
          </router-link>

          <router-link
            v-if="authStore.isStaff"
            to="/admin"
            @click="closeMenu"
            class="flex items-center gap-4 text-xl font-black text-gray-900 p-4 rounded-2xl hover:bg-orange-50 transition-colors uppercase tracking-tight"
          >
            <div class="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <LayoutDashboard :size="24" />
            </div>
            Quản trị
          </router-link>

          <div class="pt-8 border-t border-gray-100">
            <div v-if="authStore.user" class="space-y-6">
              <div class="flex items-center gap-4 p-4 bg-gray-50 rounded-3xl">
                <img v-if="authStore.user.photoURL" :src="authStore.user.photoURL" alt="" class="w-14 h-14 rounded-full border-2 border-white shadow-sm" />
                <div class="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center" v-else>
                  <User :size="28" class="text-gray-400" />
                </div>
                <div>
                  <p class="font-black text-gray-900 text-lg">{{ authStore.user.displayName }}</p>
                  <p class="text-sm text-gray-500">{{ authStore.user.email }}</p>
                </div>
              </div>
              <button
                @click="() => { authStore.logout(); closeMenu(); }"
                class="w-full flex items-center justify-center gap-3 py-5 bg-gray-100 text-red-600 rounded-3xl font-black text-lg uppercase tracking-widest"
              >
                <LogOut :size="24" />
                Đăng xuất
              </button>
            </div>
            <button
              v-else
              @click="() => { authStore.login(); closeMenu(); }"
              class="w-full flex items-center justify-center gap-3 py-5 bg-orange-600 text-white rounded-3xl font-black text-lg uppercase tracking-widest shadow-xl shadow-orange-600/30"
            >
              <LogIn :size="24" />
              Đăng nhập
            </button>
          </div>
        </div>
      </div>
    </transition>
  </nav>
</template>

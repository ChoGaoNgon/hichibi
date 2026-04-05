<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from './stores/auth';
import { Toaster } from 'vue-sonner';
import Navbar from './components/Navbar.vue';
import Footer from './components/Footer.vue';

const authStore = useAuthStore();
const route = useRoute();

onMounted(() => {
  authStore.init();
});
</script>

<template>
  <Toaster position="top-center" richColors :expand="false" :offset="32" />
  <div v-if="authStore.loading" class="h-screen flex items-center justify-center bg-orange-50">
    <div class="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
  <div v-else class="min-h-screen bg-white flex flex-col font-sans">
    <Navbar v-if="route.path !== '/' && route.path !== '/checkout' && route.path !== '/cart'" />
    <main class="flex-grow">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <Footer v-if="route.path !== '/' && route.path !== '/checkout' && route.path !== '/cart'" />
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

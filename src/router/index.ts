import { createRouter, createWebHistory } from 'vue-router';
import Menu from '../pages/Menu.vue';
import TabletMenu from '../pages/TabletMenu.vue';
import Cart from '../pages/Cart.vue';
import Checkout from '../pages/Checkout.vue';
import Admin from '../pages/Admin.vue';
import Profile from '../pages/Profile.vue';
import Orders from '../pages/Orders.vue';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Menu },
    { path: '/menu', redirect: '/' },
    { path: '/tablet', component: TabletMenu, meta: { requiresTablet: true } },
    { path: '/cart', component: Cart },
    { path: '/checkout', component: Checkout },
    { path: '/profile', component: Profile },
    { path: '/orders', component: Orders },
    { 
      path: '/admin', 
      component: Admin,
      meta: { requiresAdmin: true }
    },
    { 
      path: '/admin/:path*', 
      component: Admin,
      meta: { requiresAdmin: true }
    }
  ],
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  // Wait for auth to initialize
  await authStore.isReady;
  
  if (to.meta.requiresAdmin && !authStore.isStaff) {
    next('/');
  } else if (to.meta.requiresTablet && !authStore.isTablet && !authStore.isAdmin) {
    next('/');
  } else {
    next();
  }
});

export default router;

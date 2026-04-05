import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CartItem } from '../types';

export const useCartStore = defineStore('cart', () => {
  const cart = ref<CartItem[]>([]);
  const deliveryMethod = ref<'delivery' | 'pickup' | 'dine-in'>('delivery');

  const totalItems = computed(() => cart.value.reduce((acc, item) => acc + item.quantity, 0));
  const totalPrice = computed(() => cart.value.reduce((acc, item) => acc + (item.price * item.quantity), 0));

  const setDeliveryMethod = (method: 'delivery' | 'pickup' | 'dine-in') => {
    deliveryMethod.value = method;
  };

  const addToCart = (item: CartItem) => {
    cart.value.push(item);
  };

  const removeFromCart = (index: number) => {
    cart.value.splice(index, 1);
  };

  const updateQuantity = (index: number, delta: number) => {
    const item = cart.value[index];
    if (item) {
      item.quantity = Math.max(1, item.quantity + delta);
    }
  };

  const clearCart = () => {
    cart.value = [];
  };

  return { cart, deliveryMethod, totalItems, totalPrice, setDeliveryMethod, addToCart, removeFromCart, updateQuantity, clearCart };
});

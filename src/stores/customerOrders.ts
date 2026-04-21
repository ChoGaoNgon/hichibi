import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Order } from '../types';

export const useCustomerOrderStore = defineStore('customerOrders', () => {
  const cachedOrders = ref<Order[]>([]);
  const lastFetchTime = ref<number>(0);
  const orderLimit = ref<number>(3);
  const hasMoreOrders = ref<boolean>(true);

  const setOrders = (orders: Order[], limitValue: number, hasMore: boolean) => {
    cachedOrders.value = orders;
    lastFetchTime.value = Date.now();
    orderLimit.value = limitValue;
    hasMoreOrders.value = hasMore;
  };

  const updateOrderStatus = (orderId: string, status: any, location?: any) => {
    const order = cachedOrders.value.find(o => o.id === orderId);
    if (order) {
      if (status) order.status = status;
      if (location) order.location = location;
    }
  };

  const clearCache = () => {
    cachedOrders.value = [];
    lastFetchTime.value = 0;
    orderLimit.value = 3;
    hasMoreOrders.value = true;
  };

  return {
    cachedOrders,
    lastFetchTime,
    orderLimit,
    hasMoreOrders,
    setOrders,
    updateOrderStatus,
    clearCache
  };
});

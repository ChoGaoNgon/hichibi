import { Timestamp } from './firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  address?: string;
  location?: {
    lat: number;
    lng: number;
  };
  role: 'admin' | 'staff' | 'customer' | 'tablet';
  createdAt: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  image?: string;
}

export interface ProductOption {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  options: {
    sizes: ProductOption[];
    toppings: ProductOption[];
  };
  isAvailable: boolean;
  isTrending?: boolean;
  shopNotes?: string;
}

export interface CartItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  size?: string;
  toppings: string[];
  image: string;
}

export type OrderStatus = 'pending' | 'processing' | 'delivering' | 'completed' | 'cancelled';
export type DeliveryMethod = 'delivery' | 'pickup' | 'dine-in';

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  totalAmount: number;
  status: OrderStatus;
  deliveryMethod: DeliveryMethod;
  address: string;
  location?: {
    lat: number;
    lng: number;
  };
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  voucherCode?: string;
  discountAmount?: number;
}

export interface Voucher {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxUsage: number;
  usedCount: number;
  startDate: Timestamp;
  endDate: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
}

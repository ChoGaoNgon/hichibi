<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Coffee, 
  Users, 
  TrendingUp, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle, 
  Clock, 
  Truck, 
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  Database, 
  Trash2, 
  Edit,
  ArrowUpDown,
  Ticket,
  Calendar,
  BarChart3,
  Store,
  Printer,
  RefreshCw,
  HardDrive,
  CreditCard,
  Lock,
  Unlock,
  Tag,
  Copy
} from 'lucide-vue-next';
import { 
  db, 
  collection, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  setDoc,
  getDoc,
  Timestamp, 
  getDocs, 
  writeBatch,
  where,
  limit,
  startAfter,
  OperationType,
  handleFirestoreError,
  serverTimestamp
} from '../firebase';
import type { Order, Product, Category, OrderStatus, DeliveryMethod, QuickNote } from '../types';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { syncOrderToGoogleSheets } from '../services/googleSheetsService';
import AdminCalendar from '../components/AdminCalendar.vue';

const authStore = useAuthStore();
const router = useRouter();
const activeTab = ref('dashboard');

// Pagination & Search States
const ITEM_PAGE_SIZE = 6;

const products = ref<Product[]>([]);
const lastProductDoc = ref<any>(null);
const hasMoreProducts = ref(true);

const categorySearchInput = ref('');
const allCategories = ref<Category[]>([]);
const categories = ref<Category[]>([]);

const productSearchInput = ref('');
const productCategoryFilter = ref('');
const isSearchingProducts = ref(false);
const allFilteredProducts = ref<Product[]>([]);

const lastCategoryDoc = ref<any>(null);
const hasMoreCategories = ref(true);

const vouchers = ref<any[]>([]);
const lastVoucherDoc = ref<any>(null);
const hasMoreVouchers = ref(true);

const users = ref<any[]>([]);
const userPage = ref(1);
const USER_PAGE_SIZE = 5;
const userCursors = ref<any[]>([]);
const hasMoreUsers = ref(false);

const userSearchInput = ref('');
const activeUserSearch = ref('');
const allFilteredUsers = ref<any[]>([]);
const isSearchingUsers = ref(false);

const loading = ref(true);
const isDeleting = ref(false);
const isSavingProduct = ref(false);
const isSavingVoucher = ref(false);
const isSavingCategory = ref(false);
const isUpdatingUser = ref(false);
const isSeeding = ref(false);
const isUpdatingStatus = ref(false);
const isUpdatingDelivery = ref(false);
const isRefreshing = ref(false);
const isClearingCache = ref(false);
const isSavingNote = ref(false);

const quickNotes = ref<QuickNote[]>([]);
const editingNote = ref<QuickNote | null>(null);
const quickNoteForm = ref({ text: '' });
const isQuickNoteModalOpen = ref(false);

const cacheConfig = ref({
  autoUpdate: true,
  lastUpdated: null as any
});

const fetchCacheConfig = async () => {
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'cache_info'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      cacheConfig.value.autoUpdate = data.autoUpdate !== false; // default true
      cacheConfig.value.lastUpdated = data.lastUpdated;
    }
  } catch (error) {
    console.error('Error fetching cache config:', error);
  }
};

const updateCacheMode = async (mode: boolean) => {
  cacheConfig.value.autoUpdate = mode;
  try {
    await setDoc(doc(db, 'settings', 'cache_info'), { autoUpdate: mode }, { merge: true });
    toast.success('Đã cập nhật cấu hình cache');
  } catch (error) {
    console.error('Error updating cache mode:', error);
    toast.error('Có lỗi xảy ra khi cập nhật cấu hình cache');
  }
};

const clearCustomerCache = async () => {
  if (isClearingCache.value) return;
  isClearingCache.value = true;
  try {
    const ts = serverTimestamp();
    await setDoc(doc(db, 'settings', 'cache_info'), {
      lastUpdated: ts,
      autoUpdate: cacheConfig.value.autoUpdate
    }, { merge: true });
    cacheConfig.value.lastUpdated = new Date(); // Optimistic UI update
    toast.success('Đã yêu cầu khách hàng tải lại dữ liệu mới');
  } catch (error) {
    console.error('Error clearing cache:', error);
    toast.error('Có lỗi xảy ra khi xóa cache');
  } finally {
    isClearingCache.value = false;
  }
};

const triggerAutoCacheUpdate = () => {
  if (cacheConfig.value.autoUpdate) {
    clearCustomerCache();
  }
};

const fetchQuickNotes = async () => {
  try {
    const q = query(collection(db, 'quick_notes'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    quickNotes.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QuickNote));
  } catch (error) {
    console.error('Error fetching quick notes:', error);
  }
};

const openQuickNoteModal = (note?: QuickNote) => {
  if (note) {
    editingNote.value = note;
    quickNoteForm.value = { text: note.text };
  } else {
    editingNote.value = null;
    quickNoteForm.value = { text: '' };
  }
  isQuickNoteModalOpen.value = true;
};

const saveQuickNote = async () => {
  if (!quickNoteForm.value.text.trim()) return;
  isSavingNote.value = true;
  try {
    if (editingNote.value) {
      await updateDoc(doc(db, 'quick_notes', editingNote.value.id), {
        text: quickNoteForm.value.text.trim()
      });
      toast.success('Đã cập nhật ghi chú nhanh');
    } else {
      await addDoc(collection(db, 'quick_notes'), {
        text: quickNoteForm.value.text.trim(),
        createdAt: serverTimestamp()
      });
      toast.success('Đã thêm ghi chú nhanh');
    }
    isQuickNoteModalOpen.value = false;
    await fetchQuickNotes();
  } catch (error) {
    console.error('Error saving quick note:', error);
    toast.error('Có lỗi xảy ra khi lưu ghi chú');
  } finally {
    isSavingNote.value = false;
  }
};

const deleteQuickNote = (id: string) => {
  confirmDelete(id, 'note');
};

const refreshData = async () => {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    switch (activeTab.value) {
      case 'dashboard':
        await Promise.all([fetchOrders(true), fetchProducts(), fetchCategories()]);
        break;
      case 'orders':
        orders.value = [];
        lastOrderDoc.value = null;
        hasMoreOrders.value = true;
        await fetchOrders(true);
        break;
      case 'products':
        await fetchProducts();
        break;
      case 'categories':
        await fetchCategories();
        break;
      case 'vouchers':
        await fetchVouchers();
        break;
      case 'users':
        await fetchUsers();
        break;
      case 'settings':
        await fetchStoreInfo();
        break;
      case 'cache':
        await fetchCacheConfig();
        break;
      case 'notes':
        await fetchQuickNotes();
        break;
    }
    toast.success('Đã làm mới dữ liệu');
  } catch (error) {
    console.error('Error refreshing data:', error);
    toast.error('Có lỗi xảy ra khi làm mới dữ liệu');
  } finally {
    isRefreshing.value = false;
  }
};

// Store Info State
const storeInfo = ref({
  name: '',
  address: '',
  phone: '',
  facebook: '',
  instagram: '',
  telegramBotToken: '',
  telegramChatId: '',
  googleSheetsHookUrl: '',
  googleSheetsDashboardUrl: '',
  bankName: '',
  bankAccount: '',
  bankOwner: '',
  bankQR: '',
  bankQRType: 'static'
});
const isSavingStoreInfo = ref(false);
const orderToPrint = ref<Order | null>(null);
const orderForLabels = ref<Order | null>(null);

const getBankQRUrl = () => {
  if (storeInfo.value.bankQRType === 'dynamic') {
    if (!orderToPrint.value || !storeInfo.value.bankName || !storeInfo.value.bankAccount || !storeInfo.value.bankQR) return '';
    const bank = encodeURIComponent(storeInfo.value.bankName.trim());
    const acc = encodeURIComponent(storeInfo.value.bankAccount.trim());
    const amount = orderToPrint.value.totalAmount || 0;
    const des = encodeURIComponent(orderToPrint.value.id.trim());

    return storeInfo.value.bankQR
      .replace('NGAN_HANG', bank)
      .replace('SO_TAI_KHOAN', acc)
      .replace('SO_TIEN', amount.toString())
      .replace('NOI_DUNG', des)
      .replace('DOWNLOAD', 'false');
  }

  return storeInfo.value.bankQR;
};

const printOrder = (order: Order) => {
  orderToPrint.value = order;
  setTimeout(() => {
    window.print();
    orderToPrint.value = null;
  }, 300);
};

const printOrderLabels = (order: Order) => {
  orderForLabels.value = order;
  setTimeout(() => {
    window.print();
    orderForLabels.value = null;
  }, 300);
};

const fetchStoreInfo = async () => {
  try {
    const docSnap = await getDoc(doc(db, 'settings', 'store_info'));
    if (docSnap.exists()) {
      storeInfo.value = { ...storeInfo.value, ...docSnap.data() };
    }
  } catch (error) {
    console.error('Error fetching store info:', error);
  }
};

const saveStoreInfo = async () => {
  if (!authStore.isAdmin) return;
  if (isSavingStoreInfo.value) return;
  
  isSavingStoreInfo.value = true;
  try {
    await setDoc(doc(db, 'settings', 'store_info'), storeInfo.value);
    toast.success('Đã lưu thông tin cửa hàng');
  } catch (error) {
    console.error('Error saving store info:', error);
    handleFirestoreError(error, OperationType.WRITE, 'settings/store_info');
    toast.error('Có lỗi xảy ra khi lưu thông tin');
  } finally {
    isSavingStoreInfo.value = false;
  }
};

// Order Filtering & Search
const orderFilter = ref<OrderStatus | 'all'>('all');
const orderDeliveryFilter = ref<'all' | 'delivery' | 'pickup' | 'dine-in'>('all');
const orderSearch = ref('');
const orders = ref<Order[]>([]);
const lastOrderDoc = ref<any>(null);
const hasMoreOrders = ref(true);
const isLoadingOrders = ref(false);
const PAGE_SIZE = 6;

const fetchOrders = async (isInitial = false) => {
  if (isLoadingOrders.value || (!isInitial && !hasMoreOrders.value)) return;
  
  isLoadingOrders.value = true;
  try {
    let q = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );

    if (orderFilter.value !== 'all') {
      q = query(
        collection(db, 'orders'),
        where('status', '==', orderFilter.value),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );
    }

    if (!isInitial && lastOrderDoc.value) {
      q = query(q, startAfter(lastOrderDoc.value));
    }

    const snapshot = await getDocs(q);
    const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    
    if (isInitial) {
      orders.value = newOrders;
    } else {
      orders.value = [...orders.value, ...newOrders];
    }

    lastOrderDoc.value = snapshot.docs[snapshot.docs.length - 1];
    hasMoreOrders.value = snapshot.docs.length === PAGE_SIZE;
  } catch (error) {
    console.error('Error fetching orders:', error);
    // Don't toast on initial load if it's just an index issue, but usually we should
  } finally {
    isLoadingOrders.value = false;
    loading.value = false;
  }
};

const filteredOrders = computed(() => {
  let result = orders.value;

  if (orderDeliveryFilter.value !== 'all') {
    result = result.filter(o => o.deliveryMethod === orderDeliveryFilter.value);
  }

  if (!orderSearch.value) return result;
  
  const search = orderSearch.value.toLowerCase().trim();
  return result.filter(o => {
    const idMatch = o.id.toLowerCase().includes(search);
    const nameMatch = search.length >= 3 && o.customerName.toLowerCase().includes(search);
    const phoneMatch = search.length >= 4 && o.customerPhone.includes(search);
    return idMatch || nameMatch || phoneMatch;
  });
});

// Reset and refetch when status filter changes
watch(orderFilter, () => {
  orders.value = [];
  lastOrderDoc.value = null;
  hasMoreOrders.value = true;
  fetchOrders(true);
});

const observerTarget = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

watch(observerTarget, (newTarget) => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  
  if (newTarget) {
    observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMoreOrders.value && !isLoadingOrders.value) {
        fetchOrders();
      }
    }, { threshold: 0.1 });
    observer.observe(newTarget);
  }
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
});

onMounted(async () => {
  if (router.currentRoute.value.query.tab) {
    activeTab.value = router.currentRoute.value.query.tab as string;
  }

  if (!authStore.isStaff) {
    router.push('/');
    return;
  }

  await Promise.all([
    fetchOrders(true),
    fetchProducts(),
    fetchCategories(),
    fetchVouchers(),
    fetchUsers(),
    fetchStoreInfo(),
    fetchCacheConfig(),
    fetchQuickNotes()
  ]);
  
  loading.value = false;
});

// Voucher Modal State
const isVoucherModalOpen = ref(false);
const editingVoucher = ref<any | null>(null);
const voucherForm = ref({
  code: '',
  discountType: 'percentage' as 'percentage' | 'fixed',
  discountValue: 0,
  minOrderAmount: 0,
  maxUsage: 100,
  startDate: '',
  endDate: '',
  isActive: true
});

const generateVoucherCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  voucherForm.value.code = code;
};

// Copy Topping Logic
const isCopyToppingModalOpen = ref(false);
const toppingSearchQuery = ref('');
const selectedToppingsToCopy = ref<any[]>([]);

const availableUniqueToppings = computed(() => {
  const toppingsMap = new Map();
  // Using products from memory (paginated or filtered)
  products.value.forEach(p => {
    if (p.options?.toppings) {
      p.options.toppings.forEach(t => {
        const key = `${t.name}-${t.price}`;
        if (!toppingsMap.has(key)) {
          toppingsMap.set(key, { ...t, fromProduct: p.name });
        }
      });
    }
  });
  
  let result = Array.from(toppingsMap.values());
  if (toppingSearchQuery.value) {
    const q = toppingSearchQuery.value.toLowerCase().trim();
    result = result.filter(t => t.name.toLowerCase().includes(q));
  }
  return result;
});

const openCopyToppingModal = () => {
  toppingSearchQuery.value = '';
  selectedToppingsToCopy.value = [];
  isCopyToppingModalOpen.value = true;
};

const toggleToppingSelection = (topping: any) => {
  const index = selectedToppingsToCopy.value.findIndex(t => t.name === topping.name && t.price === topping.price);
  if (index === -1) {
    selectedToppingsToCopy.value.push(topping);
  } else {
    selectedToppingsToCopy.value.splice(index, 1);
  }
};

const applyCopiedToppings = () => {
  selectedToppingsToCopy.value.forEach(t => {
    // Check if topping already exists in current product mapping to avoid duplicates
    const exists = productForm.value.options.toppings.some(et => et.name === t.name);
    if (!exists) {
      productForm.value.options.toppings.push({ name: t.name, price: t.price });
    }
  });
  isCopyToppingModalOpen.value = false;
};

const searchProducts = async () => {
  if (!authStore.isAdmin) return;
  const s = productSearchInput.value.trim().toLowerCase();
  const c = productCategoryFilter.value;
  
  if (!s && !c) {
    isSearchingProducts.value = false;
    lastProductDoc.value = null; // reset pagination
    await fetchProducts();
    return;
  }
  
  isSearchingProducts.value = true;
  try {
    const q = c ? query(collection(db, 'products'), where('category', '==', c)) : collection(db, 'products');
    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    
    if (s) {
      results = results.filter(p => p.name.toLowerCase().includes(s));
    }
    
    // Sort by name for search results
    results.sort((a, b) => a.name.localeCompare(b.name));
    
    allFilteredProducts.value = results;
    fetchProducts(false); // Render first page
  } catch (err) {
    console.error('Error searching products:', err);
    toast.error('Có lỗi xảy ra khi tìm kiếm sản phẩm');
  }
};

const searchCategories = () => {
  const s = categorySearchInput.value.trim().toLowerCase();
  if (!s) {
    categories.value = [...allCategories.value];
  } else {
    categories.value = allCategories.value.filter(c => c.name.toLowerCase().includes(s));
  }
};

const fetchProducts = async (loadMore = false) => {
  if (!authStore.isAdmin) return;
  
  if (isSearchingProducts.value) {
    if (loadMore) {
      const currentLength = products.value.length;
      const nextBatch = allFilteredProducts.value.slice(currentLength, currentLength + ITEM_PAGE_SIZE);
      products.value = [...products.value, ...nextBatch];
      hasMoreProducts.value = products.value.length < allFilteredProducts.value.length;
    } else {
      products.value = allFilteredProducts.value.slice(0, ITEM_PAGE_SIZE);
      hasMoreProducts.value = products.value.length < allFilteredProducts.value.length;
    }
    return;
  }

  try {
    let q = query(collection(db, 'products'), limit(ITEM_PAGE_SIZE));
    if (loadMore && lastProductDoc.value) {
      q = query(collection(db, 'products'), startAfter(lastProductDoc.value), limit(ITEM_PAGE_SIZE));
    }
    
    const snapshot = await getDocs(q);
    const newProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    
    if (loadMore) {
      products.value = [...products.value, ...newProducts];
    } else {
      products.value = newProducts;
    }
    
    if (snapshot.docs.length > 0) {
      lastProductDoc.value = snapshot.docs[snapshot.docs.length - 1];
    }
    hasMoreProducts.value = snapshot.docs.length === ITEM_PAGE_SIZE;
  } catch (error) {
    console.error('Error fetching products:', error);
  }
};

const fetchCategories = async () => {
  if (!authStore.isAdmin) return;
  try {
    const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
    
    const snapshot = await getDocs(q);
    allCategories.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
    searchCategories(); // Apply any active search filter
    
    hasMoreCategories.value = false;
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
};

const fetchVouchers = async (loadMore = false) => {
  if (!authStore.isAdmin) return;
  try {
    let q = query(collection(db, 'vouchers'), orderBy('createdAt', 'desc'), limit(ITEM_PAGE_SIZE));
    if (loadMore && lastVoucherDoc.value) {
      q = query(collection(db, 'vouchers'), orderBy('createdAt', 'desc'), startAfter(lastVoucherDoc.value), limit(ITEM_PAGE_SIZE));
    }
    
    const snapshot = await getDocs(q);
    const newVouchers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    if (loadMore) {
      vouchers.value = [...vouchers.value, ...newVouchers];
    } else {
      vouchers.value = newVouchers;
    }
    
    if (snapshot.docs.length > 0) {
      lastVoucherDoc.value = snapshot.docs[snapshot.docs.length - 1];
    }
    hasMoreVouchers.value = snapshot.docs.length === ITEM_PAGE_SIZE;
  } catch (error) {
    console.error('Error fetching vouchers:', error);
  }
};

const fetchUsers = async (page = 1) => {
  if (!authStore.isAdmin) return;
  
  if (isSearchingUsers.value) {
    // Local pagination for search results
    const start = (page - 1) * USER_PAGE_SIZE;
    users.value = allFilteredUsers.value.slice(start, start + USER_PAGE_SIZE);
    hasMoreUsers.value = start + USER_PAGE_SIZE < allFilteredUsers.value.length;
    userPage.value = page;
    return;
  }

  try {
    let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(USER_PAGE_SIZE));
    
    if (page > 1 && userCursors.value[page - 1]) {
      q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), startAfter(userCursors.value[page - 1]), limit(USER_PAGE_SIZE));
    }

    const snapshot = await getDocs(q);
    users.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    if (snapshot.docs.length === USER_PAGE_SIZE) {
      userCursors.value[page] = snapshot.docs[snapshot.docs.length - 1];
      hasMoreUsers.value = true;
    } else {
      hasMoreUsers.value = false;
    }
    
    userPage.value = page;
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};

const searchUsers = async () => {
  if (!authStore.isAdmin) return;
  
  const s = userSearchInput.value.trim().toLowerCase();
  activeUserSearch.value = s;
  
  if (!s) {
    isSearchingUsers.value = false;
    userCursors.value = [];
    await fetchUsers(1);
    return;
  }

  isSearchingUsers.value = true;
  loading.value = true;
  try {
    // Fetch all users to filter client-side (since Firestore lacks multi-field full-text search)
    const snapshot = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
    const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    allFilteredUsers.value = allUsers.filter(u => {
      const nameMatch = u.displayName?.toLowerCase().includes(s);
      const emailMatch = u.email?.toLowerCase().includes(s);
      const phoneMatch = u.phoneNumber?.toLowerCase().includes(s);
      const roleMatch = u.role?.toLowerCase().includes(s);
      const statusStr = u.isLocked ? 'đã khóa' : 'hoạt động';
      const statusMatch = statusStr.includes(s);
      
      return nameMatch || emailMatch || phoneMatch || roleMatch || statusMatch;
    });
    
    await fetchUsers(1);
  } catch (error) {
    console.error('Error searching users:', error);
    toast.error('Lỗi khi tìm kiếm người dùng');
  } finally {
    loading.value = false;
  }
};

const updateUserRole = async (userId: string, newRole: 'admin' | 'staff' | 'customer' | 'tablet') => {
  if (!authStore.isAdmin) return;
  if (isUpdatingUser.value) return;
  
  isUpdatingUser.value = true;
  try {
    await updateDoc(doc(db, 'users', userId), { role: newRole });
    toast.success('Đã cập nhật quyền người dùng');
    const userIndex = users.value.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users.value[userIndex].role = newRole;
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    toast.error('Có lỗi xảy ra khi cập nhật quyền');
  } finally {
    isUpdatingUser.value = false;
  }
};

const toggleUserLock = async (userId: string, currentLockStatus: boolean) => {
  if (!authStore.isAdmin) return;
  if (isUpdatingUser.value) return;
  
  // Prevent locking oneself
  if (userId === authStore.user?.uid) {
    toast.error('Bạn không thể tự khóa tài khoản của mình');
    return;
  }
  
  isUpdatingUser.value = true;
  try {
    await updateDoc(doc(db, 'users', userId), { isLocked: !currentLockStatus });
    toast.success(!currentLockStatus ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
    const userIndex = users.value.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users.value[userIndex].isLocked = !currentLockStatus;
    }
  } catch (error) {
    console.error('Error toggling user lock:', error);
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    toast.error('Có lỗi xảy ra khi cập nhật trạng thái');
  } finally {
    isUpdatingUser.value = false;
  }
};

const openVoucherModal = (voucher?: any) => {
  if (voucher) {
    editingVoucher.value = voucher;
    voucherForm.value = {
      code: voucher.code,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      minOrderAmount: voucher.minOrderAmount,
      maxUsage: voucher.maxUsage,
      startDate: voucher.startDate.toDate().toISOString().split('T')[0],
      endDate: voucher.endDate.toDate().toISOString().split('T')[0],
      isActive: voucher.isActive
    };
  } else {
    editingVoucher.value = null;
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString().split('T')[0];
    
    voucherForm.value = {
      code: '',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 0,
      maxUsage: 100,
      startDate: today,
      endDate: nextMonthStr,
      isActive: true
    };
    generateVoucherCode();
  }
  isVoucherModalOpen.value = true;
};

const closeVoucherModal = () => {
  isVoucherModalOpen.value = false;
  editingVoucher.value = null;
};

const saveVoucher = async () => {
  if (!authStore.isAdmin) return;
  if (isSavingVoucher.value) return;
  
  const { code, discountValue, maxUsage, startDate, endDate } = voucherForm.value;

  if (!code || code.length !== 6) {
    toast.error('Mã voucher phải có đúng 6 ký tự');
    return;
  }

  if (discountValue <= 0) {
    toast.error('Giá trị giảm phải lớn hơn 0');
    return;
  }

  if (maxUsage <= 0) {
    toast.error('Lượt dùng tối đa phải lớn hơn 0');
    return;
  }

  if (!startDate || !endDate) {
    toast.error('Vui lòng chọn ngày bắt đầu và ngày kết thúc');
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    toast.error('Ngày bắt đầu không được sau ngày kết thúc');
    return;
  }

  isSavingVoucher.value = true;
  try {
    const data = {
      ...voucherForm.value,
      startDate: Timestamp.fromDate(new Date(voucherForm.value.startDate)),
      endDate: Timestamp.fromDate(new Date(voucherForm.value.endDate)),
      updatedAt: Timestamp.now()
    };

    if (editingVoucher.value?.id) {
      await updateDoc(doc(db, 'vouchers', editingVoucher.value.id), data);
      const index = vouchers.value.findIndex(v => v.id === editingVoucher.value!.id);
      if (index !== -1) {
        vouchers.value[index] = { ...vouchers.value[index], ...data } as Voucher;
      }
      toast.success('Đã cập nhật mã giảm giá');
    } else {
      const docRef = await addDoc(collection(db, 'vouchers'), {
        ...data,
        usedCount: 0,
        createdAt: Timestamp.now()
      });
      vouchers.value.unshift({ id: docRef.id, ...data, usedCount: 0, createdAt: Timestamp.now() } as Voucher);
      toast.success('Đã tạo mã giảm giá mới');
    }
    closeVoucherModal();
  } catch (error) {
    console.error('Error saving voucher', error);
    toast.error('Có lỗi xảy ra khi lưu mã giảm giá. Vui lòng kiểm tra lại dữ liệu.');
  } finally {
    isSavingVoucher.value = false;
  }
};

// Product Modal State
const isProductModalOpen = ref(false);
const editingProduct = ref<Partial<Product> | null>(null);
const productForm = ref({
  name: '',
  description: '',
  price: 0,
  category: '',
  image: '',
  isAvailable: true,
  isTrending: false,
  shopNotes: '',
  options: {
    sizes: [] as { name: string; price: number }[],
    toppings: [] as { name: string; price: number }[]
  }
});

// Category Modal State
const isCategoryModalOpen = ref(false);
const editingCategory = ref<Partial<Category> | null>(null);
const categoryForm = ref({
  name: '',
  slug: '',
  order: 0,
  image: ''
});

// Delete Confirmation State
const isDeleteConfirmOpen = ref(false);
const itemToDelete = ref<{ id: string; type: 'product' | 'category' | 'voucher' | 'note' } | null>(null);

const openProductModal = (product?: Product) => {
  if (product) {
    editingProduct.value = product;
    productForm.value = {
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image: product.image,
      isAvailable: product.isAvailable ?? true,
      isTrending: product.isTrending ?? false,
      shopNotes: product.shopNotes || '',
      options: JSON.parse(JSON.stringify(product.options))
    };
  } else {
    editingProduct.value = null;
    productForm.value = {
      name: '',
      description: '',
      price: 0,
      category: '',
      image: '',
      isAvailable: true,
      isTrending: false,
      shopNotes: '',
      options: {
        sizes: [{ name: 'Vừa', price: 0 }],
        toppings: []
      }
    };
  }
  isProductModalOpen.value = true;
};

const closeProductModal = () => {
  isProductModalOpen.value = false;
  editingProduct.value = null;
};

const saveProduct = async () => {
  if (!authStore.isAdmin) return;
  if (isSavingProduct.value) return;
  
  if (!productForm.value.name || !productForm.value.category || productForm.value.price < 0) {
    toast.error('Vui lòng nhập đầy đủ thông tin sản phẩm');
    return;
  }

  isSavingProduct.value = true;
  try {
    const data = {
      ...productForm.value,
      updatedAt: Timestamp.now()
    };

    if (editingProduct.value?.id) {
      await updateDoc(doc(db, 'products', editingProduct.value.id), data);
      const index = products.value.findIndex(p => p.id === editingProduct.value!.id);
      if (index !== -1) {
        products.value[index] = { ...products.value[index], ...data } as Product;
      }
      toast.success('Đã cập nhật sản phẩm');
    } else {
      const docRef = await addDoc(collection(db, 'products'), {
        ...data,
        createdAt: Timestamp.now()
      });
      products.value.unshift({ id: docRef.id, ...data, createdAt: Timestamp.now() } as Product);
      toast.success('Đã thêm sản phẩm mới');
    }
    triggerAutoCacheUpdate();
    closeProductModal();
  } catch (error) {
    console.error('Error saving product', error);
    toast.error('Có lỗi xảy ra khi lưu sản phẩm');
  } finally {
    isSavingProduct.value = false;
  }
};

const openCategoryModal = (category?: Category) => {
  if (category) {
    editingCategory.value = category;
    categoryForm.value = {
      name: category.name,
      slug: category.slug,
      order: category.order,
      image: category.image || ''
    };
  } else {
    editingCategory.value = null;
    categoryForm.value = {
      name: '',
      slug: '',
      order: categories.value.length + 1,
      image: ''
    };
  }
  isCategoryModalOpen.value = true;
};

const closeCategoryModal = () => {
  isCategoryModalOpen.value = false;
  editingCategory.value = null;
};

const saveCategory = async () => {
  if (!authStore.isAdmin) return;
  if (isSavingCategory.value) return;
  
  if (!categoryForm.value.name || !categoryForm.value.slug) {
    toast.error('Vui lòng nhập đầy đủ tên và slug');
    return;
  }

  // Uniqueness check
  const isDuplicate = categories.value.some(c => 
    c.name.toLowerCase() === categoryForm.value.name.toLowerCase() && 
    c.id !== editingCategory.value?.id
  );

  if (isDuplicate) {
    toast.error('Tên danh mục này đã tồn tại. Vui lòng chọn tên khác.');
    return;
  }

  isSavingCategory.value = true;
  try {
    const data = {
      ...categoryForm.value,
      updatedAt: Timestamp.now()
    };

    if (editingCategory.value?.id) {
      await updateDoc(doc(db, 'categories', editingCategory.value.id), data);
      const index = categories.value.findIndex(c => c.id === editingCategory.value!.id);
      if (index !== -1) {
        categories.value[index] = { ...categories.value[index], ...data } as Category;
      }
      toast.success('Đã cập nhật danh mục');
    } else {
      const docRef = await addDoc(collection(db, 'categories'), {
        ...data,
        createdAt: Timestamp.now()
      });
      categories.value.push({ id: docRef.id, ...data, createdAt: Timestamp.now() } as Category);
      categories.value.sort((a, b) => a.order - b.order);
      toast.success('Đã thêm danh mục mới');
    }
    triggerAutoCacheUpdate();
    closeCategoryModal();
  } catch (error) {
    console.error('Error saving category', error);
    toast.error('Có lỗi xảy ra khi lưu danh mục');
  } finally {
    isSavingCategory.value = false;
  }
};

const confirmDelete = (id: string, type: 'product' | 'category' | 'voucher' | 'note') => {
  itemToDelete.value = { id, type };
  isDeleteConfirmOpen.value = true;
};

const executeDelete = async () => {
  if (!authStore.isAdmin) return;
  if (!itemToDelete.value || isDeleting.value) return;
  
  isDeleting.value = true;
  try {
    const type = itemToDelete.value.type;
    const collectionName = 
      type === 'product' ? 'products' : 
      type === 'category' ? 'categories' : 
      type === 'note' ? 'quick_notes' : 'vouchers';
    
    await deleteDoc(doc(db, collectionName, itemToDelete.value.id));
    
    const typeName = 
      type === 'product' ? 'sản phẩm' : 
      type === 'category' ? 'danh mục' : 
      type === 'note' ? 'ghi chú' : 'mã giảm giá';
    
    toast.success(`Đã xóa ${typeName}`);
    
    if (type === 'product') {
      products.value = products.value.filter(p => p.id !== itemToDelete.value!.id);
    } else if (type === 'category') {
      categories.value = categories.value.filter(c => c.id !== itemToDelete.value!.id);
    } else if (type === 'voucher') {
      vouchers.value = vouchers.value.filter(v => v.id !== itemToDelete.value!.id);
    } else if (type === 'note') {
      quickNotes.value = quickNotes.value.filter(n => n.id !== itemToDelete.value!.id);
    }

    triggerAutoCacheUpdate();
    isDeleteConfirmOpen.value = false;
    itemToDelete.value = null;
  } catch (error) {
    const typeName = 
      itemToDelete.value?.type === 'product' ? 'sản phẩm' : 
      itemToDelete.value?.type === 'category' ? 'danh mục' : 
      itemToDelete.value?.type === 'note' ? 'ghi chú' : 'mã giảm giá';
    console.error(`Error deleting ${itemToDelete.value?.type}`, error);
    toast.error(`Có lỗi xảy ra khi xóa ${typeName}`);
  } finally {
    isDeleting.value = false;
  }
};

const addSize = () => {
  productForm.value.options.sizes.push({ name: '', price: 0 });
};

const removeSize = (index: number) => {
  productForm.value.options.sizes.splice(index, 1);
};

const addTopping = () => {
  productForm.value.options.toppings.push({ name: '', price: 0 });
};

const removeTopping = (index: number) => {
  productForm.value.options.toppings.splice(index, 1);
};

// Stats
const totalRevenue = computed(() => orders.value.filter(o => o.status === 'completed').reduce((acc, o) => acc + o.totalAmount, 0));
const totalOrders = computed(() => orders.value.length);
const pendingOrders = computed(() => orders.value.filter(o => o.status === 'pending').length);

const isStatusConfirmOpen = ref(false);
const pendingStatusUpdate = ref<{ orderId: string, status: OrderStatus } | null>(null);

const confirmOrderStatusUpdate = (orderId: string, status: OrderStatus) => {
  if (isUpdatingStatus.value) return;
  pendingStatusUpdate.value = { orderId, status };
  isStatusConfirmOpen.value = true;
};

const executeStatusUpdate = async () => {
  if (!pendingStatusUpdate.value || isUpdatingStatus.value) return;
  
  const { orderId, status } = pendingStatusUpdate.value;
  isUpdatingStatus.value = true;
  try {
    await updateDoc(doc(db, 'orders', orderId), { 
      status,
      updatedAt: Timestamp.now()
    });
    
    // Update local state
    const orderIndex = orders.value.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      orders.value[orderIndex].status = status;
      
      // If filtering by status and status changed, remove from list
      if (orderFilter.value !== 'all' && status !== orderFilter.value) {
        orders.value = orders.value.filter(o => o.id !== orderId);
      }
    }

    toast.success(`Đã cập nhật trạng thái đơn hàng thành ${getStatusLabel(status)}`);
    
    // Sync to Google Sheets on every status change
    syncOrderToGoogleSheets(orders.value[orderIndex]);

    // Refetch stats if needed
    if (status === 'completed' || orders.value.find(o => o.id === orderId)?.status === 'completed') {
      await fetchStatsOrders();
    }
  } catch (error) {
    console.error('Error updating order status', error);
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    toast.error('Có lỗi xảy ra khi cập nhật trạng thái');
  } finally {
    isUpdatingStatus.value = false;
    isStatusConfirmOpen.value = false;
    pendingStatusUpdate.value = null;
  }
};

const updateDeliveryMethod = async (orderId: string, method: DeliveryMethod) => {
  if (isUpdatingDelivery.value) return;
  
  isUpdatingDelivery.value = true;
  try {
    await updateDoc(doc(db, 'orders', orderId), { 
      deliveryMethod: method,
      updatedAt: Timestamp.now()
    });
    
    // Update local state
    const orderIndex = orders.value.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      orders.value[orderIndex].deliveryMethod = method;
    }

    toast.success(`Đã cập nhật phương thức giao hàng thành ${method === 'delivery' ? 'Giao hàng' : method === 'pickup' ? 'Đến lấy' : 'Tại quán'}`);
  } catch (error) {
    console.error('Error updating delivery method', error);
    handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    toast.error('Có lỗi xảy ra khi cập nhật phương thức giao hàng');
  } finally {
    isUpdatingDelivery.value = false;
  }
};

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-600';
    case 'processing': return 'bg-blue-100 text-blue-600';
    case 'delivering': return 'bg-purple-100 text-purple-600';
    case 'completed': return 'bg-green-100 text-green-600';
    case 'cancelled': return 'bg-red-100 text-red-600';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const getStatusIcon = (status: OrderStatus) => {
  switch (status) {
    case 'pending': return Clock;
    case 'processing': return Coffee;
    case 'delivering': return Truck;
    case 'completed': return CheckCircle;
    case 'cancelled': return XCircle;
    default: return AlertCircle;
  }
};

const getStatusLabel = (status: OrderStatus | undefined) => {
  if (!status) return '';
  switch (status) {
    case 'pending': return 'Chờ xử lý';
    case 'processing': return 'Đang pha chế';
    case 'delivering': return 'Đang giao';
    case 'completed': return 'Đã hoàn thành';
    case 'cancelled': return 'Đã hủy';
    default: return status;
  }
};

// Seed Data
const seedData = async () => {
  if (isSeeding.value) return;
  isSeeding.value = true;
  try {
    const batch = writeBatch(db);
    
    const categoriesData = [
      { name: 'Cà phê', slug: 'ca-phe', order: 1 },
      { name: 'Trà trái cây', slug: 'tra-trai-cay', order: 2 },
      { name: 'Đá xay', slug: 'da-xay', order: 3 },
      { name: 'Bánh & Snack', slug: 'banh-snack', order: 4 },
    ];

    for (const cat of categoriesData) {
      const newCatRef = doc(collection(db, 'categories'));
      batch.set(newCatRef, cat);
    }

    const productsData = [
      {
        name: 'Cà Phê Sữa Đá',
        description: 'Hương vị truyền thống đậm đà từ hạt cà phê Robusta.',
        price: 29000,
        category: 'ca-phe',
        image: 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?auto=format&fit=crop&q=80&w=800',
        options: {
          sizes: [
            { name: 'Nhỏ', price: 0 },
            { name: 'Vừa', price: 6000 },
            { name: 'Lớn', price: 10000 },
          ],
          toppings: [
            { name: 'Trân châu trắng', price: 10000 },
            { name: 'Thạch cà phê', price: 10000 },
          ],
        },
      },
      {
        name: 'Trà Đào Cam Sả',
        description: 'Vị trà thanh mát kết hợp cùng đào miếng giòn tan và hương sả đặc trưng.',
        price: 45000,
        category: 'tra-trai-cay',
        image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=800',
        options: {
          sizes: [
            { name: 'Vừa', price: 0 },
            { name: 'Lớn', price: 10000 },
          ],
          toppings: [
            { name: 'Đào miếng', price: 10000 },
            { name: 'Hạt sen', price: 10000 },
          ],
        },
      },
    ];

    for (const prod of productsData) {
      const newProdRef = doc(collection(db, 'products'));
      batch.set(newProdRef, prod);
    }

    await batch.commit();
    toast.success('Đã khởi tạo dữ liệu mẫu thành công!');
  } catch (error) {
    console.error('Error seeding data', error);
    toast.error('Có lỗi xảy ra khi khởi tạo dữ liệu');
  } finally {
    isSeeding.value = false;
  }
};
</script>

<template>
  <div v-if="authStore.isStaff" class="min-h-screen bg-gray-50 flex flex-col md:flex-row print:bg-white print:min-h-0 print:block">
    <!-- Sidebar -->
    <aside class="w-full md:w-80 bg-white border-r border-gray-100 p-8 space-y-12 print:hidden">
      <div class="flex items-center gap-4 px-4">
        <div class="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-600/20">
          <LayoutDashboard :size="28" />
        </div>
        <h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">QUẢN TRỊ</h2>
      </div>

      <nav class="space-y-4">
        <button
          v-for="tab in [
            { id: 'dashboard', name: 'Tổng quan', icon: TrendingUp },
            { id: 'orders', name: 'Đơn hàng', icon: ShoppingBag },
            ...(authStore.isAdmin ? [
              { id: 'products', name: 'Sản phẩm', icon: Coffee },
              { id: 'categories', name: 'Danh mục', icon: Filter },
              { id: 'vouchers', name: 'Mã giảm giá', icon: Ticket },
              { id: 'notes', name: 'Ghi chú nhanh', icon: AlertCircle },
              { id: 'users', name: 'Người dùng', icon: Users },
              { id: 'settings', name: 'Cửa hàng', icon: Store },
              { id: 'calendar', name: 'Lịch làm việc', icon: Calendar },
              { id: 'cache', name: 'Quản lý Cache', icon: HardDrive }
            ] : []),
          ]"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="w-full flex items-center gap-4 p-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all"
          :class="activeTab === tab.id ? 'bg-orange-600 text-white shadow-2xl shadow-orange-600/30' : 'text-gray-500 hover:bg-gray-50'"
        >
          <component :is="tab.icon" :size="20" />
          {{ tab.name }}
        </button>
      </nav>

      <div v-if="authStore.isAdmin" class="pt-12 border-t border-gray-100">
        <button
          @click="seedData"
          :disabled="isSeeding"
          class="w-full flex items-center justify-center gap-3 p-5 bg-gray-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl disabled:opacity-50"
        >
          <Database v-if="!isSeeding" :size="20" />
          <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {{ isSeeding ? 'Đang khởi tạo...' : 'Khởi tạo dữ liệu' }}
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-grow p-8 md:p-16 overflow-y-auto no-scrollbar print:hidden">
      <div v-if="loading" class="flex justify-center py-32">
        <div class="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else class="max-w-6xl mx-auto space-y-8">
        <!-- Dashboard Tab -->
        <div v-if="activeTab === 'dashboard'" class="space-y-16">
          <div class="flex justify-between items-end">
            <div class="flex items-center gap-4">
              <h2 class="text-4xl font-black text-gray-900 uppercase tracking-tighter">TỔNG QUAN</h2>
              <button 
                @click="refreshData" 
                :disabled="isRefreshing"
                class="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all disabled:opacity-50"
                title="Làm mới dữ liệu"
              >
                <RefreshCw :size="16" :class="{ 'animate-spin': isRefreshing }" />
              </button>
            </div>
            
            <div class="flex flex-wrap items-center gap-4">
              <div v-if="!storeInfo.googleSheetsDashboardUrl" class="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
                <Calendar :size="14" class="text-gray-400" />
                <span class="text-[10px] font-black uppercase tracking-widest text-orange-600">Hôm nay</span>
              </div>
              <div v-else class="flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-2xl border border-green-100 shadow-sm animate-pulse-slow">
                <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                <span class="text-[10px] font-black uppercase tracking-widest text-green-700">Đã kết nối AppScript</span>
              </div>
            </div>
          </div>

          <div v-if="storeInfo.googleSheetsDashboardUrl" class="w-full h-[800px] bg-white rounded-[50px] shadow-sm border border-gray-100 overflow-hidden relative">
            <iframe 
              :src="storeInfo.googleSheetsDashboardUrl" 
              class="w-full h-full border-none"
              title="Google Sheets Dashboard"
            ></iframe>
          </div>

          <div v-else class="flex flex-col items-center justify-center py-32 text-center space-y-6 bg-white rounded-[50px] shadow-sm border border-gray-100">
            <div class="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
              <TrendingUp :size="48" />
            </div>
            <div class="space-y-4 max-w-md">
              <h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">CHƯA CẤU HÌNH THỐNG KÊ</h2>
              <p class="text-gray-500 font-medium">Bạn chưa cấu hình đường dẫn (Dashboard URL) của Google Apps Script để xem Bảng Thống Kê nâng cao (Zero-read).</p>
            </div>
            <button
               @click="activeTab = 'settings'"
              class="mt-4 py-4 px-8 bg-[#C04D1E] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#C04D1E]/30 hover:bg-[#a34119] transition-colors"
            >
              Chuyển đến cấu hình
            </button>
          </div>
        </div>

        <!-- Orders Tab -->
        <div v-if="activeTab === 'orders'" class="space-y-10">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div class="flex items-center gap-4">
              <h2 class="text-4xl font-black text-gray-900 uppercase tracking-tighter">QUẢN LÝ ĐƠN HÀNG</h2>
              <button 
                @click="refreshData" 
                :disabled="isRefreshing"
                class="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all disabled:opacity-50"
                title="Làm mới dữ liệu"
              >
                <RefreshCw :size="16" :class="{ 'animate-spin': isRefreshing }" />
              </button>
            </div>
            
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-3 bg-gray-50 px-6 py-3 rounded-2xl flex-grow md:flex-grow-0">
                <Search :size="16" class="text-gray-400" />
                <input 
                  v-model="orderSearch" 
                  type="text" 
                  placeholder="Tìm mã đơn, tên, SĐT..." 
                  class="text-xs font-bold bg-transparent border-none focus:ring-0 w-full md:w-48"
                />
              </div>

              <div class="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl">
                <Filter :size="14" class="text-gray-400" />
                <select v-model="orderFilter" class="text-[10px] font-black uppercase tracking-widest bg-transparent border-none focus:ring-0 cursor-pointer">
                  <option value="all">Tất cả trạng thái</option>
                  <option value="pending">Chờ xử lý</option>
                  <option value="processing">Đang pha chế</option>
                  <option value="delivering">Đang giao</option>
                  <option value="completed">Hoàn tất</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </div>

              <div class="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-2xl">
                <Truck :size="14" class="text-gray-400" />
                <select v-model="orderDeliveryFilter" class="text-[10px] font-black uppercase tracking-widest bg-transparent border-none focus:ring-0 cursor-pointer">
                  <option value="all">Tất cả PT giao</option>
                  <option value="delivery">Giao hàng</option>
                  <option value="pickup">Đến lấy</option>
                  <option value="dine-in">Tại quán</option>
                </select>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-8">
            <div
              v-for="order in filteredOrders"
              :key="order.id"
              class="bg-white p-10 rounded-[50px] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-10 group hover:shadow-2xl transition-all duration-500"
            >
              <div class="flex-grow space-y-8">
                <div class="flex justify-between items-start">
                  <div>
                    <div class="flex items-center gap-4 mb-2">
                      <span class="text-2xl font-black text-orange-600 tracking-tighter">#{{ order.id.slice(-8) }}</span>
                      <span :class="['px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2', getStatusColor(order.status)]">
                        <component :is="getStatusIcon(order.status)" :size="14" />
                        {{ getStatusLabel(order.status) }}
                      </span>
                    </div>
                    <p class="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                      {{ order.createdAt.toDate().toLocaleString('vi-VN') }}
                    </p>
                  </div>
                  <div class="text-right flex flex-col items-end gap-2">
                    <div>
                      <p class="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Tổng thanh toán</p>
                      <p class="text-3xl font-black text-gray-900 tracking-tighter">{{ (order.totalAmount || 0).toLocaleString() }}đ</p>
                    </div>
                    <div class="flex gap-2">
                      <button 
                        v-if="order.status !== 'cancelled'"
                        @click="printOrder(order)"
                        class="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all"
                        title="In hóa đơn thanh toán"
                      >
                        <Printer :size="14" /> In đơn
                      </button>
                      <button 
                        v-if="order.status !== 'cancelled'"
                        @click="printOrderLabels(order)"
                        class="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100"
                        title="In tem nhãn 50x30mm cho từng món"
                      >
                        <Tag :size="14" /> In tem
                      </button>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-10 p-8 bg-gray-50 rounded-[40px]">
                  <div class="space-y-4">
                    <h4 class="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
                      <Users :size="14" /> Thông tin khách hàng
                    </h4>
                    <div class="space-y-1">
                      <p class="font-black text-gray-900 uppercase tracking-tight">{{ order.customerName }}</p>
                      <p class="text-sm text-gray-600 font-bold">{{ order.customerPhone }}</p>
                      <p class="text-sm text-gray-500 leading-relaxed">{{ order.address }}</p>
                      <a 
                        v-if="order.location" 
                        :href="`https://www.google.com/maps?q=${order.location.lat},${order.location.lng}`" 
                        target="_blank"
                        class="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all border border-blue-100"
                      >
                        <MapPin :size="12" /> Xem trên bản đồ
                      </a>
                      <div v-if="order.note" class="mt-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                        <p class="text-[9px] text-orange-600 font-black uppercase tracking-widest mb-1">Ghi chú khách hàng:</p>
                        <p class="text-xs text-gray-700 font-bold italic">"{{ order.note }}"</p>
                      </div>
                      <div class="flex flex-wrap gap-2 mt-2">
                        <button
                          v-for="method in ['delivery', 'pickup', 'dine-in'] as DeliveryMethod[]"
                          :key="method"
                          @click="updateDeliveryMethod(order.id, method)"
                          :disabled="isUpdatingDelivery"
                          class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                          :class="order.deliveryMethod === method ? 
                            (method === 'delivery' ? 'bg-blue-100 text-blue-600' : 
                             method === 'pickup' ? 'bg-purple-100 text-purple-600' : 
                             'bg-green-100 text-green-600') : 
                            'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'"
                        >
                          <Truck v-if="method === 'delivery'" :size="10" />
                          <ShoppingBag v-else-if="method === 'pickup'" :size="10" />
                          <Coffee v-else :size="10" />
                          {{ method === 'delivery' ? 'Giao hàng' : method === 'pickup' ? 'Đến lấy' : 'Tại quán' }}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div class="space-y-4">
                    <h4 class="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
                      <ShoppingBag :size="14" /> Chi tiết món ({{ order.items.length }})
                    </h4>
                    <div class="space-y-3">
                      <div v-for="(item, i) in order.items" :key="i" class="flex flex-col border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <div class="flex justify-between text-sm">
                          <span class="font-bold text-gray-700">{{ item.quantity }}x {{ item.name }} ({{ item.size }})</span>
                          <span class="font-black text-gray-900 tracking-tighter">{{ (item.price * item.quantity).toLocaleString() }}đ</span>
                        </div>
                        <div v-if="item.toppings && item.toppings.length > 0" class="flex flex-wrap gap-1 mt-1">
                          <span v-for="t in item.toppings" :key="t" class="text-[9px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                            + {{ t }}
                          </span>
                        </div>
                        <div v-if="item.note" class="mt-1 flex items-start gap-1">
                          <AlertCircle :size="8" class="text-orange-500 mt-0.5 flex-shrink-0" />
                          <span class="text-[9px] text-gray-500 font-bold italic">Ghi chú: {{ item.note }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap gap-4 pt-4">
                  <button
                    v-for="status in ['pending', 'processing', 'delivering', 'completed', 'cancelled'] as OrderStatus[]"
                    :key="status"
                    @click="confirmOrderStatusUpdate(order.id, status)"
                    :disabled="isUpdatingStatus"
                    class="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    :class="order.status === status ? getStatusColor(status) : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'"
                  >
                    {{ getStatusLabel(status) }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Infinite Scroll Observer Target -->
            <div ref="observerTarget" class="h-20 flex items-center justify-center">
              <div v-if="isLoadingOrders" class="flex items-center gap-3 text-orange-600 font-black uppercase tracking-widest text-[10px]">
                <div class="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                Đang tải thêm đơn hàng...
              </div>
              <div v-else-if="!hasMoreOrders && orders.length > 0" class="text-gray-400 font-black uppercase tracking-widest text-[10px]">
                Đã hiển thị tất cả đơn hàng
              </div>
            </div>
          </div>
        </div>

        <!-- Categories Tab -->
        <div v-if="activeTab === 'categories' && authStore.isAdmin" class="space-y-10">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div class="flex items-center gap-4">
              <h2 class="text-4xl font-black text-gray-900 uppercase tracking-tighter">QUẢN LÝ DANH MỤC</h2>
              <button 
                @click="refreshData" 
                :disabled="isRefreshing"
                class="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all disabled:opacity-50 flex-shrink-0"
                title="Làm mới dữ liệu"
              >
                <RefreshCw :size="16" :class="{ 'animate-spin': isRefreshing }" />
              </button>
            </div>
            
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-3 bg-gray-50 px-6 py-3 rounded-2xl flex-grow md:flex-grow-0">
                <Search :size="16" class="text-gray-400" />
                <input 
                  v-model="categorySearchInput" 
                  @keyup.enter="searchCategories"
                  type="text" 
                  placeholder="Tìm tên danh mục..." 
                  class="text-xs font-bold bg-transparent border-none focus:ring-0 w-full md:w-48"
                />
              </div>
              <button 
                @click="searchCategories"
                class="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all"
              >
                Tìm kiếm
              </button>
              <button 
                @click="openCategoryModal()" 
                class="w-12 h-12 flex items-center justify-center bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 flex-shrink-0"
                title="Thêm danh mục"
              >
                <Plus :size="24" />
              </button>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            <div
              v-for="cat in categories"
              :key="cat.id"
              class="bg-white rounded-[40px] overflow-hidden shadow-sm border border-gray-100 group hover:shadow-2xl transition-all duration-500"
            >
              <div class="h-40 overflow-hidden relative bg-orange-50 flex items-center justify-center">
                <img v-if="cat.image" :src="cat.image" alt="" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div v-else class="text-orange-200">
                  <Database :size="48" />
                </div>
                <div class="absolute top-6 right-6 flex gap-2">
                  <button @click="openCategoryModal(cat)" class="w-10 h-10 bg-white/90 backdrop-blur rounded-xl flex items-center justify-center text-gray-600 hover:text-orange-600 shadow-xl">
                    <Edit :size="18" />
                  </button>
                  <button @click="confirmDelete(cat.id, 'category')" class="w-10 h-10 bg-white/90 backdrop-blur rounded-xl flex items-center justify-center text-gray-600 hover:text-red-600 shadow-xl">
                    <Trash2 :size="18" />
                  </button>
                </div>
              </div>
              <div class="p-8">
                <h3 class="font-black text-xl text-gray-900 uppercase tracking-tight">{{ cat.name }}</h3>
                <p class="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Slug: {{ cat.slug }} • Thứ tự: {{ cat.order }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Products Tab -->
        <div v-if="activeTab === 'products' && authStore.isAdmin" class="space-y-10">
          <div class="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div class="flex items-center gap-4">
              <h2 class="text-4xl font-black text-gray-900 uppercase tracking-tighter">QUẢN LÝ SẢN PHẨM</h2>
              <button 
                @click="refreshData" 
                :disabled="isRefreshing"
                class="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all disabled:opacity-50 flex-shrink-0"
                title="Làm mới dữ liệu"
              >
                <RefreshCw :size="16" :class="{ 'animate-spin': isRefreshing }" />
              </button>
            </div>
            
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-3 bg-gray-50 px-6 py-3 rounded-2xl flex-grow md:flex-grow-0">
                <Search :size="16" class="text-gray-400" />
                <input 
                  v-model="productSearchInput" 
                  @keyup.enter="searchProducts"
                  type="text" 
                  placeholder="Tìm tên sản phẩm..." 
                  class="text-xs font-bold bg-transparent border-none focus:ring-0 w-full md:w-48"
                />
              </div>
              <div class="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-2xl">
                <Filter :size="14" class="text-gray-400" />
                <select v-model="productCategoryFilter" class="text-[10px] font-black uppercase tracking-widest bg-transparent border-none focus:ring-0 cursor-pointer w-full md:w-32">
                  <option value="">Tất cả danh mục</option>
                  <option v-for="cat in allCategories" :key="cat.id" :value="cat.slug">{{ cat.name }}</option>
                </select>
              </div>
              <button 
                @click="searchProducts"
                class="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all"
              >
                Tìm kiếm
              </button>
              <button 
                @click="openProductModal()" 
                class="w-12 h-12 flex items-center justify-center bg-orange-600 text-white rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 flex-shrink-0"
                title="Thêm sản phẩm"
              >
                <Plus :size="24" />
              </button>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            <div
              v-for="product in products"
              :key="product.id"
              class="bg-white rounded-[40px] overflow-hidden shadow-sm border border-gray-100 group hover:shadow-2xl transition-all duration-500"
            >
              <div class="h-60 overflow-hidden relative">
                <img :src="product.image" alt="" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div class="absolute top-6 left-6 flex flex-col gap-2">
                  <span v-if="product.isTrending" class="px-4 py-2 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-orange-600/30 flex items-center gap-2">
                    <Flame :size="12" /> Trending
                  </span>
                  <span v-if="!product.isAvailable" class="px-4 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg flex items-center gap-2">
                    <XCircle :size="12" /> Ngừng bán
                  </span>
                </div>
                <div class="absolute top-6 right-6 flex gap-2">
                  <button @click="openProductModal(product)" class="w-10 h-10 bg-white/90 backdrop-blur rounded-xl flex items-center justify-center text-gray-600 hover:text-orange-600 shadow-xl">
                    <Edit :size="18" />
                  </button>
                  <button @click="confirmDelete(product.id, 'product')" class="w-10 h-10 bg-white/90 backdrop-blur rounded-xl flex items-center justify-center text-gray-600 hover:text-red-600 shadow-xl">
                    <Trash2 :size="18" />
                  </button>
                </div>
              </div>
              <div class="p-8 space-y-4">
                <div class="flex justify-between items-start">
                  <h3 class="font-black text-xl text-gray-900 uppercase tracking-tight line-clamp-1">{{ product.name }}</h3>
                  <span class="text-2xl font-black text-orange-600 tracking-tighter">{{ product.price.toLocaleString() }}đ</span>
                </div>
                <p class="text-gray-500 text-xs font-bold uppercase tracking-widest">{{ product.category }}</p>
              </div>
            </div>
          </div>
          
          <div v-if="hasMoreProducts" class="flex justify-center mt-8">
            <button 
              @click="fetchProducts(true)"
              class="px-8 py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-3xl font-black text-sm uppercase tracking-widest hover:border-orange-600 hover:text-orange-600 transition-all"
            >
              Xem thêm
            </button>
          </div>
        </div>

        <!-- Vouchers Tab -->
        <div v-if="activeTab === 'vouchers' && authStore.isAdmin" class="space-y-10">
          <div class="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex-wrap gap-4">
            <div class="flex items-center gap-4">
              <h2 class="text-4xl font-black text-gray-900 uppercase tracking-tighter">MÃ GIẢM GIÁ</h2>
              <button 
                @click="refreshData" 
                :disabled="isRefreshing"
                class="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all disabled:opacity-50"
                title="Làm mới dữ liệu"
              >
                <RefreshCw :size="16" :class="{ 'animate-spin': isRefreshing }" />
              </button>
            </div>
            <button @click="openVoucherModal()" class="flex items-center gap-3 px-8 py-4 bg-orange-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30">
              <Plus :size="20" /> Tạo Voucher
            </button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
            <div
              v-for="voucher in vouchers"
              :key="voucher.id"
              class="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-6 relative overflow-hidden group hover:shadow-2xl transition-all duration-500"
            >
              <div class="flex justify-between items-start">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="text-2xl font-black text-orange-600 tracking-tighter">{{ voucher.code }}</span>
                    <span :class="['px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest', voucher.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400']">
                      {{ voucher.isActive ? 'Đang chạy' : 'Tạm dừng' }}
                    </span>
                  </div>
                  <p class="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    {{ voucher.discountType === 'percentage' ? `Giảm ${voucher.discountValue}%` : `Giảm ${voucher.discountValue.toLocaleString()}đ` }}
                  </p>
                </div>
                <div class="flex gap-2">
                  <button @click="openVoucherModal(voucher)" class="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 hover:text-orange-600 transition-colors">
                    <Edit :size="14" />
                  </button>
                  <button @click="confirmDelete(voucher.id, 'voucher')" class="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 :size="14" />
                  </button>
                </div>
              </div>

              <div class="space-y-4 pt-4 border-t border-gray-50">
                <div class="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span class="text-gray-400">Đã dùng</span>
                  <span class="text-gray-900">{{ voucher.usedCount }} / {{ voucher.maxUsage }}</span>
                </div>
                <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-orange-600 transition-all duration-1000" 
                    :style="{ width: `${(voucher.usedCount / voucher.maxUsage) * 100}%` }"
                  ></div>
                </div>
                <div class="flex items-center gap-2 text-[10px] text-gray-400 font-bold">
                  <Calendar :size="12" />
                  <span>{{ voucher.startDate.toDate().toLocaleDateString('vi-VN') }} - {{ voucher.endDate.toDate().toLocaleDateString('vi-VN') }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="hasMoreVouchers" class="flex justify-center mt-8">
            <button 
              @click="fetchVouchers(true)"
              class="px-8 py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-3xl font-black text-sm uppercase tracking-widest hover:border-orange-600 hover:text-orange-600 transition-all"
            >
              Xem thêm
            </button>
          </div>
        </div>

        <!-- Users Tab -->
        <div v-if="activeTab === 'users' && authStore.isAdmin" class="space-y-10">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div class="flex items-center gap-4">
              <h2 class="text-4xl font-black text-gray-900 uppercase tracking-tighter">NGƯỜI DÙNG</h2>
              <button 
                @click="refreshData" 
                :disabled="isRefreshing"
                class="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all disabled:opacity-50"
                title="Làm mới dữ liệu"
              >
                <RefreshCw :size="16" :class="{ 'animate-spin': isRefreshing }" />
              </button>
            </div>
            
            <!-- User Search -->
            <div class="w-full md:w-[500px] flex gap-2">
              <div class="relative group flex-1">
                <Search class="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-colors" :size="20" />
                <input 
                  v-model="userSearchInput"
                  @keyup.enter="searchUsers"
                  type="text" 
                  placeholder="Tìm tên, email, SĐT, vai trò, trạng thái..."
                  class="w-full pl-16 pr-6 py-4 bg-white border-none rounded-[32px] shadow-sm text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                />
              </div>
              <button 
                @click="searchUsers"
                class="px-8 py-4 bg-gray-900 text-white rounded-[32px] font-black text-sm uppercase tracking-widest hover:bg-orange-600 transition-colors shadow-sm"
              >
                Tìm
              </button>
            </div>
          </div>
          
          <div class="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr class="bg-gray-50 border-b border-gray-100">
                    <th class="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Người dùng</th>
                    <th class="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                    <th class="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Số điện thoại</th>
                    <th class="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vai trò</th>
                    <th class="p-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in users" :key="user.id" class="border-b border-gray-50 hover:bg-gray-50/50 transition-colors" :class="{'opacity-60': user.isLocked}">
                    <td class="p-8">
                      <div class="flex items-center gap-4">
                        <div class="w-12 h-12 rounded-2xl flex items-center justify-center font-black" :class="user.isLocked ? 'bg-gray-100 text-gray-400' : 'bg-orange-100 text-orange-600'">
                          {{ user.displayName?.charAt(0).toUpperCase() || 'U' }}
                        </div>
                        <span class="font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                          {{ user.displayName }}
                          <Lock v-if="user.isLocked" :size="14" class="text-red-500" />
                        </span>
                      </div>
                    </td>
                    <td class="p-8 text-sm font-bold text-gray-500">{{ user.email }}</td>
                    <td class="p-8 text-sm font-bold text-gray-500">{{ user.phoneNumber || '---' }}</td>
                    <td class="p-8">
                      <select 
                        :value="user.role"
                        @change="(e) => updateUserRole(user.id, (e.target as HTMLSelectElement).value as any)"
                        :disabled="isUpdatingUser || user.isLocked"
                        class="p-3 bg-gray-50 border-none rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-orange-600 disabled:opacity-50"
                      >
                        <option value="customer">Customer</option>
                        <option value="staff">Staff</option>
                        <option value="tablet">Tablet</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td class="p-8 text-center">
                      <button
                        @click="toggleUserLock(user.id, user.isLocked)"
                        :disabled="isUpdatingUser || user.id === authStore.user?.uid"
                        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50"
                        :class="!user.isLocked ? 'bg-green-500' : 'bg-gray-300'"
                        :title="!user.isLocked ? 'Đang hoạt động (Nhấn để khóa)' : 'Đã khóa (Nhấn để mở)'"
                      >
                        <span
                          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                          :class="!user.isLocked ? 'translate-x-6' : 'translate-x-1'"
                        />
                      </button>
                    </td>
                  </tr>
                  <tr v-if="users.length === 0">
                    <td colspan="5" class="p-20 text-center">
                      <div class="flex flex-col items-center gap-4 text-gray-400">
                        <Users :size="48" />
                        <p class="font-black uppercase tracking-widest text-xs">Không tìm thấy người dùng nào</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- User Pagination -->
            <div v-if="userPage > 1 || hasMoreUsers" class="p-8 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Trang {{ userPage }}
              </p>
              <div class="flex gap-2">
                <button 
                  @click="fetchUsers(userPage - 1)" 
                  :disabled="userPage === 1"
                  class="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-all"
                >
                  <ChevronRight class="rotate-180" :size="18" />
                </button>
                <button 
                  @click="fetchUsers(userPage + 1)" 
                  :disabled="!hasMoreUsers"
                  class="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-all"
                >
                  <ChevronRight :size="18" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Calendar Tab -->
        <div v-if="activeTab === 'calendar' && authStore.isAdmin">
          <AdminCalendar />
        </div>

        <!-- Settings Tab -->
        <div v-if="activeTab === 'settings' && authStore.isAdmin" class="space-y-10">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div class="flex items-center gap-4">
              <h2 class="text-4xl font-black text-gray-900 uppercase tracking-tighter">CỬA HÀNG</h2>
              <button 
                @click="refreshData" 
                :disabled="isRefreshing"
                class="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all disabled:opacity-50"
                title="Làm mới dữ liệu"
              >
                <RefreshCw :size="16" :class="{ 'animate-spin': isRefreshing }" />
              </button>
            </div>
            <button 
              @click="saveStoreInfo"
              :disabled="isSavingStoreInfo"
              class="flex items-center gap-3 px-8 py-4 bg-orange-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 disabled:opacity-50"
            >
              <div v-if="isSavingStoreInfo" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span v-else>Lưu thông tin</span>
            </button>
          </div>

          <div class="bg-white p-10 rounded-[50px] shadow-sm border border-gray-100 space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-3">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tên cửa hàng</label>
                <input 
                  v-model="storeInfo.name" 
                  type="text" 
                  class="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                  placeholder="The Coffee House"
                />
              </div>
              <div class="space-y-3">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số điện thoại</label>
                <input 
                  v-model="storeInfo.phone" 
                  type="text" 
                  class="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                  placeholder="0123456789"
                />
              </div>
              <div class="space-y-3 md:col-span-2">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Địa chỉ</label>
                <input 
                  v-model="storeInfo.address" 
                  type="text" 
                  class="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                  placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                />
              </div>
              <div class="space-y-3">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Facebook (Link)</label>
                <input 
                  v-model="storeInfo.facebook" 
                  type="text" 
                  class="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div class="space-y-3">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Instagram (Link)</label>
                <input 
                  v-model="storeInfo.instagram" 
                  type="text" 
                  class="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div class="space-y-3 md:col-span-2">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Google Sheets Web App URL (Hook)</label>
                <input 
                  v-model="storeInfo.googleSheetsHookUrl" 
                  type="text" 
                  class="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
                <p class="text-[9px] text-gray-400 font-bold italic">Dùng để đồng bộ đơn hàng sang Google Sheets mà không tốn quota Cloud Functions.</p>
              </div>
              <div class="space-y-3 md:col-span-2">
                <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Google Sheets Dashboard URL</label>
                <input 
                  v-model="storeInfo.googleSheetsDashboardUrl" 
                  type="text" 
                  class="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                  placeholder="https://docs.google.com/spreadsheets/d/.../htmlembed"
                />
                <p class="text-[9px] text-gray-400 font-bold italic">Dùng để nhúng màn hình thống kê từ Google Sheets vào trang tổng quan.</p>
              </div>
            </div>

            <div class="pt-8 border-t border-gray-100 space-y-8">
              <h3 class="text-xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
                <CreditCard :size="24" class="text-orange-600" />
                Thông tin chuyển khoản
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-3">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ngân hàng</label>
                  <input 
                    v-model="storeInfo.bankName" 
                    type="text" 
                    class="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                    placeholder="Vietcombank, Techcombank..."
                  />
                </div>
                <div class="space-y-3">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Số tài khoản</label>
                  <input 
                    v-model="storeInfo.bankAccount" 
                    type="text" 
                    class="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                    placeholder="0123456789"
                  />
                </div>
                <div class="space-y-3">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chủ tài khoản</label>
                  <input 
                    v-model="storeInfo.bankOwner" 
                    type="text" 
                    class="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                    placeholder="NGUYEN VAN A"
                  />
                </div>
                <div class="space-y-3">
                  <div class="flex items-center justify-between">
                    <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base URL tạo QR / Link ảnh QR tĩnh</label>
                    <div class="flex items-center gap-4 text-xs font-bold text-gray-600">
                      <label class="flex items-center gap-1 cursor-pointer hover:text-orange-600">
                        <input type="radio" v-model="storeInfo.bankQRType" value="static" class="text-orange-600 focus:ring-orange-600"> QR chính chủ (Tĩnh)
                      </label>
                      <label class="flex items-center gap-1 cursor-pointer hover:text-orange-600">
                        <input type="radio" v-model="storeInfo.bankQRType" value="dynamic" class="text-orange-600 focus:ring-orange-600"> QR sinh số tiền (Động)
                      </label>
                    </div>
                  </div>
                  <input 
                    v-model="storeInfo.bankQR" 
                    type="text" 
                    class="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all block"
                    placeholder="VD: https://qr.sepay.vn/img?acc=SO_TAI_KHOAN&bank=NGAN_HANG&amount=SO_TIEN&des=NOI_DUNG&template=qronly"
                  />
                </div>
              </div>
            </div>

            <div class="pt-8 border-t border-gray-100">
              <h3 class="text-xl font-black text-gray-900 uppercase tracking-tighter mb-6 flex items-center gap-3">
                <div class="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                  <RefreshCw :size="16" />
                </div>
                Cấu hình Telegram Notification
              </h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="space-y-3">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Telegram Bot Token</label>
                  <input 
                    v-model="storeInfo.telegramBotToken" 
                    type="password" 
                    class="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                    placeholder="8761492398:AAEy..."
                  />
                </div>
                <div class="space-y-3">
                  <label class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Telegram Chat ID</label>
                  <input 
                    v-model="storeInfo.telegramChatId" 
                    type="text" 
                    class="w-full p-5 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-orange-600 transition-all"
                    placeholder="-5100597407"
                  />
                </div>
              </div>
              <p class="mt-4 text-xs text-gray-500 italic">* Thông tin này dùng để gửi thông báo đơn hàng mới qua Telegram và sẽ không hiển thị trên hóa đơn in.</p>
            </div>
          </div>
        </div>

        <!-- Cache Management Tab -->
        <div v-if="activeTab === 'cache' && authStore.isAdmin" class="space-y-10">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div class="flex items-center gap-4">
              <h2 class="text-4xl font-black text-gray-900 uppercase tracking-tighter">QUẢN LÝ CACHE</h2>
              <button 
                @click="refreshData" 
                :disabled="isRefreshing"
                class="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all disabled:opacity-50"
                title="Làm mới dữ liệu"
              >
                <RefreshCw :size="16" :class="{ 'animate-spin': isRefreshing }" />
              </button>
            </div>
            <button 
              @click="clearCustomerCache" 
              :disabled="isClearingCache"
              class="flex items-center gap-3 px-8 py-4 bg-orange-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 disabled:opacity-50"
            >
              <div v-if="isClearingCache" class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span v-else>Cập nhật Cache Khách</span>
            </button>
          </div>

          <div class="bg-white p-10 rounded-[50px] shadow-sm border border-gray-100 space-y-8">
            <div class="space-y-6">
              <div>
                <h3 class="text-xl font-black text-gray-900 tracking-tight mb-2">Cấu hình cập nhật Cache</h3>
                <p class="text-sm text-gray-500">Chọn cách thức cập nhật dữ liệu (sản phẩm, danh mục) cho phía khách hàng. Việc sử dụng cache giúp giảm thiểu số lượt đọc (reads) trên Firebase.</p>
              </div>

              <div class="space-y-4">
                <label class="flex items-start gap-4 p-5 rounded-3xl border-2 cursor-pointer transition-all"
                       :class="cacheConfig.autoUpdate ? 'border-orange-600 bg-orange-50/50' : 'border-gray-100 hover:border-gray-200'">
                  <div class="mt-1">
                    <input type="radio" :value="true" v-model="cacheConfig.autoUpdate" @change="updateCacheMode(true)" class="w-5 h-5 text-orange-600 border-gray-300 focus:ring-orange-600" />
                  </div>
                  <div>
                    <p class="font-bold text-gray-900">Tự động (Khuyên dùng)</p>
                    <p class="text-sm text-gray-500 mt-1">Mỗi khi bạn thêm, sửa, hoặc xóa Sản phẩm / Danh mục, hệ thống sẽ tự động yêu cầu khách hàng tải lại dữ liệu mới nhất.</p>
                  </div>
                </label>

                <label class="flex items-start gap-4 p-5 rounded-3xl border-2 cursor-pointer transition-all"
                       :class="!cacheConfig.autoUpdate ? 'border-orange-600 bg-orange-50/50' : 'border-gray-100 hover:border-gray-200'">
                  <div class="mt-1">
                    <input type="radio" :value="false" v-model="cacheConfig.autoUpdate" @change="updateCacheMode(false)" class="w-5 h-5 text-orange-600 border-gray-300 focus:ring-orange-600" />
                  </div>
                  <div>
                    <p class="font-bold text-gray-900">Thủ công</p>
                    <p class="text-sm text-gray-500 mt-1">Khách hàng sẽ luôn thấy dữ liệu cũ cho đến khi bạn chủ động bấm nút "Cập nhật Cache Khách" ở phía trên.</p>
                  </div>
                </label>
              </div>

              <div class="pt-6 border-t border-gray-100">
                <p class="text-sm text-gray-500">
                  <span class="font-bold text-gray-900">Lần cập nhật cache cuối:</span> 
                  {{ cacheConfig.lastUpdated ? (cacheConfig.lastUpdated.toDate ? cacheConfig.lastUpdated.toDate().toLocaleString('vi-VN') : new Date(cacheConfig.lastUpdated).toLocaleString('vi-VN')) : 'Chưa có thông tin' }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Notes Tab -->
        <div v-if="activeTab === 'notes' && authStore.isAdmin" class="space-y-10">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div class="flex items-center gap-4">
              <h2 class="text-4xl font-black text-gray-900 uppercase tracking-tighter">GHI CHÚ NHANH</h2>
              <button 
                @click="refreshData" 
                :disabled="isRefreshing"
                class="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition-all disabled:opacity-50 flex-shrink-0"
                title="Làm mới dữ liệu"
              >
                <RefreshCw :size="16" :class="{ 'animate-spin': isRefreshing }" />
              </button>
            </div>
            
            <button 
              @click="openQuickNoteModal()" 
              class="flex items-center gap-3 px-8 py-4 bg-orange-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 flex-shrink-0"
              title="Thêm ghi chú nhanh"
            >
              <Plus :size="20" /> Thêm ghi chú
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div
              v-for="note in quickNotes"
              :key="note.id"
              class="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 group hover:shadow-2xl transition-all duration-500 relative"
            >
              <p class="font-bold text-gray-900 leading-relaxed text-lg pr-12">{{ note.text }}</p>
              
              <div class="absolute top-6 right-6 flex flex-col gap-2 scale-50 group-hover:scale-100 opacity-0 group-hover:opacity-100 transition-all">
                <button @click="openQuickNoteModal(note)" class="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-orange-600 shadow-xl">
                  <Edit :size="18" />
                </button>
                <button @click="deleteQuickNote(note.id)" class="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-600 shadow-xl">
                  <Trash2 :size="18" />
                </button>
              </div>
            </div>

            <div v-if="quickNotes.length === 0" class="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-6 bg-white rounded-[50px] shadow-sm border border-gray-100 italic text-gray-400">
               <AlertCircle :size="48" />
               <p class="font-black uppercase tracking-widest text-xs">Chưa có ghi chú nhanh nào</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Category Modal -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isCategoryModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeCategoryModal"></div>
        <div class="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
          <div class="p-8 border-b border-gray-100 flex justify-between items-center">
            <h3 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">
              {{ editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới' }}
            </h3>
            <button @click="closeCategoryModal" class="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <XCircle :size="24" class="text-gray-400" />
            </button>
          </div>

          <div class="p-8 space-y-6">
            <div class="space-y-4">
              <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Tên danh mục</label>
              <input v-model="categoryForm.name" type="text" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" placeholder="Ví dụ: Cà phê" />
            </div>
            <div class="space-y-4">
              <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Slug (định danh)</label>
              <input v-model="categoryForm.slug" type="text" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" placeholder="Ví dụ: ca-phe" />
            </div>
            <div class="space-y-4">
              <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Thứ tự hiển thị</label>
              <input v-model.number="categoryForm.order" type="number" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" />
            </div>
            <div class="space-y-4">
              <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">URL Hình ảnh (Tùy chọn)</label>
              <input v-model="categoryForm.image" type="text" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" placeholder="https://..." />
            </div>
          </div>

          <div class="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
            <button @click="closeCategoryModal" :disabled="isSavingCategory" class="flex-grow py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all disabled:opacity-50">
              Hủy
            </button>
            <button @click="saveCategory" :disabled="isSavingCategory" class="flex-grow py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 disabled:opacity-50 flex items-center justify-center gap-2">
              <div v-if="isSavingCategory" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {{ isSavingCategory ? 'Đang lưu...' : 'Lưu danh mục' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isProductModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeProductModal"></div>
        <div class="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div class="p-8 border-b border-gray-100 flex justify-between items-center">
            <h3 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">
              {{ editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới' }}
            </h3>
            <button @click="closeProductModal" class="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <XCircle :size="24" class="text-gray-400" />
            </button>
          </div>

          <div class="flex-grow overflow-y-auto p-8 space-y-8 no-scrollbar">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-4">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Tên sản phẩm</label>
                <input v-model="productForm.name" type="text" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" placeholder="Ví dụ: Cà phê sữa đá" />
              </div>
              <div class="space-y-4">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Giá cơ bản (đ)</label>
                <input v-model.number="productForm.price" type="number" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-4">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Danh mục</label>
                <select v-model="productForm.category" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600">
                  <option value="">Chọn danh mục</option>
                  <option v-for="cat in categories" :key="cat.id" :value="cat.slug">{{ cat.name }}</option>
                </select>
              </div>
              <div class="space-y-4">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">URL Hình ảnh</label>
                <input v-model="productForm.image" type="text" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" placeholder="https://..." />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-4">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Trạng thái kinh doanh</label>
                <div class="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <button 
                    @click="productForm.isAvailable = !productForm.isAvailable"
                    class="w-12 h-6 rounded-full transition-colors relative"
                    :class="productForm.isAvailable ? 'bg-green-500' : 'bg-gray-300'"
                  >
                    <div 
                      class="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
                      :class="productForm.isAvailable ? 'left-7' : 'left-1'"
                    ></div>
                  </button>
                  <span class="text-sm font-bold text-gray-700">{{ productForm.isAvailable ? 'Đang bán' : 'Ngừng bán' }}</span>
                </div>
              </div>
              <div class="space-y-4">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Sản phẩm Trending</label>
                <div class="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <button 
                    @click="productForm.isTrending = !productForm.isTrending"
                    class="w-12 h-6 rounded-full transition-colors relative"
                    :class="productForm.isTrending ? 'bg-orange-500' : 'bg-gray-300'"
                  >
                    <div 
                      class="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
                      :class="productForm.isTrending ? 'left-7' : 'left-1'"
                    ></div>
                  </button>
                  <span class="text-sm font-bold text-gray-700">{{ productForm.isTrending ? 'Đang Trending' : 'Bình thường' }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Mô tả</label>
              <textarea v-model="productForm.description" rows="3" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" placeholder="Mô tả về sản phẩm..."></textarea>
            </div>

            <div class="space-y-4">
              <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Ghi chú cho shop (Nội bộ)</label>
              <textarea v-model="productForm.shopNotes" rows="2" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" placeholder="Ví dụ: Chỉ bán buổi sáng, cần chuẩn bị kỹ..."></textarea>
            </div>

            <!-- Sizes -->
            <div class="space-y-4">
              <div class="flex justify-between items-center">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Biến thể Size</label>
                <button @click="addSize" class="text-orange-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1">
                  <Plus :size="14" /> Thêm size
                </button>
              </div>
              <div class="space-y-3">
                <div v-for="(size, index) in productForm.options.sizes" :key="index" class="flex gap-3 items-center">
                  <input v-model="size.name" type="text" placeholder="Tên size (M, L...)" class="flex-grow p-3 bg-gray-50 border-none rounded-xl font-bold text-sm" />
                  <input v-model.number="size.price" type="number" placeholder="+ Giá" class="w-32 p-3 bg-gray-50 border-none rounded-xl font-bold text-sm" />
                  <button @click="removeSize(index)" class="p-2 text-gray-400 hover:text-red-600">
                    <Trash2 :size="18" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Toppings -->
            <div class="space-y-4">
              <div class="flex justify-between items-center">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Toppings</label>
                <div class="flex gap-4">
                  <button @click="openCopyToppingModal" class="text-blue-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 group">
                    <Copy :size="14" class="group-hover:scale-110 transition-transform" /> Sao chép từ SP khác
                  </button>
                  <button @click="addTopping" class="text-orange-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1 group">
                    <Plus :size="14" class="group-hover:scale-110 transition-transform" /> Thêm topping
                  </button>
                </div>
              </div>
              <div class="space-y-3">
                <div v-for="(topping, index) in productForm.options.toppings" :key="index" class="flex gap-3 items-center">
                  <input v-model="topping.name" type="text" placeholder="Tên topping" class="flex-grow p-3 bg-gray-50 border-none rounded-xl font-bold text-sm" />
                  <input v-model.number="topping.price" type="number" placeholder="+ Giá" class="w-32 p-3 bg-gray-50 border-none rounded-xl font-bold text-sm" />
                  <button @click="removeTopping(index)" class="p-2 text-gray-400 hover:text-red-600">
                    <Trash2 :size="18" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
            <button @click="closeProductModal" :disabled="isSavingProduct" class="flex-grow py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all disabled:opacity-50">
              Hủy
            </button>
            <button @click="saveProduct" :disabled="isSavingProduct" class="flex-grow py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 disabled:opacity-50 flex items-center justify-center gap-2">
              <div v-if="isSavingProduct" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {{ isSavingProduct ? 'Đang lưu...' : 'Lưu sản phẩm' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Voucher Modal -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isVoucherModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeVoucherModal"></div>
        <div class="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div class="p-8 border-b border-gray-100 flex justify-between items-center">
            <h3 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">
              {{ editingVoucher ? 'Sửa Voucher' : 'Tạo Voucher mới' }}
            </h3>
            <button @click="closeVoucherModal" class="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <XCircle :size="24" class="text-gray-400" />
            </button>
          </div>

          <div class="flex-grow overflow-y-auto p-8 space-y-8 no-scrollbar">
            <div class="space-y-4">
              <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Mã Voucher (6 ký tự)</label>
              <div class="flex gap-4">
                <input v-model="voucherForm.code" type="text" maxlength="6" class="flex-grow p-4 bg-gray-50 border-none rounded-2xl font-black text-xl text-orange-600 uppercase tracking-widest focus:ring-2 focus:ring-orange-600" />
                <button @click="generateVoucherCode" class="px-6 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">
                  Random
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-4">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Loại giảm giá</label>
                <select v-model="voucherForm.discountType" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600">
                  <option value="percentage">Phần trăm (%)</option>
                  <option value="fixed">Số tiền cố định (đ)</option>
                </select>
              </div>
              <div class="space-y-4">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Giá trị giảm</label>
                <input v-model.number="voucherForm.discountValue" type="number" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-4">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Đơn tối thiểu (đ)</label>
                <input v-model.number="voucherForm.minOrderAmount" type="number" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" />
              </div>
              <div class="space-y-4">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Lượt dùng tối đa</label>
                <input v-model.number="voucherForm.maxUsage" type="number" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div class="space-y-4">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Ngày bắt đầu</label>
                <input v-model="voucherForm.startDate" type="date" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" />
              </div>
              <div class="space-y-4">
                <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Ngày kết thúc</label>
                <input v-model="voucherForm.endDate" type="date" class="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-2 focus:ring-orange-600" />
              </div>
            </div>

            <div class="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
              <button 
                @click="voucherForm.isActive = !voucherForm.isActive"
                class="w-12 h-6 rounded-full transition-colors relative"
                :class="voucherForm.isActive ? 'bg-green-500' : 'bg-gray-300'"
              >
                <div 
                  class="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
                  :class="voucherForm.isActive ? 'left-7' : 'left-1'"
                ></div>
              </button>
              <span class="text-sm font-bold text-gray-700">{{ voucherForm.isActive ? 'Đang kích hoạt' : 'Tạm dừng' }}</span>
            </div>
          </div>

          <div class="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
            <button @click="closeVoucherModal" :disabled="isSavingVoucher" class="flex-grow py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all disabled:opacity-50">
              Hủy
            </button>
            <button @click="saveVoucher" :disabled="isSavingVoucher" class="flex-grow py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 disabled:opacity-50 flex items-center justify-center gap-2">
              <div v-if="isSavingVoucher" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {{ isSavingVoucher ? 'Đang lưu...' : 'Lưu Voucher' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Status Confirmation Modal -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isStatusConfirmOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="isStatusConfirmOpen = false"></div>
        <div class="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 text-center space-y-8">
          <div class="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto">
            <AlertCircle :size="40" />
          </div>
          <div class="space-y-2">
            <h3 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">Xác nhận thay đổi?</h3>
            <p class="text-gray-500 font-medium text-sm">Bạn có chắc chắn muốn chuyển trạng thái đơn hàng này thành <strong class="text-orange-600 uppercase">{{ getStatusLabel(pendingStatusUpdate?.status) }}</strong>?</p>
          </div>
          <div class="space-y-4">
            <button 
              @click="executeStatusUpdate" 
              :disabled="isUpdatingStatus"
              class="w-full py-5 bg-orange-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <CheckCircle v-if="!isUpdatingStatus" :size="20" />
              <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {{ isUpdatingStatus ? 'Đang cập nhật...' : 'Xác nhận' }}
            </button>
            <button 
              @click="isStatusConfirmOpen = false" 
              :disabled="isUpdatingStatus"
              class="w-full py-5 bg-gray-100 text-gray-600 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Delete Confirmation Modal -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isDeleteConfirmOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="isDeleteConfirmOpen = false"></div>
        <div class="relative bg-white w-full max-w-sm rounded-[40px] shadow-2xl p-10 text-center space-y-8">
          <div class="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto">
            <AlertCircle :size="40" />
          </div>
          <div class="space-y-2">
            <h3 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">Xác nhận xóa?</h3>
            <p class="text-gray-500 font-medium text-sm">Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa sản phẩm này?</p>
          </div>
          <div class="space-y-4">
            <button 
              @click="executeDelete" 
              :disabled="isDeleting"
              class="w-full py-5 bg-red-600 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <Trash2 v-if="!isDeleting" :size="20" />
              <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {{ isDeleting ? 'Đang xóa...' : 'Xác nhận xóa' }}
            </button>
            <button 
              @click="isDeleteConfirmOpen = false" 
              :disabled="isDeleting"
              class="w-full py-5 bg-gray-100 text-gray-600 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Printable Label Container (50x30mm) -->
    <div v-if="orderForLabels" class="hidden print:block">
      <div v-for="(item, i) in orderForLabels.items" :key="i" class="print-label-page">
        <div class="print-label-content">
          <!-- Item Header -->
          <div class="flex justify-between items-start border-b border-black pb-1 mb-1">
            <span class="font-black text-[12px] leading-tight break-words flex-grow pr-1">
              {{ item.quantity }}x {{ item.name }}
            </span>
            <span class="font-bold text-[10px] whitespace-nowrap">({{ item.size }})</span>
          </div>
          
          <!-- Price Info -->
          <div class="flex justify-end text-[9px] mb-1 font-bold italic opacity-80">
            <span>{{ (item.price * item.quantity).toLocaleString() }}đ</span>
          </div>

          <!-- Toppings -->
          <div v-if="item.toppings?.length" class="text-[9px] leading-none mb-1 font-bold">
            <span class="uppercase text-[8px]">Topping:</span> {{ item.toppings.join(', ') }}
          </div>

          <!-- Note -->
          <div v-if="item.note" class="text-[9px] leading-[1.1] border-t border-dotted border-gray-400 pt-1 mt-auto font-medium">
            <span class="font-black uppercase text-[8px]">Ghi chú:</span> {{ item.note }}
          </div>
        </div>
      </div>
    </div>

    <!-- Printable Order Receipt -->
    <div id="print-area"
        v-if="orderToPrint"
        class="hidden print:block bg-white text-black w-[74mm] px-3 py-4 mx-auto text-[12px] leading-tight">

      <!-- HEADER -->
      <div class="text-center mb-3 border-b border-gray-400 pb-2">
        <h1 class="text-[16px] font-black uppercase">{{ storeInfo.name || 'Hi chibi' }}</h1>
        <p class="text-[11px] font-bold text-orange-600 uppercase">Bingsu & Drinks</p>
        <p class="text-[11px]">{{ storeInfo.address || 'Địa chỉ cửa hàng' }}</p>
        <p class="text-[11px] font-bold">SĐT: {{ storeInfo.phone || '---' }}</p>
        <div v-if="storeInfo.facebook || storeInfo.instagram"
            class="text-[11px] mt-1 font-medium">
          <span v-if="storeInfo.facebook">FB: {{ storeInfo.facebook }}</span>
          <span v-if="storeInfo.facebook && storeInfo.instagram"> | </span>
          <span v-if="storeInfo.instagram">IG: {{ storeInfo.instagram }}</span>
        </div>
      </div>

      <!-- INFO -->
      <div class="mb-3 space-y-1">
        <h2 class="text-[14px] font-black text-center mb-2">HÓA ĐƠN</h2>

        <div class="flex justify-between">
          <span class="font-bold">Mã:</span>
          <span>#{{ orderToPrint.id.slice(-8).toUpperCase() }}</span>
        </div>

        <div class="flex justify-between">
          <span class="font-bold">Ngày:</span>
          <span>{{ orderToPrint.createdAt.toDate().toLocaleString('vi-VN') }}</span>
        </div>

        <div class="flex justify-between">
          <span class="font-bold">Khách:</span>
          <span>{{ orderToPrint.customerName }}</span>
        </div>
      </div>

      <!-- TABLE -->
      <div class="border-t border-b border-gray-400 py-2 mb-3">
        <table class="w-full text-[12px]">
          <thead>
            <tr class="border-b border-gray-300">
              <th class="text-left py-1">Món</th>
              <th class="text-center py-1 w-8">SL</th>
              <th class="text-right py-1 w-16">Tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in orderToPrint.items" :key="i" class="border-b border-gray-200">
              <td class="py-2 pr-1">
                <div class="font-bold text-[13px]">{{ item.name }} ({{ item.size }})</div>
                <div v-if="item.toppings?.length" class="text-[11px]">
                  + {{ item.toppings.join(', ') }}
                </div>
              </td>
              <td class="text-center font-bold">{{ item.quantity }}</td>
              <td class="text-right font-bold">
                {{ (item.price * item.quantity).toLocaleString() }}đ
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- TOTAL -->
      <div class="space-y-1 mb-4">
        <div v-if="orderToPrint.discountAmount" class="flex justify-between text-[12px]">
          <span>Giảm:</span>
          <span class="font-bold">-{{ orderToPrint.discountAmount.toLocaleString() }}đ</span>
        </div>

        <div class="flex justify-between text-[15px] font-black border-t border-gray-400 pt-2">
          <span>TỔNG:</span>
          <span>{{ (orderToPrint.totalAmount || 0).toLocaleString() }}đ</span>
        </div>
      </div>

      <!-- BANK -->
      <div v-if="storeInfo.bankName && storeInfo.bankAccount"
          class="border-t border-gray-400 pt-3 mb-4 text-center">

        <h3 class="text-[13px] font-black mb-2">CHUYỂN KHOẢN</h3>

        <p class="text-[12px] font-bold">{{ storeInfo.bankName }}</p>
        <p class="text-[13px] font-black">{{ storeInfo.bankAccount }}</p>
        <p class="text-[12px]">{{ storeInfo.bankOwner }}</p>

        <!-- QR to hơn -->
        <img v-if="getBankQRUrl()"
            :src="getBankQRUrl()"
            class="w-[140px] h-[140px] mx-auto mt-2 object-contain border" />
      </div>

      <!-- FOOTER -->
      <div class="text-center text-[11px] mt-3 font-semibold">
        Cảm ơn quý khách ❤️
      </div>
    </div>


    <!-- Quick Note Modal -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isQuickNoteModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="isQuickNoteModalOpen = false"></div>
        <div class="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
          <div class="p-8 border-b border-gray-100 flex justify-between items-center">
            <h3 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">
              {{ editingNote ? 'Sửa ghi chú' : 'Thêm ghi chú nhanh' }}
            </h3>
            <button @click="isQuickNoteModalOpen = false" class="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <XCircle :size="24" class="text-gray-400" />
            </button>
          </div>

          <div class="p-8 space-y-6">
            <div class="space-y-4">
              <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest">Nội dung ghi chú</label>
              <textarea 
                v-model="quickNoteForm.text" 
                rows="4"
                class="w-full p-4 bg-gray-50 border-none rounded-3xl font-bold focus:ring-2 focus:ring-orange-600 no-scrollbar" 
                placeholder="Ví dụ: Ít đường, Không đá..."
              ></textarea>
            </div>
          </div>

          <div class="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
            <button @click="isQuickNoteModalOpen = false" :disabled="isSavingNote" class="flex-grow py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all disabled:opacity-50">
              Hủy
            </button>
            <button @click="saveQuickNote" :disabled="isSavingNote" class="flex-grow py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 disabled:opacity-50 flex items-center justify-center gap-2">
              <div v-if="isSavingNote" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {{ isSavingNote ? 'Đang lưu...' : 'Lưu ghi chú' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Copy Topping Modal -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="isCopyToppingModalOpen" class="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="isCopyToppingModalOpen = false"></div>
        <div class="relative bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
          <div class="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 class="text-xl font-black text-gray-900 uppercase tracking-tighter">Sao chép Topping</h3>
              <p class="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Chọn từ danh sách các topping đã có</p>
            </div>
            <button @click="isCopyToppingModalOpen = false" class="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <XCircle :size="24" class="text-gray-400" />
            </button>
          </div>

          <div class="p-6 border-b border-gray-100">
            <div class="flex items-center gap-3 bg-gray-50 px-5 py-3 rounded-2xl">
              <Search :size="16" class="text-gray-400" />
              <input 
                v-model="toppingSearchQuery" 
                type="text" 
                placeholder="Tìm tên topping..." 
                class="text-sm font-bold bg-transparent border-none focus:ring-0 w-full"
              />
            </div>
          </div>

          <div class="flex-grow overflow-y-auto p-6 space-y-2 no-scrollbar">
            <div v-if="availableUniqueToppings.length === 0" class="text-center py-10">
              <Database :size="40" class="mx-auto text-gray-200 mb-4" />
              <p class="text-gray-400 font-bold text-sm">Không tìm thấy topping nào</p>
            </div>
            <button 
              v-for="topping in availableUniqueToppings" 
              :key="topping.name + topping.price"
              @click="toggleToppingSelection(topping)"
              class="w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group"
              :class="selectedToppingsToCopy.some(t => t.name === topping.name) 
                ? 'border-orange-600 bg-orange-50' 
                : 'border-gray-50 hover:border-gray-200 bg-white'"
            >
              <div class="flex flex-col items-start">
                <span class="font-black text-sm uppercase tracking-tight" :class="selectedToppingsToCopy.some(t => t.name === topping.name) ? 'text-orange-600' : 'text-gray-900'">
                  {{ topping.name }}
                </span>
                <span class="text-[10px] text-gray-400 font-bold italic">Từ: {{ topping.fromProduct }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="font-black text-sm text-gray-900">+{{ topping.price.toLocaleString() }}đ</span>
                <div 
                  class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                  :class="selectedToppingsToCopy.some(t => t.name === topping.name) 
                    ? 'bg-orange-600 border-orange-600 text-white' 
                    : 'border-gray-200 group-hover:border-gray-300'"
                >
                  <CheckCircle v-if="selectedToppingsToCopy.some(t => t.name === topping.name)" :size="14" />
                </div>
              </div>
            </button>
          </div>

          <div class="p-6 bg-gray-50 border-t border-gray-100 flex gap-4">
            <button @click="isCopyToppingModalOpen = false" class="flex-grow py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all">
              Hủy
            </button>
            <button 
              @click="applyCopiedToppings" 
              :disabled="selectedToppingsToCopy.length === 0"
              class="flex-grow py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/30 disabled:opacity-50"
            >
              Chọn {{ selectedToppingsToCopy.length }} Topping
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
@media print {
  @page {
    margin: 0;
  }
  
  html, body {
    margin: 0;
    padding: 0;
    background: white;
  }

  /* Specific styles for Receipt */
  #print-area {
    width: 74mm;
    margin: 0 auto;
  }

  /* Specific styles for Labels */
  .print-label-page {
    width: 50mm;
    height: 30mm;
    padding: 2mm 3mm;
    page-break-after: always;
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    color: black !important;
  }

  .print-label-content {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* Hide scrollbars during print */
  ::-webkit-scrollbar {
    display: none;
  }
}
</style>

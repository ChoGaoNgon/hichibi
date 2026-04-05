<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { 
  User, 
  Phone, 
  MapPin, 
  ArrowLeft, 
  Camera, 
  Mail, 
  ShieldCheck,
  Save,
  LogOut
} from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { toast } from 'vue-sonner';

const authStore = useAuthStore();
const router = useRouter();

const form = ref({
  displayName: authStore.profile?.displayName || '',
  phoneNumber: authStore.profile?.phoneNumber || '',
  address: authStore.profile?.address || ''
});

const isSaving = ref(false);

// Watch for profile changes to update form
watch(() => authStore.profile, (newProfile) => {
  if (newProfile) {
    form.value = {
      displayName: newProfile.displayName || '',
      phoneNumber: newProfile.phoneNumber || '',
      address: newProfile.address || ''
    };
  }
}, { immediate: true });

const handleSave = async () => {
  if (!form.value.displayName) {
    toast.error('Vui lòng nhập tên hiển thị');
    return;
  }
  
  isSaving.value = true;
  try {
    await authStore.updateProfile(form.value);
  } finally {
    isSaving.value = false;
  }
};

const handleLogout = async () => {
  await authStore.logout();
};
</script>

<template>
  <div class="min-h-screen bg-[#FFF8F6] flex flex-col max-w-md mx-auto relative shadow-2xl overflow-hidden">
    <!-- Header -->
    <header class="px-6 pt-8 pb-4 flex items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <button @click="router.back()" class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-900 shadow-sm border border-gray-100">
        <ArrowLeft :size="20" />
      </button>
      <h1 class="text-xl font-black text-gray-900 uppercase tracking-tighter">Thông tin cá nhân</h1>
    </header>

    <div class="flex-grow overflow-y-auto p-6 no-scrollbar pb-32">
      <div v-if="!authStore.user" class="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
          <User :size="48" />
        </div>
        <div class="space-y-2">
          <h2 class="text-xl font-black text-gray-900 uppercase tracking-tighter">BẠN CHƯA ĐĂNG NHẬP</h2>
          <p class="text-gray-400 text-sm font-medium">Vui lòng đăng nhập để cập nhật thông tin cá nhân.</p>
        </div>
        <button
          @click="authStore.login()"
          class="w-full py-4 bg-[#C04D1E] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#C04D1E]/30"
        >
          Đăng nhập ngay
        </button>
      </div>

      <div v-else class="space-y-8">
        <!-- Avatar Section -->
        <div class="flex flex-col items-center space-y-4">
          <div class="relative">
            <div class="w-32 h-32 rounded-[40px] overflow-hidden border-4 border-white shadow-2xl">
              <img 
                :src="authStore.user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + authStore.user.uid" 
                alt="Avatar"
                class="w-full h-full object-cover"
              />
            </div>
            <button class="absolute -bottom-2 -right-2 w-10 h-10 bg-[#C04D1E] text-white rounded-xl flex items-center justify-center shadow-lg border-2 border-white">
              <Camera :size="18" />
            </button>
          </div>
          <div class="text-center">
            <h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter">{{ authStore.profile?.displayName }}</h2>
            <div class="flex items-center justify-center gap-2 mt-1">
              <span class="px-3 py-1 bg-orange-100 text-[#C04D1E] text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                <ShieldCheck :size="12" />
                {{ authStore.profile?.role }}
              </span>
            </div>
          </div>
        </div>

        <!-- Admin/Staff Section -->
        <div v-if="authStore.isStaff" class="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-4">
          <h3 class="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">QUẢN TRỊ VIÊN</h3>
          <button
            @click="router.push('/admin')"
            class="w-full py-5 bg-gray-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center gap-3"
          >
            <ShieldCheck :size="20" />
            Bảng điều khiển {{ authStore.isAdmin ? 'Admin' : 'Staff' }}
          </button>
        </div>

        <!-- Form Section -->
        <div class="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-6">
          <div class="space-y-4">
            <div class="space-y-2">
              <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">Email</label>
              <div class="relative">
                <Mail class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" :size="18" />
                <input
                  disabled
                  type="email"
                  :value="authStore.user.email"
                  class="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">Họ và tên</label>
              <div class="relative">
                <User class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" :size="18" />
                <input
                  type="text"
                  v-model="form.displayName"
                  placeholder="Nhập họ và tên"
                  class="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#C04D1E] transition-all"
                />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">Số điện thoại</label>
              <div class="relative">
                <Phone class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" :size="18" />
                <input
                  type="tel"
                  v-model="form.phoneNumber"
                  placeholder="Nhập số điện thoại"
                  class="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#C04D1E] transition-all"
                />
              </div>
            </div>

            <div class="space-y-2">
              <label class="text-[10px] text-gray-400 font-black uppercase tracking-widest ml-1">Địa chỉ mặc định</label>
              <div class="relative">
                <MapPin class="absolute left-4 top-4 text-gray-400" :size="18" />
                <textarea
                  v-model="form.address"
                  placeholder="Nhập địa chỉ của bạn"
                  rows="3"
                  class="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-[#C04D1E] transition-all resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          <button
            @click="handleSave"
            :disabled="isSaving"
            class="w-full py-5 bg-[#C04D1E] text-white rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-[#A03D18] transition-all shadow-xl shadow-[#C04D1E]/30 flex items-center justify-center gap-3"
          >
            <Save v-if="!isSaving" :size="20" />
            <div v-else class="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            {{ isSaving ? 'Đang lưu...' : 'Lưu thay đổi' }}
          </button>
        </div>

        <!-- Logout Button -->
        <button
          @click="handleLogout"
          class="w-full py-5 bg-white text-red-600 border-2 border-red-50 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-3"
        >
          <LogOut :size="20" />
          Đăng xuất
        </button>
      </div>
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

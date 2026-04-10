<script setup lang="ts">
import { Coffee, Phone, MapPin } from 'lucide-vue-next';
</script>

<template>
  <footer class="bg-gray-900 text-white pt-20 pb-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-16 mb-16">
        <div class="space-y-6">
          <div class="flex items-center gap-2">
            <div class="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
              <Coffee :size="28" />
            </div>
            <div class="flex flex-col">
              <span class="text-2xl font-black uppercase tracking-tighter leading-none">Hi chibi</span>
              <span class="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mt-1">Bingsu & Drinks</span>
            </div>
          </div>
          <p class="text-gray-400 text-sm leading-relaxed font-medium">
            Chúng tôi tin rằng mỗi tách cà phê là một câu chuyện, và chúng tôi ở đây để kể câu chuyện đó cùng bạn.
          </p>
        </div>
        <div>
          <h4 class="font-black text-lg mb-8 uppercase tracking-widest text-orange-600">Liên kết</h4>
          <ul class="space-y-4 text-gray-400 text-sm font-bold uppercase tracking-wider">
            <li><router-link to="/menu" class="hover:text-orange-500 transition-colors">Thực đơn</router-link></li>
            <li><router-link to="/" class="hover:text-orange-500 transition-colors">Khuyến mãi</router-link></li>
            <li><router-link to="/" class="hover:text-orange-500 transition-colors">Cửa hàng</router-link></li>
            <li><router-link to="/" class="hover:text-orange-500 transition-colors">Tuyển dụng</router-link></li>
          </ul>
        </div>
        <div>
          <h4 class="font-black text-lg mb-8 uppercase tracking-widest text-orange-600">Hỗ trợ</h4>
          <ul class="space-y-4 text-gray-400 text-sm font-bold uppercase tracking-wider">
            <li class="flex items-center gap-3"><Phone :size="18" class="text-orange-600" /> 1800 6936</li>
            <li class="flex items-center gap-3"><MapPin :size="18" class="text-orange-600" /> 123 Đường ABC, Quận 1, TP.HCM</li>
          </ul>
        </div>
        <div>
          <h4 class="font-black text-lg mb-8 uppercase tracking-widest text-orange-600">Đăng ký nhận tin</h4>
          <div class="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email của bạn"
              class="bg-gray-800 border-none rounded-2xl px-6 py-4 text-sm w-full focus:ring-2 focus:ring-orange-600 transition-all font-bold"
            />
            <button class="bg-orange-600 px-6 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20">
              Gửi ngay
            </button>
          </div>
        </div>
      </div>
      <div class="pt-10 border-t border-gray-800 text-center text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">
        © 2026 Hi chibi Coffee House • Designed with @ChoGaoNgon
      </div>
    </div>
  </footer>
</template>

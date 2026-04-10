<script setup lang="ts">
import { ref } from 'vue';
import { useWebView } from '../composables/useWebView';
import { AlertCircle, ExternalLink, Info, X } from 'lucide-vue-next';

const { isWebView, webViewType, openInExternalBrowser } = useWebView();
const isDismissed = ref(false);

const dismiss = () => {
  isDismissed.value = true;
};
</script>

<template>
  <transition
    enter-active-class="transition duration-500 ease-out"
    enter-from-class="translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-300 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-full opacity-0"
  >
    <div 
      v-if="isWebView && !isDismissed" 
      class="fixed inset-x-0 bottom-0 z-[200] p-4 sm:p-6"
    >
      <div class="max-w-md mx-auto bg-white rounded-[32px] shadow-2xl border border-orange-100 overflow-hidden">
        <div class="p-6 sm:p-8 space-y-6">
          <div class="flex justify-between items-start">
            <div class="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
              <AlertCircle :size="24" />
            </div>
            <button @click="dismiss" class="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <X :size="20" />
            </button>
          </div>

          <div class="space-y-2">
            <h3 class="text-xl font-black text-gray-900 uppercase tracking-tighter">
              Phát hiện trình duyệt {{ webViewType === 'facebook' ? 'Facebook' : (webViewType === 'zalo' ? 'Zalo' : 'nội bộ') }}
            </h3>
            <p class="text-sm text-gray-500 font-medium leading-relaxed">
              Bạn đang mở ứng dụng trong trình duyệt của {{ webViewType === 'facebook' ? 'Facebook' : 'Zalo' }}. 
              Tính năng đăng nhập Google có thể không hoạt động ổn định tại đây.
            </p>
          </div>

          <div class="bg-blue-50 p-4 rounded-2xl flex gap-3 items-start border border-blue-100">
            <Info :size="18" class="text-blue-600 shrink-0 mt-0.5" />
            <p class="text-[11px] text-blue-700 font-bold uppercase tracking-tight leading-normal">
              Vui lòng mở bằng Chrome hoặc Safari để có trải nghiệm tốt nhất và đăng nhập thành công 100%.
            </p>
          </div>

          <div class="space-y-3">
            <button
              @click="openInExternalBrowser"
              class="w-full py-4 bg-[#C04D1E] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#C04D1E]/30 flex items-center justify-center gap-2 hover:bg-[#A03D18] transition-all"
            >
              <ExternalLink :size="18" />
              Mở bằng trình duyệt ngoài
            </button>
            <p class="text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest">
              Hoặc nhấn vào dấu ba chấm (...) và chọn "Mở bằng trình duyệt"
            </p>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* Ensure it stays above everything */
.fixed {
  pointer-events: none;
}
.max-w-md {
  pointer-events: auto;
}
</style>

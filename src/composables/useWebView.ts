import { ref, onMounted } from 'vue';

export function useWebView() {
  const isWebView = ref(false);
  const webViewType = ref<'facebook' | 'zalo' | 'other' | null>(null);

  const detectWebView = () => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    const isFacebook = ua.indexOf('FBAN') > -1 || ua.indexOf('FBAV') > -1;
    const isZalo = ua.indexOf('Zalo') > -1;
    
    if (isFacebook) {
      isWebView.value = true;
      webViewType.value = 'facebook';
    } else if (isZalo) {
      isWebView.value = true;
      webViewType.value = 'zalo';
    } else {
      // Generic check for other common WebViews if needed
      const isOtherWebView = /wv|WebView/i.test(ua);
      if (isOtherWebView) {
        isWebView.value = true;
        webViewType.value = 'other';
      }
    }
  };

  onMounted(() => {
    detectWebView();
  });

  const openInExternalBrowser = () => {
    const url = window.location.href;
    
    // For Android, we can try to use intent
    if (/Android/i.test(navigator.userAgent)) {
      const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
    } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // iOS doesn't have a direct way to force open Safari from WebView easily 
      // without specific app support, so we just show instructions.
      // Some apps support 'googlechrome://' or 'safari-https://' but it's not universal.
      alert('Vui lòng nhấn vào biểu tượng (...) và chọn "Mở bằng trình duyệt" (Open in Safari/Browser)');
    }
  };

  return {
    isWebView,
    webViewType,
    openInExternalBrowser
  };
}

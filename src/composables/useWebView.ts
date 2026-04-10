import { ref, onMounted } from 'vue';

export function useWebView() {
  const isWebView = ref(false);
  const webViewType = ref<'facebook' | 'zalo' | 'other' | null>(null);
  const showGuard = ref(false);

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
    const ua = navigator.userAgent;
    
    // For Android, we can try to use intent
    if (/Android/i.test(ua)) {
      // Try to force open in Chrome using intent scheme
      const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
      
      // Fallback for some Android WebViews if intent fails
      setTimeout(() => {
        window.open(url, '_blank');
      }, 500);
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      // iOS doesn't have a direct way to force open Safari from WebView easily 
      // Some apps support 'googlechrome://' or 'safari-https://' but it's not universal.
      // The most reliable way is to tell the user to use the app's built-in "Open in Browser"
      alert('Vui lòng nhấn vào biểu tượng (...) ở góc màn hình và chọn "Mở bằng trình duyệt" (Open in Safari/Browser)');
    } else {
      window.open(url, '_blank');
    }
  };

  return {
    isWebView,
    webViewType,
    showGuard,
    openInExternalBrowser
  };
}

import { ref, onMounted, onUnmounted } from 'vue';

export function usePWA() {
  const installPrompt = ref<any>(null);
  const isInstallable = ref(false);

  const handleBeforeInstallPrompt = (e: any) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    installPrompt.value = e;
    isInstallable.value = true;
  };

  const installApp = async () => {
    if (!installPrompt.value) return;

    // Show the prompt
    installPrompt.value.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.value.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // We've used the prompt, and can't use it again, so clear it
    installPrompt.value = null;
    isInstallable.value = false;
  };

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    window.addEventListener('appinstalled', () => {
      // Log install to analytics
      console.log('INSTALL: Success');
      isInstallable.value = false;
      installPrompt.value = null;
    });
  });

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  });

  return {
    isInstallable,
    installApp
  };
}

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged, db, doc, getDoc, setDoc, Timestamp } from '../firebase';
import type { UserProfile } from '../types';
import type { User as FirebaseUser } from 'firebase/auth';
import router from '../router';

import { toast } from 'vue-sonner';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<FirebaseUser | null>(null);
  const profile = ref<UserProfile | null>(null);
  const loading = ref(true);
  let resolveReady: (value: unknown) => void;
  const isReady = new Promise((resolve) => {
    resolveReady = resolve;
  });

  const isAdmin = computed(() => profile.value?.role === 'admin');
  const isTablet = computed(() => profile.value?.role === 'tablet');
  const isStaff = computed(() => profile.value?.role === 'staff' || isAdmin.value || isTablet.value);
  const isCustomer = computed(() => profile.value?.role === 'customer');

  const init = () => {
    onAuthStateChanged(auth, async (u) => {
      user.value = u;
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          profile.value = docSnap.data() as UserProfile;
        } else {
          const newProfile: UserProfile = {
            uid: u.uid,
            email: u.email || '',
            displayName: u.displayName || '',
            role: 'customer',
            createdAt: Timestamp.now(),
          };
          await setDoc(docRef, newProfile);
          profile.value = newProfile;
        }

        // Redirect based on role
        if (isAdmin.value && router.currentRoute.value.path === '/') {
          router.push('/admin');
        } else if (isTablet.value && router.currentRoute.value.path === '/') {
          router.push('/tablet');
        }
      } else {
        profile.value = null;
        // Redirect if on admin page
        if (router.currentRoute.value.meta.requiresAdmin) {
          router.push('/');
        }
      }
      loading.value = false;
      resolveReady(true);
    });
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Đăng nhập thành công');
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User closed the popup or a duplicate request was made, ignore
        return;
      }
      console.error('Login failed', error);
      toast.error('Đăng nhập thất bại');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Đã đăng xuất');
      router.push('/');
    } catch (error) {
      console.error('Logout failed', error);
      toast.error('Đăng xuất thất bại');
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user.value) return;
    try {
      const docRef = doc(db, 'users', user.value.uid);
      await setDoc(docRef, { ...profile.value, ...data }, { merge: true });
      profile.value = { ...profile.value, ...data } as UserProfile;
      toast.success('Đã cập nhật thông tin cá nhân');
    } catch (error) {
      console.error('Update profile failed', error);
      toast.error('Cập nhật thông tin thất bại');
    }
  };

  return { user, profile, loading, isReady, isAdmin, isStaff, isTablet, isCustomer, init, login, logout, updateProfile };
});

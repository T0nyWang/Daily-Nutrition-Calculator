import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'

import { auth } from '../services/firebase'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': '請輸入有效的電子郵件',
  'auth/invalid-credential': '電子郵件或密碼不正確',
  'auth/missing-password': '請輸入密碼',
  'auth/weak-password': '密碼強度不足，請至少輸入 6 個字元',
  'auth/too-many-requests': '嘗試次數過多，請稍後再試',
  'auth/user-not-found': '找不到這個帳號',
  'auth/wrong-password': '密碼不正確',
}

function getAuthErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return AUTH_ERROR_MESSAGES[error.code] ?? '登入服務發生錯誤，請稍後再試'
  }

  return '登入服務發生錯誤，請稍後再試'
}

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref<User | null>(null)
  const authLoading = ref(true)
  const authError = ref('')
  let unsubscribeAuth: (() => void) | null = null

  const isAuthenticated = computed(() => currentUser.value !== null)

  function initializeAuthListener() {
    if (unsubscribeAuth) {
      return
    }

    authLoading.value = true
    unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        currentUser.value = user
        authLoading.value = false
      },
      (error) => {
        authError.value = getAuthErrorMessage(error)
        authLoading.value = false
      },
    )
  }

  async function signInWithEmail(email: string, password: string) {
    authError.value = ''

    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      authError.value = getAuthErrorMessage(error)
      throw error
    }
  }

  async function sendPasswordReset(email: string) {
    authError.value = ''

    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      authError.value = getAuthErrorMessage(error)
      throw error
    }
  }

  async function signOut() {
    authError.value = ''
    await firebaseSignOut(auth)
  }

  return {
    authError,
    authLoading,
    currentUser,
    isAuthenticated,
    initializeAuthListener,
    sendPasswordReset,
    signInWithEmail,
    signOut,
  }
})

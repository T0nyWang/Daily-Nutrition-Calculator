<script setup lang="ts">
import { reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

import { useAuthStore } from '../../stores'

defineProps<{
  compact?: boolean
}>()

const authStore = useAuthStore()
const { authError, authLoading, currentUser, isAuthenticated } = storeToRefs(authStore)

const form = reactive({
  email: '',
  password: '',
})
const formRef = ref<FormInstance>()
const submitting = ref(false)

const rules: FormRules<typeof form> = {
  email: [
    { required: true, message: '請輸入電子郵件', trigger: 'blur' },
    { type: 'email', message: '請輸入有效的電子郵件', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '請輸入密碼', trigger: 'blur' },
    { min: 6, message: '密碼至少需要 6 個字元', trigger: 'blur' },
  ],
}

function getNormalizedEmail() {
  return form.email.trim()
}

async function validateAuthForm() {
  return (await formRef.value?.validate().catch(() => false)) === true
}

async function handleSignIn() {
  if (!(await validateAuthForm())) {
    return
  }

  submitting.value = true

  try {
    await authStore.signInWithEmail(getNormalizedEmail(), form.password)
    ElMessage.success('已登入')
  } catch {
    // authError already contains the user-facing Firebase error message.
  } finally {
    submitting.value = false
  }
}

async function handlePasswordReset() {
  if (!(await validateAuthForm())) {
    return
  }

  submitting.value = true

  try {
    await authStore.sendPasswordReset(getNormalizedEmail())
    ElMessage.success('已寄出密碼重設信')
  } catch {
    // authError already contains the user-facing Firebase error message.
  } finally {
    submitting.value = false
  }
}

async function handleSignOut() {
  submitting.value = true

  try {
    await authStore.signOut()
    ElMessage.success('已登出')
  } catch {
    ElMessage.error('登出失敗，請稍後再試')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <article class="app-panel auth-panel" :class="{ 'auth-panel-compact': compact }">
    <div class="panel-heading">
      <div>
        <p class="panel-kicker">Account</p>
        <h2>帳號同步</h2>
      </div>

      <el-tag :type="isAuthenticated ? 'success' : 'info'" size="large">
        {{ authLoading ? '確認登入狀態中' : isAuthenticated ? '已登入' : '未登入' }}
      </el-tag>
    </div>

    <template v-if="authLoading">
      <el-skeleton :rows="2" animated class="auth-skeleton" />
    </template>

    <template v-else-if="currentUser">
      <div class="auth-signed-in">
        <div>
          <span>目前帳號</span>
          <strong>{{ currentUser.email }}</strong>
        </div>

        <el-button :loading="submitting" @click="handleSignOut">登出</el-button>
      </div>
    </template>

    <template v-else-if="!compact">
      <el-alert
        v-if="authError"
        :title="authError"
        type="error"
        :closable="false"
        show-icon
        class="section-alert"
      />

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="stack-form auth-form">
        <div class="form-grid form-grid-2">
          <el-form-item label="電子郵件" prop="email">
            <el-input v-model="form.email" type="email" autocomplete="email" placeholder="name@example.com" clearable />
          </el-form-item>

          <el-form-item label="密碼" prop="password">
            <el-input
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              placeholder="至少 6 個字元"
              show-password
              @keyup.enter="handleSignIn"
            />
          </el-form-item>
        </div>

        <div class="inline-actions auth-actions">
          <el-button type="primary" :loading="submitting" @click="handleSignIn">登入</el-button>
          <el-button type="info" plain :loading="submitting" @click="handlePasswordReset">忘記密碼</el-button>
        </div>
      </el-form>
    </template>
  </article>
</template>

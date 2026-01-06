<script setup>
import { reactive, ref } from 'vue'
import { appName } from '@/settings/index.mjs'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

const form = reactive({
  username: '',
  password: '',
})

const agreed = ref(true)
const isLoading = ref(false)
const focusedField = ref('')

async function handleLogin() {
  if (!agreed.value) {
    uni.showToast({ title: '请阅读并同意服务协议', icon: 'none' })
    return
  }
  if (!form.username || !form.password) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }

  try {
    isLoading.value = true

    const res = await userStore.login({
      username: form.username,
      password: form.password,
    })
    console.log('登录信息', res)

    console.log('🔍 [Login] 登录接口返回:', res)

    if (res.data && res.data.user) {
      userStore.setUserInfo(res.data.user)
    }
    else {
      if (!userStore.userId) {
        console.warn('⚠️ [Login] 接口未返回 user_id，使用用户名兜底')
        userStore.setUserInfo({
          user_id: form.username,
          username: form.username,
        })
      }
    }

    uni.showToast({ title: '登录成功', icon: 'success' })

    setTimeout(() => {
      uni.switchTab({
        url: '/pages/index/index',
        success: () => {
          console.log('✅ 跳转首页成功')
        },
        fail: (err) => {
          console.error('❌ 跳转首页失败 (请检查 pages.json tabBar 配置):', err)

          uni.navigateTo({ url: '/pages/index/index' })
        },
      })
    }, 500)
  }
  catch (error) {
    console.error('❌ 登录失败:', error)
    const msg = error.msg || error.message || '登录失败，请检查网络或账号'
    uni.showToast({ title: msg, icon: 'none' })
  }
  finally {
    isLoading.value = false
  }
}

function toggleAgreement() {
  agreed.value = !agreed.value
}
</script>

<template>
  <view class="min-h-screen bg-white px-8 flex flex-col relative">
    <view class="pt-24 pb-12 flex flex-col items-center animate-fade-in-down">
      <view class="h-20 w-20 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200 mb-6">
        <image
          src="/static/images/logo.png"
          class="h-12 w-12 rounded-xl"
          mode="aspectFit"
        />
      </view>
      <text class="text-2xl font-bold text-slate-900 tracking-tight mb-2">
        {{ appName }}
      </text>
      <text class="text-sm text-slate-400">
        张壁商户管理平台
      </text>
    </view>

    <view class="w-full max-w-sm mx-auto space-y-5">
      <view class="group">
        <view
          class="relative w-full rounded-2xl transition-all duration-200"
          :class="focusedField === 'username' ? 'bg-blue-50 ring-1 ring-blue-500' : 'bg-slate-50'"
        >
          <text class="absolute top-3 left-4 text-xs text-slate-400 font-medium" :class="{ 'text-blue-500': focusedField === 'username' }">
            账号
          </text>
          <input
            v-model="form.username"
            class="w-full h-14 pl-4 pt-4 pr-4 text-base text-slate-900 bg-transparent"
            :disabled="isLoading"
            @focus="focusedField = 'username'"
            @blur="focusedField = ''"
          />
        </view>
      </view>

      <view class="group">
        <view
          class="relative w-full rounded-2xl transition-all duration-200"
          :class="focusedField === 'password' ? 'bg-blue-50 ring-1 ring-blue-500' : 'bg-slate-50'"
        >
          <text class="absolute top-3 left-4 text-xs text-slate-400 font-medium" :class="{ 'text-blue-500': focusedField === 'password' }">
            密码
          </text>
          <input
            v-model="form.password"
            type="password"
            class="w-full h-14 pl-4 pt-4 pr-4 text-base text-slate-900 bg-transparent"
            :disabled="isLoading"
            @focus="focusedField = 'password'"
            @blur="focusedField = ''"
          />
        </view>
      </view>

      <view class="flex items-center px-2" @click="toggleAgreement">
        <view
          class="w-4 h-4 rounded border flex items-center justify-center mr-2 transition-colors"
          :class="agreed ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'"
        >
          <view v-if="agreed" class="i-carbon-checkmark text-white text-[10px]"></view>
        </view>
        <text class="text-xs text-slate-500">
          我已阅读并同意 <text class="text-blue-600 font-medium">
            《用户服务协议》
          </text>
        </text>
      </view>

      <button
        class="w-full mt-4 rounded-full bg-blue-600 text-white text-base font-medium py-4 shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700"
        :disabled="isLoading"
        @click="handleLogin"
      >
        <view class="flex items-center justify-center space-x-2">
          <view v-if="isLoading" class="i-carbon-circle-dash w-5 h-5 animate-spin"></view>
          <text>{{ isLoading ? '正在登录...' : '登录' }}</text>
        </view>
      </button>
    </view>

    <view class="absolute bottom-8 left-0 right-0 text-center">
      <text class="text-[10px] text-slate-300 font-sans">
        Version 1.0.0
      </text>
    </view>
  </view>
</template>

<style scoped>
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-down {
  animation: fadeInDown 0.6s ease-out forwards;
}
input {
  outline: none;
  border: none;
}
button::after {
  border: none;
}
</style>

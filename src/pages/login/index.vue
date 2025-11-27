<script setup>
import { useRouter } from 'uniapp-router-next'
import { reactive, ref } from 'vue'
import { appName } from '@/settings/index.mjs'
import { useUserStore } from '@/store/user'

const richView = useRichView()
const router = useRouter()
const form = reactive({
  username: '',
  password: '',
})

const agreed = ref(true)
const isLoading = ref(false)
const focusedField = ref('')

async function handleLogin() {
  if (!form.username || !form.password) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }

  isLoading.value = true
  const url = `http://localhost:8084/zhangbi/api/user/merchant/login?username=${encodeURIComponent(form.username)}&password=${encodeURIComponent(form.password)}`

  uni.request({
    url,
    method: 'GET',
    header: { 'Content-Type': 'application/x-www-form-urlencoded' },
    success: (res) => {
      if (res.statusCode === 200) {
        const { code, data, message } = res.data
        if (code === 1) {
          const { id: merchantId, token, username } = data

          uni.setStorageSync('merchantToken', token)
          uni.setStorageSync('merchantId', username)
          uni.setStorageSync('merchantName', username)
          console.log(merchantId)

          const userStore = useUserStore()
          userStore.setAuthData(token, merchantId, username)
          uni.showToast({ title: '登录成功', icon: 'success' })

          router.pushTab({
            name: 'index',
          }).catch((err) => {
            console.error('跳转失败：', err)
          })
        }
        else {
          uni.showToast({ title: message || '登录失败', icon: 'none' })
        }
      }
      else {
        uni.showToast({ title: `接口异常：${res.statusCode}`, icon: 'none' })
      }
    },
    fail: (err) => {
      console.error('请求失败:', err)
      uni.showToast({ title: '网络请求失败', icon: 'none' })
    },
    complete: () => {
      isLoading.value = false
    },
  })
}

function toggleAgreement() {
  agreed.value = !agreed.value
}

function onAgreementClick() {
  // 保持原有逻辑，仅微调样式
  richView.open({
    title: '服务协议',
    content: `
      <div style="padding: 24px; line-height: 1.8; color: #1f2937; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <h3 style="color: #111827; margin-bottom: 12px; font-size: 18px; font-weight: 600;">服务条款</h3>
        <p style="margin-bottom: 12px; font-size: 15px;">欢迎使用 ${appName}，请阅读以下内容：</p>
        <ul style="padding-left: 20px; font-size: 14px; color: #4b5563;">
           <li style="margin-bottom: 8px;">1. 合规使用承诺</li>
           <li style="margin-bottom: 8px;">2. 隐私与数据安全保护</li>
           <li>3. 最终解释权归属</li>
        </ul>
      </div>
    `,
    style: { width: '85%', maxWidth: '500px', borderRadius: '16px' },
  })
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
            placeholder=""
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
            placeholder=""
            :disabled="isLoading"
            @focus="focusedField = 'password'"
            @blur="focusedField = ''"
          />
        </view>
      </view>

      <button
        class="w-full mt-8 rounded-full bg-blue-600 text-white text-base font-medium py-4 shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700"
        :disabled="isLoading"
        @click="handleLogin"
      >
        <view class="flex items-center justify-center space-x-2">
          <view v-if="isLoading" class="i-carbon-circle-dash w-5 h-5 animate-spin"></view>
          <text>{{ isLoading ? '正在登录...' : '登录' }}</text>
        </view>
      </button>

      <view class="flex items-center justify-center space-x-2 pt-4">
        <view
          class="h-5 w-5 rounded-full border flex items-center justify-center transition-all cursor-pointer"
          :class="agreed ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'"
          @click="toggleAgreement"
        >
          <view v-if="agreed" class="i-carbon-checkmark text-white text-xs font-bold scale-75"></view>
        </view>
        <view class="text-xs text-slate-500 flex items-center">
          <text @click="toggleAgreement">
            我已阅读并同意
          </text>
          <text class="text-blue-600 font-medium ml-1 active:opacity-70" @click.stop="onAgreementClick">
            服务协议
          </text>
        </view>
      </view>
    </view>

    <view class="absolute bottom-8 left-0 right-0 text-center">
      <text class="text-[10px] text-slate-300 font-sans">
        Version 1.0.0
      </text>
    </view>
  </view>
</template>

<style scoped>
/* 简单的淡入动效，提升质感 */
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

/* 移除默认 input 样式干扰 */
input {
  outline: none;
  border: none;
}

/* UniApp 特定样式修正 */
button::after {
  border: none;
}
</style>

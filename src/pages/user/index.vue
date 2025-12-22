<script setup>
import { showModal, showToast } from '@uni-helper/uni-promises'
import { useRouter } from 'uniapp-router-next'
import { computed, ref } from 'vue'
import { createTeamAPI } from '@/api/team'
import CustomTabBar from '@/components/CustomTabBar/index.vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const router = useRouter()

const isLogin = computed(() => !!userStore.token)
const userName = computed(() => userStore.userName || userStore.username)

const teamStats = ref({
  teamName: '暂无队伍',
  teamCode: '',
  teamId: '',
  scriptName: '未选择',
  teamCount: 0,
})

const showCreateModal = ref(false)
const isCreating = ref(false)
const newTeamName = ref('')

function openCreateModal() {
  if (!isLogin.value) {
    showToast({ title: '请先登录', icon: 'none' })
    return
  }
  newTeamName.value = '' // 重置输入
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
}

function handleLogin() {
  if (isLogin.value) {
    return
  }

  uni.navigateTo({
    url: '/pages/login/index',
    fail: (err) => {
      console.error('跳转登录页失败:', err)
    },
  })
}

async function handleLogout() {
  const result = await showModal({
    title: '提示',
    content: '确定要退出登录吗?',
    showCancel: true,
    confirmText: '确定',
    cancelText: '取消',
  })

  if (result.confirm) {
    await userStore.logout()

    uni.reLaunch({
      url: '/pages/login/index',
      fail: (err) => {
        console.error('退出跳转失败:', err)
      },
    })
  }
}

async function handleSubmitCreate() {
  if (!newTeamName.value.trim()) {
    showToast({ title: '请输入队伍名称', icon: 'none' })
    return
  }

  try {
    isCreating.value = true

    // 调用 API
    const res = await createTeamAPI({
      team_name: newTeamName.value,
    })

    // 接口返回结构: { ok: true, team_id, binding_code, team_name, ... }
    if (res.ok || res.team_id) {
      showToast({ title: '创建成功', icon: 'success' })

      // 2. 更新页面数据
      teamStats.value.teamName = res.team_name
      teamStats.value.teamCode = res.binding_code // ✅ 获取队伍码
      teamStats.value.teamId = res.team_id // ✅ 获取队伍ID
      teamStats.value.teamCount = 1

      // 3. (可选) 持久化存储，防止刷新页面后丢失
      uni.setStorageSync('currentTeamCode', res.binding_code)
      uni.setStorageSync('currentTeamId', res.team_id)
      uni.setStorageSync('currentTeamName', res.team_name)

      closeCreateModal()
    }
  }
  catch (error) {
    console.error(error)
    const msg = error.detail?.[0]?.msg || '创建失败'
    showToast({ title: msg, icon: 'none' })
  }
  finally {
    isCreating.value = false
  }
}

function handleCopyCode() {
  if (!teamStats.value.teamCode)
    return

  uni.setClipboardData({
    data: teamStats.value.teamCode,
    success: () => {
      uni.showToast({ title: '队伍码已复制', icon: 'none' })
    },
  })
}
</script>

<template>
  <view class="min-h-screen flex flex-col bg-gray-100 font-sans text-gray-800">
    <view class="pt-12 px-4 pb-4 flex justify-between items-center bg-gray-100 sticky top-0 z-40">
      <view class="flex items-end gap-2">
        <text class="text-xl font-black text-gray-900 tracking-tight">
          个人中心
        </text>
        <view class="bg-gray-200 text-gray-500 text-xs px-1.5 py-0.5 rounded font-bold uppercase">
          Profile
        </view>
      </view>
    </view>

    <view class="flex-1 px-4 flex flex-col gap-5 pb-4">
      <view class="bg-slate-800 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden active:scale-[0.98] transition-transform shrink-0" @click="handleLogin">
        <view class="absolute -right-4 -top-4 opacity-10 text-8xl rotate-12 pointer-events-none">
          🆔
        </view>
        <view class="relative z-10 flex items-center gap-5">
          <view class="h-20 w-20 rounded-2xl bg-slate-700 border-2 border-indigo-500/30 p-1 shadow-lg overflow-hidden shrink-0">
            <image src="~@assets/images/avatar.png" class="h-full w-full object-cover rounded-xl bg-gray-600" />
          </view>
          <view class="flex-1 min-w-0">
            <view v-if="isLogin">
              <view class="text-2xl font-bold truncate">
                {{ userName || '商户' }}
              </view>
              <view class="mt-2 inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>已登录系统
              </view>
            </view>
            <view v-else>
              <view class="text-xl font-bold mb-1">
                立即登录
              </view>
              <view class="inline-block rounded-lg bg-white/10 px-3 py-1 text-xs text-gray-300 font-bold border border-white/10">
                未连接会话
              </view>
            </view>
          </view>
        </view>
      </view>

      <template v-if="isLogin">
        <view class="shrink-0">
          <button
            class="w-full bg-indigo-600 text-white rounded-2xl py-4 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 active:bg-indigo-700 transition-all font-bold text-base border-none"
            @click="openCreateModal"
          >
            <view class="i-carbon-add-alt text-xl"></view>
            创建新队伍
          </button>
        </view>

        <view class="grid grid-cols-2 gap-3">
          <view class="col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
            <view class="absolute top-0 right-0 w-24 h-24 bg-indigo-50/80 rounded-bl-[60px] -mr-6 -mt-6 z-0 pointer-events-none"></view>

            <view class="p-4 flex items-center justify-between relative z-10">
              <view class="flex flex-col flex-1 min-w-0 mr-4">
                <view class="flex items-center gap-2 mb-1.5">
                  <text class="text-xs text-gray-400 font-bold">
                    当前队伍
                  </text>
                  <view v-if="teamStats.teamCode" class="bg-emerald-100 text-emerald-600 text-[10px] px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                    <span class="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>进行中
                  </view>
                </view>
                <text class="text-lg font-black text-gray-800 truncate leading-none">
                  {{ teamStats.teamName }}
                </text>
              </view>

              <view
                v-if="teamStats.teamCode"
                class="flex flex-col items-end cursor-pointer active:opacity-60 transition-opacity group"
                @click="handleCopyCode"
              >
                <text class="text-[10px] text-indigo-400 font-bold mb-1 opacity-80">
                  点击复制队伍码
                </text>
                <view class="bg-indigo-600 text-white shadow-lg shadow-indigo-200 border border-indigo-500 px-3 py-1.5 rounded-xl flex items-center gap-2 group-active:scale-95 transition-transform">
                  <text class="text-xl font-mono font-black tracking-widest leading-none">
                    {{ teamStats.teamCode }}
                  </text>
                  <view class="i-carbon-copy text-sm opacity-80"></view>
                </view>
              </view>

              <view v-else class="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300">
                <view class="i-carbon-group text-2xl"></view>
              </view>
            </view>
          </view>
        </view>

        <view class="mt-auto pt-6 mb-24">
          <button class="w-full bg-white text-gray-500 border border-gray-200 rounded-xl py-3 flex items-center justify-center gap-2 active:bg-gray-50 transition-all font-bold text-sm" @click="handleLogout">
            <view class="i-carbon-power text-lg "></view>退出登录
          </button>
        </view>
      </template>

      <template v-else>
        <view class="flex-1 flex flex-col items-center justify-center opacity-60 space-y-4">
          <view class="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 mb-2">
            <view class="i-carbon-user-identification text-5xl"></view>
          </view>
          <text class="text-gray-400 text-sm font-bold">
            登录后管理商户队伍
          </text>
        </view>

        <view class="mt-auto pt-6 mb-24">
          <button
            class="w-full bg-slate-900 text-white rounded-xl py-4 flex items-center justify-center gap-2 shadow-lg shadow-slate-300 active:scale-[0.98] transition-all font-bold text-base"
            @click="handleLogin"
          >
            <view class="i-carbon-login text-xl"></view>
            立即登录
          </button>
        </view>
      </template>
    </view>

    <view class="pb-safe">
      <CustomTabBar :current="1" />
    </view>

    <view
      v-if="showCreateModal"
      class="fixed inset-0 z-50 flex items-center justify-center px-8"
    >
      <view
        class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        @click="closeCreateModal"
      ></view>

      <view
        class="relative bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in-zoom overflow-hidden"
        @click.stop
      >
        <view class="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-indigo-50/80 to-transparent pointer-events-none"></view>

        <view class="relative h-16 w-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-6 mx-auto rotate-3 shadow-sm">
          <view class="i-carbon-flag-filled text-4xl"></view>
        </view>

        <view class="text-center mb-8 relative">
          <text class="text-2xl font-black text-gray-900 block tracking-tight">
            开启新的旅程
          </text>
          <text class="text-sm text-gray-400 mt-2 font-medium block">
            为你的团队起一个响亮的名字
          </text>
        </view>

        <view class="mb-8 relative">
          <view class="bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 transition-all flex items-center gap-3 focus-within:border-indigo-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 h-16">
            <view class="i-carbon-edit text-xl text-gray-400 shrink-0"></view>
            <input
              v-model="newTeamName"
              class="flex-1 h-full text-lg text-gray-900 font-bold bg-transparent placeholder:font-normal"
              placeholder="请输入队伍名称"
              placeholder-class="text-gray-400"
              :disabled="isCreating"
              :cursor-spacing="20"
            />
            <view
              v-if="newTeamName"
              class="i-carbon-close-filled text-gray-300 text-xl active:text-gray-500 transition-colors"
              @click="newTeamName = ''"
            ></view>
          </view>
        </view>

        <view class="grid grid-cols-2 gap-4">
          <button
            class="w-full bg-gray-50 text-gray-600 rounded-2xl py-4 text-base font-bold border-none active:bg-gray-100 active:scale-[0.98] transition-all"
            :disabled="isCreating"
            @click="closeCreateModal"
          >
            取消
          </button>
          <button
            class="w-full bg-indigo-600 text-white rounded-2xl py-4 text-base font-bold border-none shadow-lg shadow-indigo-200 active:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            :disabled="isCreating"
            @click="handleSubmitCreate"
          >
            <view v-if="isCreating" class="i-carbon-circle-dash animate-spin text-xl"></view>
            <text>{{ isCreating ? '创建中...' : '立即创建' }}</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* 定义弹窗进入动画 */
@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-in-zoom {
  animation: zoomIn 0.2s ease-out forwards;
}

/* 基础样式 */
* {
  -webkit-tap-highlight-color: transparent;
  tap-highlight-color: transparent;
}
button::after {
  border: none;
}
button:disabled {
  opacity: 0.7;
}
.pb-safe {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>

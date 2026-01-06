<script setup>
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { getTeamListAPI } from '@/api/team'
import CustomTabBar from '@/components/CustomTabBar/index.vue'
import { useGameStore } from '@/store/game'
import { useUserStore } from '@/store/user'

const gameStore = useGameStore()
const userStore = useUserStore()

// --- 状态定义 ---
const currentView = ref('dashboard')
const teamList = ref([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const isLoading = ref(false)

// Dashboard 数据保持不变
const flowList = ref([
  { id: 1, teamName: '飞虎队', peopleCount: 5, taskName: '寻找钥匙', arrivalTime: 3, tags: [{ label: '⚠️ 过敏', type: 'warning' }] },
  { id: 2, teamName: '探险队', peopleCount: 3, taskName: '购买补给', arrivalTime: 12, tags: [] },
  { id: 3, teamName: '研学团', peopleCount: 12, taskName: '参观壁画', arrivalTime: 25, tags: [{ label: '👨‍🦽 轮椅', type: 'info' }] },
])

const scriptOptions = [
  { id: 'script_001', name: '粮仓奇遇记', desc: '在王记粮仓寻找消失的钥匙' },
  { id: 'script_002', name: '古城大逃亡', desc: '限时 60 分钟的古城解谜' },
  { id: 'script_003', name: '消失的宝藏', desc: '沉浸式角色扮演任务' },
]

// --- 🟢 核心修复 1：Socket 监听同步逻辑 ---

function attachPageListeners(socket) {
  // 防止重复监听
  socket.off('game:game_created')
  socket.off('game_started')

  // A. 监听剧本就绪 (后端 AI 生成完毕)
  socket.on('game:game_created', (data) => {
    console.log('✅ [Socket] 收到剧本数据:', data)
    uni.hideLoading()

    // ⚡️ 重点：在本地列表中找到该队伍，并强制更新属性
    const targetTeam = teamList.value.find(t => t.team_id === data.team_id)
    if (targetTeam) {
      // 这里的赋值是响应式的，界面应该会变
      targetTeam.current_status = 1
      targetTeam.game_id = data.game_id
      console.log('🔄 [页面状态] 已更新队伍GameID:', targetTeam.game_id)
    }
  })

  // B. 监听游戏开始
  socket.on('game_started', (data) => {
    const targetTeam = teamList.value.find(t => t.team_id === data.team_id)
    if (targetTeam) {
      targetTeam.current_status = 2 // 变为进行中
    }
  })
}

// 监听 Store 中的 Socket 连接
watch(() => gameStore.socket, (newSocket) => {
  if (newSocket && newSocket.connected) {
    attachPageListeners(newSocket)
  }
}, { immediate: true })

// --- 生命周期 ---

onShow(() => {
  const token = uni.getStorageSync('token') // 确保拿到token
  if (token) {
    gameStore.initSocket(token) // 👈 记得传 token
  }
})

onUnmounted(() => {
  if (gameStore.socket) {
    gameStore.socket.off('game:game_created')
    gameStore.socket.off('game_started')
  }
})

// --- 🟢 核心修复 2：业务方法 ---

function isJoined(teamId) {
  return gameStore.currentTeamId === teamId
}

function handleJoinRoom(team) {
  uni.showLoading({ title: '正在连接...', mask: true })
  gameStore.joinTeam(team.team_id, {
    userId: userStore.userId, // 确保这是 ID
    userName: userStore.userName,
  }).then(() => {
    uni.hideLoading()
  }).catch(() => {
    uni.hideLoading()
  })
}

function handleAssignScript(team) {
  uni.showActionSheet({
    itemList: scriptOptions.map(s => s.name),
    success: async (res) => {
      const selected = scriptOptions[res.tapIndex]
      // 发送指令
      gameStore.selectScript(team.team_id, selected.id)
      // 开启 Loading
      uni.showLoading({ title: 'AI正在生成剧本...', mask: true })
    },
  })
}

// 🔥 修复重点：handleStartGame
function handleStartGame(team) {
  // 1. 重新在响应式列表中查找该队伍（防止传入的 team 参数是旧的引用）
  const liveTeam = teamList.value.find(t => t.team_id === team.team_id) || team

  // 2. 多重获取 ID：先从列表对象取，取不到就去 Store 里看看是不是刚好是当前这个
  let targetGameId = liveTeam.game_id

  // 补救措施：如果列表没更新，但 Store 里刚好收到了这个队伍的 GameID
  if (!targetGameId && gameStore.currentTeamId === liveTeam.team_id && gameStore.gameId) {
    targetGameId = gameStore.gameId
  }

  console.log('🔍 [Debug] 尝试启动，GameID:', targetGameId)

  if (!targetGameId) {
    uni.showToast({ title: '剧本ID未同步，请刷新或重试', icon: 'none' })
    // 可选：在这里静默刷新一下列表 fetchTeamList(false, true)
    return
  }

  uni.showModal({
    title: '准备开局',
    content: `GameID: ${targetGameId}\n确定要开始《${liveTeam.team_name}》吗？`,
    confirmText: '🚀 立即开始',
    confirmColor: '#10B981',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '正在启动引擎...', mask: true })
        try {
          await gameStore.startGame(targetGameId)
          // 成功！
          uni.hideLoading()
          uni.showToast({ title: '游戏启动成功！', icon: 'success' })
        }
        catch (error) {
          uni.hideLoading()
          uni.showModal({
            title: '启动失败',
            content: `服务端拒绝: ${error}`,
            showCancel: false,
          })
        }
      }
    },
  })
}

// --- 列表逻辑 (保持不变) ---

watch(currentView, (newVal) => {
  if (newVal === 'teams' && teamList.value.length === 0) {
    fetchTeamList(true)
  }
})

async function fetchTeamList(reset = false, silent = false) {
  if (reset) {
    page.value = 1
    if (!silent) {
      teamList.value = []
      isLoading.value = true
    }
  }
  try {
    const res = await getTeamListAPI({ page: page.value, size: pageSize.value })
    let newItems = []
    if (res && res.data && Array.isArray(res.data.items)) {
      newItems = res.data.items
      total.value = res.data.total || 0
    }
    else if (res && Array.isArray(res.items)) {
      newItems = res.items
      total.value = res.total || 0
    }
    teamList.value = reset ? newItems : [...teamList.value, ...newItems]
  }
  catch (error) {
    console.error(error)
  }
  finally {
    isLoading.value = false
    uni.stopPullDownRefresh()
  }
}

onPullDownRefresh(() => {
  if (currentView.value === 'teams')
    fetchTeamList(true)
  else setTimeout(() => uni.stopPullDownRefresh(), 1000)
})

onReachBottom(() => {
  if (currentView.value === 'teams' && teamList.value.length < total.value) {
    page.value++
    fetchTeamList()
  }
})

function getTimeColor(time) {
  if (time <= 5)
    return 'bg-red-100 text-red-500'
  return 'bg-gray-100 text-gray-600'
}
function getTagColor(type) {
  return type === 'warning' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-orange-50 border-orange-100 text-orange-500'
}
function getStatusConfig(status) {
  const map = {
    0: { color: 'text-gray-500', bg: 'bg-gray-100', text: '组建中' },
    1: { color: 'text-blue-600', bg: 'bg-blue-50', text: '已就绪' },
    2: { color: 'text-green-600', bg: 'bg-green-50', text: '进行中' },
    3: { color: 'text-red-500', bg: 'bg-red-50', text: '已结束' },
  }
  return map[status] || map[0]
}
</script>

<template>
  <view class="min-h-screen bg-gray-100 pb-24 font-sans text-gray-800">
    <view class="pt-12 px-4 pb-2 flex justify-between items-center bg-white sticky top-0 z-50 shadow-sm">
      <view class="flex items-end gap-2">
        <text class="text-xl font-black text-gray-900 tracking-tight">
          Merchant OS
        </text>
        <view class="flex items-center gap-1 bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded font-bold">
          <view v-if="gameStore.isWsConnected" class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></view>
          <view v-else class="w-1.5 h-1.5 rounded-full bg-red-500"></view>
          {{ gameStore.isWsConnected ? 'LIVE' : 'OFFLINE' }}
        </view>
      </view>

      <view class="flex bg-gray-100 p-1 rounded-full relative">
        <view
          class="px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 z-10"
          :class="currentView === 'dashboard' ? 'text-indigo-600' : 'text-gray-500'"
          @click="currentView = 'dashboard'"
        >
          📊 态势
        </view>
        <view
          class="px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 z-10"
          :class="currentView === 'teams' ? 'text-indigo-600' : 'text-gray-500'"
          @click="currentView = 'teams'"
        >
          👥 队伍
        </view>
        <view class="absolute top-1 bottom-1 w-[50%] bg-white rounded-full shadow-sm transition-all duration-300" :style="{ left: currentView === 'dashboard' ? '4px' : 'calc(50% - 4px)' }"></view>
      </view>
    </view>

    <view class="p-4 space-y-4">
      <template v-if="currentView === 'dashboard'">
        <view class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 shadow-lg text-white relative overflow-hidden animate-fade-in">
          <view class="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></view>
          <view class="relative z-10 flex justify-between items-start">
            <view>
              <view class="flex items-center gap-2 mb-1">
                <text class="text-xl font-bold">
                  📍 王记粮仓 (#042)
                </text>
              </view>
              <text class="opacity-90 text-sm">
                AI流量分发开启
              </text>
            </view>
          </view>
        </view>

        <view class="grid grid-cols-2 gap-3 animate-fade-in">
          <view class="bg-white rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <text class="text-gray-500 text-xs mb-2">
              👥 当前排队
            </text>
            <view class="flex items-baseline gap-1">
              <text class="text-3xl font-black text-gray-900">
                5
              </text>
              <text class="text-gray-400 text-sm">
                / 20人
              </text>
            </view>
            <view class="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
              <view class="bg-green-500 h-full rounded-full" style="width: 25%"></view>
            </view>
          </view>
          <view class="bg-white rounded-xl p-4 shadow-sm flex flex-col justify-between">
            <text class="text-gray-500 text-xs mb-2">
              🕒 预计客流
            </text>
            <view class="flex items-baseline gap-1">
              <text class="text-3xl font-black text-indigo-600">
                17
              </text>
              <text class="text-gray-400 text-sm">
                人
              </text>
            </view>
            <view class="bg-red-50 text-red-500 text-[10px] px-2 py-0.5 rounded w-max mt-2">
              ⚠️ 含特殊需求
            </view>
          </view>
        </view>

        <view class="bg-white rounded-2xl p-4 shadow-sm min-h-[300px] animate-fade-in">
          <view class="flex justify-between items-center mb-4">
            <text class="font-bold text-gray-800 text-lg">
              流量预报
            </text>
            <view class="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">
              ● 实时
            </view>
          </view>
          <view class="space-y-4">
            <view v-for="item in flowList" :key="item.id" class="flex items-center gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
              <view class="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm" :class="getTimeColor(item.arrivalTime)">
                {{ item.arrivalTime }}m
              </view>
              <view class="flex-1">
                <view class="flex items-baseline gap-2">
                  <text class="font-bold text-gray-900 text-base">
                    {{ item.teamName }}
                  </text>
                  <text class="text-gray-400 text-sm">
                    ({{ item.peopleCount }}人)
                  </text>
                </view>
                <view class="text-gray-500 text-xs mt-0.5">
                  任务: {{ item.taskName }}
                </view>
                <view v-if="item.tags" class="mt-1.5 flex gap-1">
                  <view v-for="(tag, tagIdx) in item.tags" :key="tagIdx" class="text-[10px] px-1.5 py-0.5 rounded border" :class="getTagColor(tag.type)">
                    {{ tag.label }}
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </template>

      <template v-else>
        <view class="flex gap-2 animate-fade-in">
          <view class="flex-1 bg-white h-11 rounded-2xl flex items-center px-4 shadow-sm text-gray-400 text-sm">
            🔍 搜索队伍...
          </view>
        </view>

        <view class="space-y-5">
          <view v-if="isLoading && teamList.length === 0" class="py-10 text-center text-gray-400 text-xs">
            获取实时数据中...
          </view>
          <view v-else-if="teamList.length === 0" class="py-10 text-center text-gray-400 text-xs">
            暂无队伍信息
          </view>

          <view v-for="team in teamList" :key="team.team_id" class="bg-white rounded-[24px] shadow-xl overflow-hidden border border-gray-50 animate-slide-up">
            <view class="p-5 flex justify-between items-start bg-gradient-to-br from-white to-gray-50">
              <view>
                <view class="flex items-center gap-2 mb-1">
                  <text class="text-xl font-black text-gray-900">
                    {{ team.team_name }}
                  </text>
                  <view :class="[getStatusConfig(team.current_status).bg, getStatusConfig(team.current_status).color]" class="px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {{ getStatusConfig(team.current_status).text }}
                  </view>
                </view>
              </view>
              <view class="bg-indigo-600 px-3 py-2 rounded-xl text-center shadow-md shadow-indigo-100">
                <text class="block text-[8px] text-white/70 font-bold tracking-widest mb-0.5">
                  队伍码
                </text>
                <text class="text-lg font-black text-white font-mono">
                  {{ team.binding_code }}
                </text>
              </view>
            </view>

            <view class="px-5 py-4 border-t border-gray-50">
              <view class="flex justify-between items-center mb-3">
                <view class="flex -space-x-2">
                  <view v-for="i in Math.min(3, gameStore.roomStates[team.team_id]?.memberCount || team.size)" :key="i" class="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs">
                    👤
                  </view>
                  <view v-if="(gameStore.roomStates[team.team_id]?.memberCount || team.size) > 3" class="w-8 h-8 rounded-full border-2 border-white bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                    +{{ (gameStore.roomStates[team.team_id]?.memberCount || team.size) - 3 }}
                  </view>
                </view>
                <view class="text-right">
                  <text class="text-xs text-gray-400 block">
                    实时在线人数
                  </text>
                  <text class="text-lg font-black text-indigo-600">
                    {{ gameStore.roomStates[team.team_id]?.memberCount || team.size }}
                    <text class="text-[10px] text-gray-400 font-normal">
                      / 5
                    </text>
                  </text>
                </view>
              </view>
            </view>

            <view class="px-5 py-4 bg-gray-50/50 flex gap-3">
              <button
                v-if="!isJoined(team.team_id)"
                class="flex-1 bg-white border border-indigo-200 text-indigo-600 rounded-xl py-3 text-sm font-bold shadow-sm flex items-center justify-center gap-1 active:scale-95"
                @click="handleJoinRoom(team)"
              >
                👉 进入房间
              </button>

              <template v-else>
                <button
                  v-if="team.current_status === 0"
                  class="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-1 active:scale-95"
                  @click="handleAssignScript(team)"
                >
                  🎭 分配剧本
                </button>

                <template v-else-if="team.current_status === 1">
                  <button
                    class="flex-1 bg-blue-500 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95"
                    @click="handleAssignScript(team)"
                  >
                    🔄 选择剧本
                  </button>
                  <button
                    class="flex-1 bg-emerald-500 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95"
                    @click="handleStartGame(team)"
                  >
                    🚀 开始游戏
                  </button>
                </template>

                <button
                  v-else-if="team.current_status === 2"
                  class="flex-1 bg-orange-500 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-orange-100 flex items-center justify-center gap-2 active:scale-95"
                >
                  🎮 游戏进行中
                </button>

                <button
                  v-else-if="team.current_status === 3"
                  class="flex-1 bg-gray-200 text-gray-500 rounded-xl py-3 text-sm font-bold flex items-center justify-center"
                  disabled
                >
                  🏁 游戏已结束
                </button>
              </template>
            </view>
          </view>
        </view>

        <view v-if="teamList.length > 0" class="text-center py-8 text-gray-400 text-xs" @click="fetchTeamList()">
          {{ teamList.length >= total ? '- 数据已全部同步 -' : '上拉加载更多历史队伍' }}
        </view>
      </template>
    </view>
    <CustomTabBar :current="0" />
  </view>
</template>

<style scoped>
button {
  margin: 0;
  line-height: 1.5;
  transition: transform 0.1s;
}
button:active {
  transform: scale(0.97);
  opacity: 0.9;
}
button::after {
  border: none;
}

.shadow-xl {
  box-shadow:
    0 15px 30px -5px rgba(0, 0, 0, 0.05),
    0 8px 12px -7px rgba(0, 0, 0, 0.03);
}

.animate-slide-up {
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
</style>

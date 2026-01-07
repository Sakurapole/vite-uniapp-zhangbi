<script setup>
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'
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
const isRefreshing = ref(false)

// Dashboard 模拟数据
const flowList = ref([
  { id: 1, teamName: '飞虎队', peopleCount: 5, taskName: '寻找钥匙', arrivalTime: 3, tags: [{ label: '⚠️ 过敏', type: 'warning' }] },
  { id: 2, teamName: '探险队', peopleCount: 3, taskName: '购买补给', arrivalTime: 12, tags: [] },
])

const scriptOptions = [
  { id: 'script_001', name: '粮仓奇遇记', desc: '在王记粮仓寻找消失的钥匙' },
  { id: 'script_002', name: '古城大逃亡', desc: '限时 60 分钟的古城解谜' },
  { id: 'script_003', name: '消失的宝藏', desc: '沉浸式角色扮演任务' },
]

// --- Socket 监听 ---
function attachPageListeners(socket) {
  socket.off('game:game_created')
  socket.off('game_started')

  socket.on('game:game_created', (data) => {
    uni.hideLoading()
    const targetTeam = teamList.value.find(t => t.team_id === data.team_id)
    if (targetTeam) {
      targetTeam.current_status = 1
      targetTeam.game_id = data.game_id
    }
  })

  socket.on('game_started', (data) => {
    const targetTeam = teamList.value.find(t => t.team_id === data.team_id)
    if (targetTeam) {
      targetTeam.current_status = 2
    }
  })
}

watch(() => gameStore.socket, (newSocket) => {
  if (newSocket && newSocket.connected) {
    attachPageListeners(newSocket)
  }
}, { immediate: true })

onShow(() => {
  const token = uni.getStorageSync('token')
  if (token)
    gameStore.initSocket(token)
  if (currentView.value === 'teams')
    fetchTeamList(true, true)
})

// --- 🟢 核心逻辑：导游任务管理 ---

/**
 * 判断是否有待确认机制
 */
function getPendingConfirmMechanism(teamId) {
  if (gameStore.currentTeamId !== teamId)
    return null
  const task = gameStore.currentTask
  if (!task)
    return null

  // 1. 主任务检查
  const mainMechanisms = task.task_complete_mechanisms || []
  const confirmMech = mainMechanisms.find(m => m.mechanism_name === 'STAFF_CONFIRM')
  if (confirmMech) {
    const isDone = gameStore.completedMechanisms[task.task_id]?.[confirmMech.mechanism_name]
    if (!isDone)
      return { ...confirmMech, isMain: true }
  }

  // 2. 子任务检查
  if (gameStore.selectedSubTaskId) {
    const subTask = task.sub_tasks?.find(s => s.sub_task_id === gameStore.selectedSubTaskId)
    if (subTask && subTask.task_complete_mechanism) {
      const subConfirmMech = subTask.task_complete_mechanism.find(m => m.mechanism_name === 'STAFF_CONFIRM')
      if (subConfirmMech) {
        const isSubDone = gameStore.completedMechanisms[task.task_id]?.[subTask.sub_task_id]?.STAFF_CONFIRM
        if (!isSubDone)
          return { ...subConfirmMech, isMain: false }
      }
    }
  }
  return null
}

/**
 * 🟢 点击“任务管理”按钮 (弹窗模式)
 */
function handleTaskManage(team) {
  // 必须先加入房间
  if (!isJoined(team.team_id)) {
    uni.showToast({ title: '请先进入房间', icon: 'none' })
    return
  }

  const pendingMech = getPendingConfirmMechanism(team.team_id)
  const currentTaskName = gameStore.currentTask?.game_name || '当前任务'

  // 构建菜单项
  const itemList = []
  if (pendingMech) {
    itemList.push(`✅ 确认完成：${currentTaskName}`)
  }
  else {
    itemList.push(`⚠️ 强制完成：${currentTaskName}`) // 允许导游强制跳过
  }

  uni.showActionSheet({
    itemList,
    itemColor: pendingMech ? '#10B981' : '#F59E0B',
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.showModal({
          title: '操作确认',
          content: `确定手动通过节点：\n《${currentTaskName}》？`,
          success: (modalRes) => {
            if (modalRes.confirm) {
              const mechType = pendingMech ? pendingMech.mechanism_name : 'STAFF_CONFIRM'
              const isMain = pendingMech ? pendingMech.isMain : true
              gameStore.submitTask({}, mechType, isMain)
            }
          },
        })
      }
    },
  })
}

/**
 * 进入游戏控制台
 */
function handleOpenConsole(team) {
  if (!isJoined(team.team_id)) {
    uni.showToast({ title: '请先点击“进入房间”', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/game/play' })
}

// --- 常规业务方法 ---
function isJoined(teamId) {
  return gameStore.currentTeamId === teamId
}

function handleJoinRoom(team) {
  uni.showLoading({ title: '连接中...', mask: true })
  gameStore.joinTeam(team.team_id, {
    userId: userStore.userId,
    userName: userStore.userName,
  }).then(() => uni.hideLoading()).catch(() => uni.hideLoading())
}

function handleAssignScript(team) {
  uni.showActionSheet({
    itemList: scriptOptions.map(s => s.name),
    success: async (res) => {
      gameStore.selectScript(team.team_id, scriptOptions[res.tapIndex].id)
      uni.showLoading({ title: 'AI生成中...', mask: true })
    },
  })
}

function handleStartGame(team) {
  const liveTeam = teamList.value.find(t => t.team_id === team.team_id) || team
  const targetGameId = liveTeam.game_id || (gameStore.currentTeamId === liveTeam.team_id ? gameStore.gameId : null)

  if (!targetGameId)
    return uni.showToast({ title: '需重新分配剧本', icon: 'none' })

  uni.showModal({
    title: '准备开局',
    content: `开始《${liveTeam.team_name}》？`,
    confirmText: '开始',
    confirmColor: '#10B981',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '启动中...' })
        try {
          await gameStore.startGame(targetGameId)
          uni.hideLoading()
          uni.showToast({ title: '成功', icon: 'success' })
        }
        catch (error) {
          uni.hideLoading()
          uni.showModal({ title: '失败', content: `${error}`, showCancel: false })
        }
      }
    },
  })
}

function handleManualRefresh() {
  isRefreshing.value = true
  fetchTeamList(true, false).finally(() => {
    setTimeout(() => {
      isRefreshing.value = false
    }, 500)
    uni.showToast({ title: '已刷新', icon: 'none' })
  })
}

async function fetchTeamList(reset = false, silent = false) {
  if (reset)
    page.value = 1
  if (!silent && reset) {
    teamList.value = []
    isLoading.value = true
  }
  try {
    const res = await getTeamListAPI({ page: page.value, size: pageSize.value })
    const items = res.data?.items || res.items || []
    total.value = res.data?.total || res.total || 0
    teamList.value = reset ? items : [...teamList.value, ...items]
  }
  catch (error) { console.error(error) }
  finally {
    isLoading.value = false
    uni.stopPullDownRefresh()
  }
}

onPullDownRefresh(() => {
  currentView.value === 'teams' ? fetchTeamList(true) : setTimeout(() => uni.stopPullDownRefresh(), 1000)
})
onReachBottom(() => {
  if (teamList.value.length < total.value) {
    page.value++
    fetchTeamList()
  }
})

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
          {{ gameStore.isWsConnected ? 'LIVE' : 'OFF' }}
        </view>
      </view>
      <view class="flex bg-gray-100 p-1 rounded-full relative">
        <view class="px-4 py-1.5 rounded-full text-xs font-bold z-10" :class="currentView === 'dashboard' ? 'text-indigo-600' : 'text-gray-500'" @click="currentView = 'dashboard'">
          📊 态势
        </view>
        <view class="px-4 py-1.5 rounded-full text-xs font-bold z-10" :class="currentView === 'teams' ? 'text-indigo-600' : 'text-gray-500'" @click="currentView = 'teams'">
          👥 队伍
        </view>
        <view class="absolute top-1 bottom-1 w-[50%] bg-white rounded-full shadow-sm transition-all duration-300" :style="{ left: currentView === 'dashboard' ? '4px' : 'calc(50% - 4px)' }"></view>
      </view>
    </view>

    <view class="p-4 space-y-4">
      <template v-if="currentView === 'dashboard'">
        <view class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 shadow-lg text-white">
          <text class="text-xl font-bold">
            📍 王记粮仓 (#042)
          </text>
        </view>
      </template>

      <template v-else>
        <view class="flex justify-between items-center mb-2">
          <text class="text-sm text-gray-500 font-bold ml-1">
            当前队伍
          </text>
          <button class="bg-white border border-gray-200 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1" @click="handleManualRefresh">
            <text :class="isRefreshing ? 'animate-spin' : ''">
              🔄
            </text> 刷新
          </button>
        </view>

        <view class="space-y-5">
          <view v-for="team in teamList" :key="team.team_id" class="bg-white rounded-[24px] shadow-xl overflow-hidden border border-gray-50 animate-slide-up">
            <view class="p-5 flex justify-between items-start bg-gradient-to-br from-white to-gray-50">
              <view class="flex items-center gap-2">
                <text class="text-xl font-black text-gray-900">
                  {{ team.team_name }}
                </text>
                <view :class="[getStatusConfig(team.current_status).bg, getStatusConfig(team.current_status).color]" class="px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {{ getStatusConfig(team.current_status).text }}
                </view>
              </view>
              <view class="bg-indigo-600 px-3 py-2 rounded-xl text-center shadow-md">
                <text class="block text-[8px] text-white/70 font-bold mb-0.5">
                  队伍码
                </text>
                <text class="text-lg font-black text-white font-mono">
                  {{ team.binding_code }}
                </text>
              </view>
            </view>

            <view class="px-5 py-4 border-t border-gray-50 flex justify-between items-center">
              <view class="flex -space-x-2">
                <view class="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs">
                  👤
                </view>
              </view>
              <text class="text-lg font-black text-indigo-600">
                {{ gameStore.roomStates[team.team_id]?.memberCount || team.size }} <text class="text-xs text-gray-400 font-normal">
                  / 5
                </text>
              </text>
            </view>

            <view class="px-5 py-4 bg-gray-50/50 flex gap-3">
              <button v-if="!isJoined(team.team_id)" class="flex-1 bg-white border border-indigo-200 text-indigo-600 rounded-xl py-3 text-sm font-bold shadow-sm" @click="handleJoinRoom(team)">
                👉 进入房间
              </button>

              <template v-else>
                <button v-if="team.current_status === 0" class="flex-1 bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold shadow-lg" @click="handleAssignScript(team)">
                  🎭 分配剧本
                </button>
                <template v-else-if="team.current_status === 1">
                  <button class="flex-1 bg-blue-500 text-white rounded-xl py-3 text-sm font-bold shadow-lg" @click="handleAssignScript(team)">
                    🔄 重选
                  </button>
                  <button class="flex-1 bg-emerald-500 text-white rounded-xl py-3 text-sm font-bold shadow-lg" @click="handleStartGame(team)">
                    🚀 开始
                  </button>
                </template>

                <template v-else-if="team.current_status === 2">
                  <view class="flex-1 flex gap-2">
                    <button
                      class="flex-1 rounded-xl py-3 text-sm font-bold shadow-sm flex items-center justify-center gap-1 active:scale-95 transition-all"
                      :class="getPendingConfirmMechanism(team.team_id) ? 'bg-orange-500 text-white shadow-orange-200 animate-pulse' : 'bg-white border border-gray-200 text-gray-600'"
                      @click="handleTaskManage(team)"
                    >
                      <text>{{ getPendingConfirmMechanism(team.team_id) ? '🔔 确认' : '⚙️ 管理' }}</text>
                    </button>
                    <button
                      class="flex-[1.5] bg-indigo-600 text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-95"
                      @click="handleOpenConsole(team)"
                    >
                      <template v-if="isJoined(team.team_id) && gameStore.currentTask">
                        <view class="flex flex-col items-start leading-none text-left">
                          <text class="text-[9px] opacity-70 font-normal">
                            进行中
                          </text>
                          <text class="truncate max-w-[5em]">
                            {{ gameStore.currentTask.game_name || '任务' }}
                          </text>
                        </view>
                        <text class="text-xs">
                          👉
                        </text>
                      </template>
                      <template v-else>
                        🎮 控制台
                      </template>
                    </button>
                  </view>
                </template>

                <button v-else-if="team.current_status === 3" class="flex-1 bg-gray-200 text-gray-500 rounded-xl py-3 text-sm font-bold" disabled>
                  🏁 已结束
                </button>
              </template>
            </view>
          </view>
        </view>
      </template>
    </view>
    <CustomTabBar :current="0" />
  </view>
</template>

<style scoped>
button::after {
  border: none;
}
button:active {
  transform: scale(0.97);
}
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
.animate-spin {
  animation: spin 1s linear infinite;
  display: inline-block;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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
</style>

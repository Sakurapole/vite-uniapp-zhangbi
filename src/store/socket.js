import { defineStore } from 'pinia'
import { io } from 'socket.io-client'
import { useUserStore } from '@/store/user'
import { useGameStore } from './game' // 引入游戏数据专用 Store

export const useSocketStore = defineStore('socket', {
  state: () => ({
    socket: null,
    isConnected: false,

    // --- 🎮 游戏核心状态 ---
    isGameStarted: false,
    role: '',
    currentTask: null,
    currentTaskId: '',

    // --- 🤖 AI/NPC 对话状态 (流式) ---
    showAiPanel: false, // AI面板开关
    showNpcPanel: false, // NPC面板开关
    isAiResponding: false, // AI 是否正在打字
    isNpcResponding: false, // NPC 是否正在打字

    // --- 📷 图片上传/识别状态 ---
    uploadStatus: 'idle', // idle(空闲), verifying(识别中), success(成功), fail(失败)
  }),

  actions: {
    // --- 连接初始化 ---
    connect() {
      const userStore = useUserStore()
      if (this.socket?.connected) {
        console.log('⚡ Socket 已经连接，跳过初始化')
        return
      }

      // TODO: 替换为真实服务器地址
      const url = ''

      console.log('🚀 正在连接 Socket, Token:', userStore.token ? '已携带' : '无')

      this.socket = io(url, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        auth: {
          token: userStore.token, // 必传 Token
        },
      })

      this.setupBaseListeners()
    },

    disconnect() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
        this.isConnected = false
      }
    },

    // --- 🎧 核心监听器设置 ---
    setupBaseListeners() {
      if (!this.socket)
        return
      const gameStore = useGameStore()
      const userStore = useUserStore()

      // 1. 基础连接事件
      this.socket.on('connect', () => {
        this.isConnected = true
        console.log('✅ [Socket] 连接成功 ID:', this.socket.id)

        // 断线重连逻辑：重新加入房间
        if (gameStore.currentTeamId && userStore.userId) {
          console.log('🔄 断线重连，尝试重新入房...')
          this.joinRoom(gameStore.currentTeamId)
        }
      })

      this.socket.on('disconnect', () => {
        this.isConnected = false
        console.log('❌ [Socket] 断开连接')
      })

      // 2. 房间与成员管理
      this.socket.on('game:room_joined', (data) => {
        console.log('🏠 加入房间成功:', data)
        gameStore.setRoomInfo(data) // 同步到 GameStore
        uni.showToast({ title: '已加入房间', icon: 'success' })
      })

      this.socket.on('team:member_joined', (data) => {
        console.log('👤 新成员加入:', data)
        if (data.all_members)
          gameStore.updateMembers(data.all_members)
      })

      this.socket.on('team:member_left', (data) => {
        console.log('👋 成员离开:', data)
        if (data.all_members)
          gameStore.updateMembers(data.all_members)
      })

      // 3. 游戏流程控制
      this.socket.on('game:game_created', (data) => {
        console.log('📝 剧本已生成:', data)
        if (data.game_id)
          gameStore.gameId = data.game_id
        uni.showToast({ title: '剧本就绪', icon: 'success' })
      })

      this.socket.on('game_started', (data) => {
        console.log('🚀 游戏开始:', data)
        this.handleGameStarted(data)
        uni.showToast({ title: '游戏开始！', icon: 'success' })
        uni.navigateTo({ url: '/pages/game/play' })
      })

      this.socket.on('game:new_task', (data) => {
        console.log('📦 新任务:', data)
        // 更新任务数据
        if (data.player_state) {
          gameStore.updateGameState(data.player_state)
        }
        else if (data.task) {
          gameStore.updateTask(data.task)
        }

        // 弹窗提示
        uni.vibrateLong()
        uni.showModal({
          title: '新任务',
          content: data.task_msg || '任务目标已更新',
          showCancel: false,
          confirmText: '收到',
        })
      })

      // 4. 任务进度与机制反馈
      this.socket.on('game:mechanism_complete', (data) => {
        console.log('⚙️ 机制达成:', data)
        // 同步到 GameStore 的进度里
        gameStore.recordMechanism(data.task_id, data.sub_task_id, data.completed_mechanism)

        uni.showToast({ title: `${data.completed_mechanism || '操作'} 完成`, icon: 'success' })
      })

      this.socket.on('game:task_complete', (data) => {
        console.log('✅ 任务完成:', data)
        uni.showToast({ title: '当前任务完成！', icon: 'success' })
        // 如果有子任务ID，记录完成状态
        if (data.sub_task_id) {
          gameStore.completeSubTask(data.task_id, data.sub_task_id)
        }
      })

      this.socket.on('game:task_failed', (data) => {
        console.error('❌ 任务失败:', data)
        uni.showModal({
          title: '任务失败',
          content: data.task_msg || '请重试',
          showCancel: false,
          confirmColor: '#DD524D',
        })
      })

      // ==========================================
      // 5. 🤖 AI 助手流式对话 (Streaming)
      // ==========================================

      this.socket.on('game:assistant_stream_start', () => {
        this.isAiResponding = true
        // 通知 UI 清空输入框或显示 loading
        uni.$emit('ai-chat-start')
      })

      this.socket.on('game:assistant_stream_chunk', (data) => {
        // ⚡️ 核心：实时将文字推送到前端界面
        uni.$emit('ai-chat-stream', data.chunk)
      })

      this.socket.on('game:assistant_stream_end', (data) => {
        this.isAiResponding = false
        console.log('🤖 AI响应结束, Session:', data.session_id)
        uni.$emit('ai-chat-end', data)
      })

      // ==========================================
      // 6. 🎭 NPC 剧情流式对话
      // ==========================================

      this.socket.on('game:npc_stream_start', () => {
        this.isNpcResponding = true
        uni.$emit('npc-chat-start')
      })

      this.socket.on('game:npc_stream_chunk', (data) => {
        uni.$emit('npc-chat-stream', data.chunk)
      })

      this.socket.on('game:npc_stream_end', (data) => {
        this.isNpcResponding = false
        console.log('🎭 NPC响应结束', data)

        // 剧情触发任务完成
        if (data.task_completed || data.action === 'TRIGGER_SUBTASK') {
          uni.showToast({ title: '剧情任务触发！', icon: 'success' })
        }

        uni.$emit('npc-chat-end', data)
      })

      this.socket.on('game:npc_waiting_image', (data) => {
        // NPC 索要图片，弹窗提示用户去拍照
        uni.showModal({
          title: 'NPC 请求',
          content: data.message,
          confirmText: '去拍照',
          success: (res) => {
            if (res.confirm)
              uni.$emit('trigger-camera')
          },
        })
      })

      // ==========================================
      // 7. 📷 图片识别流程
      // ==========================================

      this.socket.on('game:image_verify_start', () => {
        this.uploadStatus = 'verifying'
        uni.showLoading({ title: 'AI 正在识别...' })
      })

      this.socket.on('game:image_verify_result', (data) => {
        uni.hideLoading()
        this.uploadStatus = data.success ? 'success' : 'fail'

        if (data.success) {
          uni.showToast({ title: '✅ 识别成功', icon: 'success' })
        }
        else {
          uni.showModal({
            title: '识别不匹配',
            content: `识别结果：${data.identified_attraction || '未知'}\n目标要求：${data.target_attraction || '未知'}`,
            showCancel: false,
          })
        }
      })

      this.socket.on('game:image_verify_error', (data) => {
        uni.hideLoading()
        this.uploadStatus = 'fail'
        uni.showToast({ title: `识别出错: ${data.error}`, icon: 'none' })
      })

      // 8. 错误处理
      this.socket.on('game:error', (err) => {
        console.error('🔥 服务端报错:', err)
        uni.showToast({ title: err.message || '未知错误', icon: 'none' })
      })
    },

    // --- 业务操作 Actions ---

    handleGameStarted(data) {
      const gameStore = useGameStore()

      this.isGameStarted = true
      this.role = data.role || '游客'
      this.currentTaskId = data.cur_task_id
      this.currentTask = data.cur_task

      // 开启功能面板
      this.showAiPanel = true
      this.showNpcPanel = true

      // 同步数据到 GameStore (推荐做法：让 GameStore 管理所有游戏数据)
      gameStore.updateGameState({
        role: this.role,
        cur_task: this.currentTask,
        cur_task_id: this.currentTaskId,
      })
    },

    // 加入房间
    joinRoom(teamId) {
      const userStore = useUserStore()
      if (!this.checkConnection())
        return

      this.socket.emit('game:join_room', {
        team_id: teamId,
        user_id: userStore.userInfo.id, // 确保是 ID
        username: userStore.userInfo.username || '玩家',
      })
    },

    // 选剧本
    selectScript(teamId, scriptId) {
      if (!this.checkConnection())
        return
      this.socket.emit('game:select_script', {
        team_id: teamId,
        script_id: scriptId,
        timestamp: new Date().toISOString(),
      })
    },

    // 开始游戏
    startGame(id) {
      if (!this.checkConnection())
        return
      const gameStore = useGameStore()
      const targetId = id || gameStore.gameId

      if (!targetId) {
        uni.showToast({ title: '未找到 GameID', icon: 'none' })
        return
      }

      this.socket.emit('game:start', { game_id: targetId })
    },

    // 辅助检查
    checkConnection() {
      if (!this.socket || !this.isConnected) {
        uni.showToast({ title: '服务器未连接', icon: 'none' })
        return false
      }
      return true
    },
  },
})

import { defineStore } from 'pinia'
import { io } from 'socket.io-client'
import { useUserStore } from '@/store/user'
import { useGameStore } from './game'

export const useSocketStore = defineStore('socket', {
  state: () => ({
    socket: null,
    isConnected: false,
    connectError: null,
    isGameStarted: false, // 标记游戏是否开始
    role: '', // 玩家角色
    currentTask: null, // 当前任务详情 (cur_task)
    currentTaskId: '', // 当前任务ID

    // 🆕 新增：功能面板开关 (对应参考代码的 style.display = 'block')
    showAiPanel: false, // 是否显示 AI 助手
    showNpcPanel: false, // 是否显示 NPC 对话
  }),

  actions: {

    connect() {
      const userStore = useUserStore()

      if (this.socket?.connected) {
        console.log('⚡ Socket 已经连接，跳过初始化')
        return
      }

      const url = ''

      console.log('🚀 正在连接 Socket, 目标:', url || '默认路径')

      this.socket = io(url, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        auth: {
          token: userStore.token,
        },
      })

      this.setupBaseListeners()
    },

    disconnect() {
      if (this.socket) {
        this.socket.disconnect()
        this.socket = null
        this.isConnected = false
        console.log('🔌 Socket 主动断开')
      }
    },

    setupBaseListeners() {
      if (!this.socket)
        return
      const gameStore = useGameStore()

      this.socket.on('connect', () => {
        this.isConnected = true
        console.log('✅ [Socket] 底层连接成功! ID:', this.socket.id)

        if (this.currentTeamId && this.userStore?.userId) {
          console.log('🔄 检测到断线重连，正在自动恢复身份...')
          this.joinTeam(this.currentTeamId, {
            userId: this.userStore.userId,
            userName: this.userStore.userName,
          })
        }
      })

      this.socket.on('disconnect', () => {
        this.isConnected = false
        console.log('❌ [Socket] 断开连接')
      })

      this.socket.on('game:connected', (data) => {
        console.log(`📡 [Socket] 收到业务连接确认 SID: ${data.sid}`)
      })

      this.socket.on('game:room_joined', (data) => {
        console.log('🏠 [Socket] 我已加入房间:', data)
        gameStore.setRoomInfo(data)
        uni.showToast({ title: '加入房间成功', icon: 'success' })
      })

      this.socket.on('game:room_left', (data) => {
        console.log('👋 [Socket] 我已离开房间', data)
        gameStore.resetState()
      })

      this.socket.on('team:member_joined', (data) => {
        console.log('👤 [Socket] 新成员加入:', data)

        const memberName = data.username || '未知用户'
        uni.showToast({ title: `${memberName} 加入了队伍`, icon: 'none' })

        if (data.all_members && typeof gameStore.updateMembers === 'function') {
          gameStore.updateMembers(data.all_members)
        }
        else if (data.members_count) {
          gameStore.updateMemberCount(data.members_count)
        }
      })

      this.socket.on('team:member_left', (data) => {
        console.log('👋 [Socket] 成员离开:', data)

        const memberName = data.username || '有人'
        uni.showToast({ title: `${memberName} 离开了队伍`, icon: 'none' })

        if (data.all_members && typeof gameStore.updateMembers === 'function') {
          gameStore.updateMembers(data.all_members)
        }
      })

      this.socket.on('game:game_created', (data) => {
        console.log('📝 [Socket] 剧本已创建:', data)
        if (data.game_id) {
          gameStore.gameId = data.game_id
        }
        uni.showToast({ title: '剧本已就绪', icon: 'success' })
      })

      this.socket.on('game_started', (data) => {
        console.log('🚀 [Socket] 收到游戏开始信号:', data)

        // 1. 调用更新方法，保存数据
        this.handleGameStarted(data)

        // 2. 通知 UI (例如跳转页面)
        uni.showToast({ title: '游戏开始！', icon: 'success' })

        // 建议：跳转到专门的游戏游玩页面
        uni.navigateTo({ url: '/pages/game/play' })
      })

      this.socket.on('game:error', (err) => {
        console.error('🔥 [Socket服务端报错]', err)
        uni.showModal({
          title: '服务端拒绝',
          content: JSON.stringify(err),
          showCancel: false,
        })
      })

      this.socket.on('game:message', (data) => {
        console.log(`💬 [消息] ${data.user_id}: ${data.message}`)
      })

      this.socket.on('game:event', (data) => {
        console.log('🎮 [事件]', data)

        uni.showToast({ title: `事件: ${data.event_type}`, icon: 'none' })
      })

      this.socket.on('game:new_task', (data) => {
        console.log('📦 [Socket] 收到新任务:', data)
        if (data.player_state) {
          gameStore.updateGameState(data.player_state)
        }
        else if (data.task) {
          gameStore.currentTaskId = data.task_id
          gameStore.currentTask = data.task
        }
        uni.showModal({
          title: '新任务',
          content: data.task_msg || '你收到了一个新的任务',
          showCancel: false,
        })
      })
    },

    /**
     * 加入队伍房间
     * @param {string} teamId 队伍ID
     */
    joinRoom(teamId) {
      const userStore = useUserStore()
      if (!this.checkConnection())
        return

      console.log('📤 [客户端] 请求加入房间:', teamId, userStore.userInfo.id)

      this.socket.emit('game:join_room', {
        team_id: teamId,
        user_id: userStore.userInfo.id,
        username: userStore.userInfo.username || userStore.userInfo.name || '导游',
      })
      console.log(userStore.userInfo.user_id, userStore.userInfo.id)
    },

    /**
     * 导游为队伍选择剧本
     * @param {string} teamId 队伍ID (必须)
     * @param {string} scriptId 剧本ID (必须)
     */
    selectScript(teamId, scriptId) {
      if (!this.checkConnection())
        return

      console.log(`📤 [客户端] 选择剧本: Team=${teamId}, Script=${scriptId}`)

      this.socket.emit('game:select_script', {
        team_id: teamId,
        script_id: scriptId,
        timestamp: new Date().toISOString(),
      })
      console.log('✅ [客户端] 选择剧本请求已发送')
    },

    handleGameStarted(data) {
      // 保存核心状态
      this.isGameStarted = true
      this.gameId = data.game_id
      this.role = data.role || '游客' // 对应 document.getElementById...textContent
      this.currentTaskId = data.cur_task_id
      this.currentTask = data.cur_task // 对应 updateTaskInfo

      // 开启功能面板 (参考代码逻辑：游戏开始后这些面板可用)
      this.showAiPanel = true
      this.showNpcPanel = true

      console.log('✅ [Store] 游戏状态已同步:', this.currentTask)
    },

    /**
     * 导游开始游戏
     * @param {string} id 游戏ID 或 队伍ID
     */
    startGame(id) {
      if (!this.checkConnection())
        return

      // 优先用传入的 id，没有则用 store 里的
      const targetId = id || this.gameId

      if (!targetId) {
        uni.showToast({ title: '未找到 GameID，请先分配剧本', icon: 'none' })
        return
      }

      console.log('🚀 [客户端] 发送开始指令, GameID:', targetId)

      this.socket.emit('game:start', {
        game_id: targetId,
        timestamp: new Date().toISOString(),
      })
    },

    /**
     * 通用发送方法
     */
    emit(event, data) {
      if (this.checkConnection()) {
        this.socket.emit(event, data)
      }
    },

    checkConnection() {
      if (!this.socket || !this.isConnected) {
        uni.showToast({ title: '服务器未连接', icon: 'none' })
        console.warn('⚠️ 尝试发送消息但 Socket 未连接')
        return false
      }
      return true
    },
  },
})

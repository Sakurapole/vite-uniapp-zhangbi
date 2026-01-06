/* eslint-disable prefer-promise-reject-errors */
import { defineStore } from 'pinia'
import { io } from 'socket.io-client'

export const useGameStore = defineStore('game', {
  state: () => ({
    socket: null,
    isWsConnected: false,

    // 基础信息
    currentTeamId: null,
    gameId: null,
    roomStates: {},

    // 🆕 新增：游戏运行时的核心状态 (必须存下来，不然游戏页没法显示)
    isGameStarted: false,
    role: '', // 你的角色
    currentTask: null, // 当前任务
    currentTaskId: '',
  }),

  actions: {
    initSocket() {
      if (this.socket?.connected)
        return

      // TODO: 确保这是正确的地址
      const url = '/'

      console.log('🚀 [GameStore] 开始连接 Socket...')

      this.socket = io(url, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
      })

      // --- 基础连接 ---
      this.socket.on('connect', () => {
        this.isWsConnected = true
        console.log('✅ [Socket] 连接成功! ID:', this.socket.id)
      })

      this.socket.on('disconnect', () => {
        this.isWsConnected = false
        console.log('❌ [Socket] 连接断开')
      })

      this.socket.on('game:game_created', (data) => {
        console.log('📝 [Socket] 收到剧本信息:', data)
        if (data.game_id) {
          this.gameId = data.game_id
        }
        uni.hideLoading()
        uni.showToast({ title: '剧本已就绪', icon: 'success' })
      })

      // 2. 加入房间
      this.socket.on('game:room_joined', (data) => {
        console.log('🏠 [Socket] 成功加入房间:', data)
        this.currentTeamId = data.team_id
        this.updateRoomState(data.team_id, { memberCount: data.members_count })
        uni.showToast({ title: '已进入房间', icon: 'none' })
      })

      // 3. 游戏真正开始 (全局广播)
      this.socket.on('game_started', (data) => {
        console.log('🚀 [Socket] 收到游戏开始广播:', data)

        // 🟢 关键修复：保存游戏状态
        this.isGameStarted = true
        this.role = data.role || '游客'
        this.currentTaskId = data.cur_task_id
        this.currentTask = data.cur_task

        uni.showToast({ title: '游戏开始！', icon: 'success' })
      })

      // 4. 成员变动
      this.socket.on('team:member_joined', (data) => {
        this.updateRoomState(data.team_id, {
          memberCount: data.members_count,
          members: data.all_members || [],
        })
      })

      // 5. 全局错误监听 (防止静默失败)
      this.socket.on('game:error', (err) => {
        console.error('🔥 [Socket服务端报错]', err)
        uni.hideLoading() // 任何错误发生时，确保关闭 loading
      })
    },

    // --- 加入房间 (Promise) ---
    joinTeam(teamId, userInfo) {
      return new Promise((resolve, reject) => {
        if (!this.checkConnection())
          return reject('Socket未连接')

        console.log('🔍 [诊断] 准备加入房间:', teamId)

        // 临时监听器
        const successHandler = (data) => {
          if (data.team_id === teamId) {
            this.socket.off('game:room_joined', successHandler)
            this.currentTeamId = data.team_id
            this.updateRoomState(data.team_id, { memberCount: data.members_count })
            resolve(true)
          }
        }

        this.socket.on('game:room_joined', successHandler)

        this.socket.emit('game:join_room', {
          team_id: teamId,
          user_id: userInfo.userId,
          username: userInfo.userName,
        })

        // 超时保护
        setTimeout(() => {
          if (this.currentTeamId !== teamId) {
            this.socket.off('game:room_joined', successHandler)
            resolve(false) // 或者 reject('超时')
          }
        }, 5000)
      })
    },

    // --- 选剧本 ---
    selectScript(teamId, scriptId) {
      if (!this.checkConnection())
        return
      const payload = { team_id: teamId, script_id: scriptId, timestamp: new Date().toISOString() }
      console.log(`📤 [GameStore] 选剧本:`, payload)
      this.socket.emit('game:select_script', payload)
    },

    // --- 🟢 关键修复：开始游戏 (Promise版) ---
    startGame(gameId) {
      return new Promise((resolve, reject) => {
        if (!this.checkConnection())
          return reject('Socket未连接')

        const payload = { game_id: gameId }
        console.log(`🚀 [GameStore] 发送开始指令:`, payload)

        const successHandler = (data) => {
          console.log('✅ [Promise] 游戏启动成功')
          resolve(data)
        }

        const errorHandler = (err) => {
          console.error('❌ [Promise] 游戏启动被拒绝:', err)
          // 如果这里报错 "只有导游才能开始"，通常是因为 Token 没传或 JoinRoom 时 ID 传错了
          reject(err.message || '启动失败')
        }

        const cleanup = () => {
          this.socket.off('game_started', successHandler)
          this.socket.off('game:error', errorHandler)
        }

        this.socket.once('game_started', successHandler)
        this.socket.once('game:error', errorHandler)

        this.socket.emit('game:start', payload)

        setTimeout(() => {
          cleanup()
          reject('请求超时，服务器无响应')
        }, 8000)
      })
    },

    // --- 辅助 ---
    checkConnection() {
      if (!this.socket || !this.isWsConnected) {
        uni.showToast({ title: 'Socket未连接', icon: 'none' })
        return false
      }
      return true
    },

    updateRoomState(teamId, newState) {
      if (!teamId)
        return
      this.roomStates[teamId] = { ...(this.roomStates[teamId] || {}), ...newState }
    },
  },
})

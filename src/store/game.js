/* eslint-disable no-use-before-define */
/* eslint-disable prefer-promise-reject-errors */
import { defineStore } from 'pinia'
import { io } from 'socket.io-client'

export const useGameStore = defineStore('game', {
  state: () => ({
    socket: null,
    isWsConnected: false,

    // --- 基础信息 ---
    currentTeamId: null,
    gameId: null,
    roomStates: {},

    // --- 游戏运行时的核心状态 ---
    isGameStarted: false,
    role: '',
    currentTask: null, // 当前大任务详情
    currentTaskId: '',

    // 🆕 新增：任务进度与交互状态
    completedMechanisms: {}, // 记录已完成的机制 (如: {taskId: {subTaskId: {gps: true}}})
    completedSubtasks: {}, // 记录已完成的子任务 (如: {taskId: ['sub_1', 'sub_2']})
    uploadStatus: 'idle', // 图片上传状态: idle | verifying | success | fail
  }),

  actions: {
    // 🟢 修改：接收 token 用于认证
    initSocket(token) {
      if (this.socket?.connected)
        return

      // TODO: 替换为你的真实后端地址
      const url = '/'

      console.log('🚀 [GameStore] 开始连接 Socket, Token:', token ? '已携带' : '无')

      this.socket = io(url, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        // 🟢 关键：携带 Token，否则后端无法识别身份
        auth: {
          token,
        },
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

      // --- 业务监听 ---

      // 1. 剧本创建
      this.socket.on('game:game_created', (data) => {
        console.log('📝 [Socket] 收到剧本信息:', data)
        if (data.game_id)
          this.gameId = data.game_id
        uni.hideLoading()
        uni.showToast({ title: '剧本已就绪', icon: 'success' })
      })

      // 2. 加入房间成功
      this.socket.on('game:room_joined', (data) => {
        console.log('🏠 [Socket] 成功加入房间:', data)
        this.currentTeamId = data.team_id
        this.updateRoomState(data.team_id, { memberCount: data.members_count })
        uni.showToast({ title: '已进入房间', icon: 'none' })
      })

      // 3. 游戏开始
      this.socket.on('game_started', (data) => {
        console.log('🚀 [Socket] 游戏开始:', data)
        this.isGameStarted = true
        this.role = data.role || '游客'
        this.currentTaskId = data.cur_task_id
        this.currentTask = data.cur_task
        uni.showToast({ title: '游戏开始！', icon: 'success' })
      })

      // 4. 成员加入
      this.socket.on('team:member_joined', (data) => {
        this.updateRoomState(data.team_id, {
          memberCount: data.members_count,
          members: data.all_members || [],
        })
      })

      // 🆕 5. 成员离开 (补充)
      this.socket.on('team:member_left', (data) => {
        console.log('👋 [Socket] 成员离开:', data)
        this.updateRoomState(data.team_id, {
          memberCount: data.members_count,
          members: data.all_members || [],
        })
      })

      // 🆕 6. 新任务通知 (核心流程)
      this.socket.on('game:new_task', (data) => {
        console.log('📦 [Socket] 新任务:', data)
        // 更新当前任务数据
        if (data.task) {
          this.currentTask = data.task
          this.currentTaskId = data.task_id
        }
        // 提示用户
        uni.vibrateLong()
        uni.showModal({
          title: '新任务',
          content: data.task_msg || '任务目标已更新',
          showCancel: false,
          confirmText: '收到',
        })
      })

      // 🆕 7. 机制完成 (如：某个子步骤完成、GPS验证通过)
      this.socket.on('game:mechanism_complete', (data) => {
        console.log('⚙️ [Socket] 机制达成:', data)
        // 记录到本地状态，以便 UI 显示勾选状态
        this.recordMechanism(data.task_id, data.sub_task_id, data.completed_mechanism)
        uni.showToast({ title: '操作成功', icon: 'success' })
      })

      // 🆕 8. 任务完成 (大任务或子任务)
      this.socket.on('game:task_complete', (data) => {
        console.log('✅ [Socket] 任务完成:', data)
        uni.showToast({ title: '任务完成！', icon: 'success' })
        // 如果是子任务，记录下来
        if (data.sub_task_id) {
          this.completeSubTask(data.task_id, data.sub_task_id)
        }
      })

      // 🆕 9. 任务失败
      this.socket.on('game:task_failed', (data) => {
        console.error('❌ [Socket] 任务失败:', data)
        uni.showModal({
          title: '任务失败',
          content: data.task_msg || '请重试',
          showCancel: false,
          confirmColor: '#DD524D',
        })
      })

      // 🆕 10. 图片验证流程 (开始)
      this.socket.on('game:image_verify_start', () => {
        this.uploadStatus = 'verifying'
        uni.showLoading({ title: 'AI 正在识别...' })
      })

      // 🆕 11. 图片验证结果
      this.socket.on('game:image_verify_result', (data) => {
        uni.hideLoading()
        this.uploadStatus = data.success ? 'success' : 'fail'
        if (data.success) {
          uni.showToast({ title: '识别成功', icon: 'success' })
        }
        else {
          uni.showModal({
            title: '识别不匹配',
            content: `目标: ${data.target_attraction || '未知'}\n识别为: ${data.identified_attraction || '未知'}`,
            showCancel: false,
          })
        }
      })

      // 🆕 12. 图片验证错误
      this.socket.on('game:image_verify_error', (data) => {
        uni.hideLoading()
        this.uploadStatus = 'fail'
        uni.showToast({ title: '识别出错', icon: 'none' })
      })

      // 全局错误
      this.socket.on('game:error', (err) => {
        console.error('🔥 [Socket服务端报错]', err)
        uni.hideLoading()
      })
    },

    // --- 加入房间 ---
    joinTeam(teamId, userInfo) {
      return new Promise((resolve, reject) => {
        if (!this.checkConnection())
          return reject('Socket未连接')

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
          user_id: userInfo.userId, // 确保这是 ID
          username: userInfo.userName,
        })

        setTimeout(() => {
          this.socket.off('game:room_joined', successHandler)
          // 这里不做 reject，防止重连时报错影响体验
        }, 5000)
      })
    },

    // --- 选剧本 ---
    selectScript(teamId, scriptId) {
      if (!this.checkConnection())
        return
      const payload = { team_id: teamId, script_id: scriptId, timestamp: new Date().toISOString() }
      this.socket.emit('game:select_script', payload)
    },

    // --- 开始游戏 ---
    startGame(gameId) {
      return new Promise((resolve, reject) => {
        if (!this.checkConnection())
          return reject('Socket未连接')

        const successHandler = (data) => {
          cleanup()
          resolve(data)
        }
        const errorHandler = (err) => {
          cleanup()
          reject(err.message || '启动失败')
        }
        const cleanup = () => {
          this.socket.off('game_started', successHandler)
          this.socket.off('game:error', errorHandler)
        }

        this.socket.once('game_started', successHandler)
        this.socket.once('game:error', errorHandler)
        this.socket.emit('game:start', { game_id: gameId })

        setTimeout(() => {
          cleanup()
          reject('请求超时')
        }, 8000)
      })
    },

    // --- 辅助方法 ---
    checkConnection() {
      if (!this.socket || !this.isWsConnected) {
        uni.showToast({ title: '网络未连接', icon: 'none' })
        return false
      }
      return true
    },

    updateRoomState(teamId, newState) {
      if (!teamId)
        return
      this.roomStates[teamId] = { ...(this.roomStates[teamId] || {}), ...newState }
    },

    // 🆕 记录机制完成状态 (用于 UI 显示)
    recordMechanism(taskId, subTaskId, mechanismKey) {
      if (!this.completedMechanisms[taskId]) {
        this.completedMechanisms[taskId] = {}
      }
      if (subTaskId) {
        if (!this.completedMechanisms[taskId][subTaskId]) {
          this.completedMechanisms[taskId][subTaskId] = {}
        }
        this.completedMechanisms[taskId][subTaskId][mechanismKey] = true
      }
      else {
        this.completedMechanisms[taskId][mechanismKey] = true
      }
    },

    // 🆕 记录子任务完成
    completeSubTask(taskId, subTaskId) {
      if (!this.completedSubtasks[taskId]) {
        this.completedSubtasks[taskId] = []
      }
      if (!this.completedSubtasks[taskId].includes(subTaskId)) {
        this.completedSubtasks[taskId].push(subTaskId)
      }
    },
    /**
     * 提交任务核心逻辑
     * @param {object} payload 提交的数据
     * @param {string} mechanismType 机制类型 (例如 'GPS_CHECK')
     * @param {boolean} isMainTaskMechanism 是否为主任务机制 (用于辅助任务判定)
     */
    submitTask(data, mechanismType, isMainTaskMechanism = false) {
      if (!this.checkConnection())
        return

      const submissionData = {
        mechanism_type: mechanismType,
        ...data, // 比如 { user_location_coordinate: [lng, lat] }
      }

      const payload = {
        game_id: this.gameId,
        task_id: this.currentTaskId,
        submission_data: submissionData,
        timestamp: new Date().toISOString(),
      }

      if (this.currentTask.having_sub_tasks && this.selectedSubTaskId) {
      // isSubTaskAuxiliary 是我们在 getters 里写好的
        if (!this.isSubTaskAuxiliary || !isMainTaskMechanism) {
          payload.sub_task_id = this.selectedSubTaskId
        }
      }

      console.log('📤 [Socket] 提交任务:', payload)
      this.socket.emit('game:task_submit', payload)

      uni.showLoading({ title: '提交中...' })
      // 注意：结果会通过 game:mechanism_complete 或 game:task_complete 异步返回
      setTimeout(() => uni.hideLoading(), 2000)
    },

  },
})

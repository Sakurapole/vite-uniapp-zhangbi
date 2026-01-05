import { defineStore } from 'pinia'
import { io } from 'socket.io-client'

export const useGameStore = defineStore('game', {
  state: () => ({
    socket: null,
    isWsConnected: false,
    roomStates: {}, // 存储每个队伍的实时人数、状态等
  }),

  actions: {
    initSocket() {
      if (this.socket)
        return

      this.socket = io('/', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
      })

      this.socket.on('connect', () => {
        this.isWsConnected = true
        console.log('✅ WebSocket Connected')
      })

      this.socket.on('disconnect', () => {
        this.isWsConnected = false
      })

      // 监听成员加入，更新本地 roomStates
      this.socket.on('team:member_joined', (data) => {
        const { team_id, members_count } = data
        this.roomStates[team_id] = {
          ...this.roomStates[team_id],
          memberCount: members_count,
        }
      })
    },

    // 加入房间
    joinTeam(teamId, userInfo) {
      if (!this.socket)
        return
      this.socket.emit('game:join_room', {
        team_id: teamId,
        user_id: userInfo.userId,
        username: userInfo.userName,
      })
    },

    /**
     * 核心：通用事件发送方法 (解决 emitEvent is not a function)
     */
    emitEvent(eventName, payload) {
      if (!this.socket || !this.isWsConnected) {
        uni.showToast({ title: 'Socket未连接', icon: 'none' })
        return
      }

      // 这里的逻辑参考你提供的 selectScript / startGame
      const data = {
        ...payload,
        timestamp: new Date().toISOString(),
      }

      console.log(`📤 发送事件 [${eventName}]:`, data)
      this.socket.emit(eventName, data)
    },

    // 辅助：发送心跳
    sendPing(userId) {
      this.emitEvent('game:ping', { user_id: userId })
    },
  },
})

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loginAPI } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(uni.getStorageSync('token') || '')
  const tokenType = ref(uni.getStorageSync('tokenType') || 'Bearer')
  const role = ref(uni.getStorageSync('role') || '')

  const userId = ref(uni.getStorageSync('userId') || '')
  const userName = ref(uni.getStorageSync('userName') || '')
  const userInfo = ref(uni.getStorageSync('userInfo') || {})

  const login = async (loginForm) => {
    const res = await loginAPI(loginForm)

    const { access_token, token_type, role: userRole, user } = res.data

    token.value = access_token
    tokenType.value = token_type || 'Bearer'
    role.value = userRole

    if (user) {
      userId.value = user.user_id || user.id
      userName.value = user.username || user.name
      userInfo.value = user

      uni.setStorageSync('userId', userId.value)
      uni.setStorageSync('userInfo', user)
    }
    else {
      userName.value = loginForm.username
    }

    uni.setStorageSync('token', access_token)
    uni.setStorageSync('tokenType', tokenType.value)
    uni.setStorageSync('role', userRole)
    uni.setStorageSync('userName', userName.value)

    return res
  }

  const setUserInfo = (data) => {
    const id = data.user_id || data.id || ''
    const name = data.username || data.name || ''

    userId.value = id
    userName.value = name
    userInfo.value = data
    if (data.role)
      role.value = data.role

    uni.setStorageSync('userId', id)
    uni.setStorageSync('userName', name)
    uni.setStorageSync('userInfo', data)
    uni.setStorageSync('role', role.value)

    console.log('✅ [UserStore] 用户信息已更新:', { id, name })
  }

  const logout = () => {
    token.value = ''
    tokenType.value = ''
    role.value = ''
    userId.value = ''
    userName.value = ''
    userInfo.value = {}

    uni.removeStorageSync('token')
    uni.removeStorageSync('tokenType')
    uni.removeStorageSync('role')
    uni.removeStorageSync('userId')
    uni.removeStorageSync('userName')
    uni.removeStorageSync('userInfo')
  }

  const getAuthHeader = () => {
    if (!token.value)
      return ''

    const type = tokenType.value
      ? tokenType.value.charAt(0).toUpperCase() + tokenType.value.slice(1)
      : 'Bearer'

    return `${type} ${token.value}`
  }

  return {
    token,
    tokenType,
    role,
    userId,
    userName,
    userInfo,
    login,
    logout,
    setUserInfo,
    getAuthHeader,
  }
})

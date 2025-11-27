import { defineStore } from 'pinia'
import { getUserInfo, postUserLogin } from '@/api/user/index.js'

export const useUserStore = defineStore(
  'user',
  () => {
    const userInfo = ref({})
    const userId = ref(uni.getStorageSync('userId') || '')
    const userName = ref('')
    const token = ref('')

    async function login() {
      const res = await postUserLogin()
      token.value = res.token
    }

    function logout() {
      token.value = ''
    }

    async function getUserData() {
      const res = await getUserInfo()

      userInfo.value = res.data
    }
    function setAuthData(newToken, newUserId, newName) {
      token.value = newToken
      userName.value = newName
      userId.value = newUserId
    }
    return {
      token,
      userInfo,
      userId,
      userName,
      login,
      logout,
      getUserData,
      setAuthData,
    }
  },
  {
    persist: {
      paths: ['token'],
    },
  },
)

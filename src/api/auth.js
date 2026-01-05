import request from '@/utils/request'

const baseUrl = import.meta.env.VITE_API_BASE_URL
export function loginAPI(data) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${baseUrl}/api/v1/auth/login`,
      method: 'POST',
      data,
      header: {
        'Content-Type': 'application/json',
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const resBody = res.data

          if (resBody.code === 0) {
            resolve(resBody)
          }
          else {
            const errorMsg = resBody.message || resBody.detail || '登录失败'
            reject(new Error(errorMsg))
          }
        }
        else {
          const errorMsg = res.data.detail || res.data.message || `请求错误 ${res.statusCode}`
          reject(new Error(errorMsg))
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络连接异常', icon: 'none' })
        reject(err)
      },
    })
  })
}
export function getMeAPI() {
  return request({
    url: '/auth/me',
    method: 'GET',
  })
}

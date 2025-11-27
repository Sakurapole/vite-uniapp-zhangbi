import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建 axios 实例
const service = axios.create({
  // 从环境变量中获取基础 URL
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 5000, // 请求超时时间
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 可以在这里添加请求头，比如 Token
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers['Authorization'] = `Bearer ${token}`;
    // }
    return config
  },
  (error) => {
    // 请求错误处理
    console.error('request error:', error)
    ElMessage.error('请求失败')
    return Promise.reject(error)
  },
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    // 统一处理响应数据
    const res = response.data

    // 根据你后端的约定，判断请求是否成功
    // 你的后端返回格式是 { code: 1, data: ..., msg: 'success' }
    if (res.code !== 1) {
      ElMessage.error(res.msg || '请求出错了')
      return Promise.reject(res)
    }
    else {
      return res
    }
  },
  (error) => {
    // 响应错误处理
    console.error('response error:', error)
    ElMessage.error(error.message || '服务器错误')
    return Promise.reject(error)
  },
)

export default service

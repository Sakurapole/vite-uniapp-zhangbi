<!-- eslint-disable no-alert -->
<script setup>
import { computed, onMounted, ref } from 'vue'
import request from '@/utils/request' // 引入axios封装（需确保路径正确）
import { goodsClassifyOptions } from './data.js'

// 从后端获取商品列表，替代本地模拟数据
const goods = ref([])
const isLoading = ref(false) // 加载状态

const categoryOptions = goodsClassifyOptions || ['食品', '纪念品', '饮料']

// 页面加载时获取商户商品列表
onMounted(() => {
  fetchGoodsList()
})

async function fetchGoodsList() {
  try {
    isLoading.value = true
    const merchantId = uni.getStorageSync('merchantId')
    if (!merchantId) {
      uni.showToast({ title: '未登录，请重新登录', icon: 'none' })
      uni.switchTab({ url: '/pages/login/index' })
      return
    }
    const res = await request({
      url: '/zhangbi/api/product/list',
      method: 'get',
      params: { merchantId },
    })
    goods.value = res.data || []
  }
  catch (error) {
    console.error('获取商品列表失败：', error)
    uni.showToast({ title: '获取商品列表失败', icon: 'none' })
    goods.value = []
  }
  finally {
    isLoading.value = false
  }
}

// 搜索功能（保持不变）
const searchKey = ref('')
const filteredGoods = computed(() => {
  const key = searchKey.value.trim().toLowerCase()
  return key
    ? goods.value.filter(item => item.name.toLowerCase().includes(key))
    : goods.value
})

// 文件上传
const fileInputRef = ref(null)
const activeUploadType = ref('add')

function triggerFileUpload(type) {
  activeUploadType.value = type
  if (process.env.VUE_APP_PLATFORM === 'h5') {
    setTimeout(() => {
      fileInputRef.value?.click()
    }, 0)
  }
  else {
    chooseImage(type)
  }
}

// 替换 URL.createObjectURL 为 Uniapp 临时文件路径
// 替换 URL.createObjectURL 为 Uniapp 临时文件路径
function handleFileChange(event) {
  const file = event.target.files[0]
  if (!file)
    return

  // H5 端用 URL.createObjectURL，非 H5 端需用 uni.uploadFile 临时路径
  let previewUrl = ''
  if (process.env.VUE_APP_PLATFORM === 'h5') {
    previewUrl = URL.createObjectURL(file)
  }
  else {
    // 小程序/App 端需通过 uni.chooseImage 获取临时路径
    // 此处需调整为点击上传时调用 uni.chooseImage
  }

  if (activeUploadType.value === 'add') {
    // newGoodsData.value.formData.img = previewUrl || ''
  }
  else if (activeUploadType.value === 'edit') {
    // editFormData.value.img = previewUrl || ''
  }
  event.target.value = ''
}
// 小程序/App 端上传图片（替代 input file）
function chooseImage(type) {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0]
      if (type === 'add') {
        // newGoodsData.value.formData.img = tempFilePath
      }
      else {
        // editFormData.value.img = tempFilePath
      }
    },
  })
}

// 删除图片（保持不变）
function removeImage(type) {
  if (type === 'add') {
    // newGoodsData.value.formData.img = ''
  }
  else {
    // editFormData.value.img = ''
  }
}

// 新增商品逻辑（改为调用后端接口）
const newGoodsDataTemplate = {
  isPopupOpen: false,
  formData: {
    id: '', // 后端生成，前端传goodsId
    goodsId: '', // 商品编号（对应表中的goods_id）
    name: '',
    price: '',
    count: '',
    classify: '',
    info: '',
    img: '',
  },
}
const newGoodsData = ref({ ...newGoodsDataTemplate })

function openAddPopup() {
  newGoodsData.value.formData = {
    ...newGoodsDataTemplate.formData,
    goodsId: Math.floor(100000 + Math.random() * 900000).toString(), // 临时生成商品编号
  }
  newGoodsData.value.isPopupOpen = true
}

function closeAddPopup() {
  newGoodsData.value.isPopupOpen = false
}

async function saveNewGoods() {
  const form = newGoodsData.value.formData
  const merchantId = localStorage.getItem('merchantId')

  if (!form.name)
    return uni.showToast({ title: '请填写商品名称', icon: 'none' })
  if (!form.price)
    return uni.showToast({ title: '请填写商品价格', icon: 'none' })
  if (!form.classify)
    return uni.showToast({ title: '请选择商品分类', icon: 'none' })
  if (!form.goodsId)
    return uni.showToast({ title: '请填写商品编号', icon: 'none' })

  try {
    // 调用后端新增接口
    await request({
      url: '/zhangbi/api/product',
      method: 'post',
      data: {
        merchantId,
        goodsId: form.goodsId,
        name: form.name,
        price: Number(form.price),
        count: Number(form.count) || 0,
        classify: form.classify,
        info: form.info,
        img: form.img || '',
        ingredients: '[]', // 默认空数组（根据需求可改为输入框）
      },
    })
    alert('新增商品成功')
    closeAddPopup()
    fetchGoodsList() // 刷新商品列表
  }
  catch (error) {
    console.error('新增商品失败：', error)
    alert('新增商品失败，请重试')
  }
}

// 编辑商品逻辑
const isEditPopupOpen = ref(false)
const editFormData = ref({})

function openEditPopup(item) {
  editFormData.value = JSON.parse(JSON.stringify(item))
  isEditPopupOpen.value = true
}

function closeEditPopup() {
  isEditPopupOpen.value = false
}

async function saveEditedGoods() {
  const form = editFormData.value
  const merchantId = localStorage.getItem('merchantId')

  if (!form.name)
    return alert('请填写商品名称')

  try {
    // 调用后端编辑接口
    await request({
      url: '/zhangbi/api/product',
      method: 'put',
      data: {
        id: form.id, // 商品ID（必填）
        merchantId, // 商户ID（必填）
        goodsId: form.goodsId,
        name: form.name,
        price: Number(form.price),
        count: Number(form.count),
        classify: form.classify,
        info: form.info,
        img: form.img || '',
        ingredients: form.ingredients || '[]',
      },
    })
    alert('编辑商品成功')
    closeEditPopup()
    fetchGoodsList() // 刷新商品列表
  }
  catch (error) {
    console.error('编辑商品失败：', error)
    alert('编辑商品失败，请重试')
  }
}

// 删除商品逻辑（改为调用后端接口）
async function deleteGoods(id) {
  const merchantId = localStorage.getItem('merchantId')
  if (confirm('确定要删除该商品吗？此操作无法撤销。')) {
    try {
      // 调用后端删除接口
      await request({
        url: `/zhangbi/api/product/${id}`,
        method: 'delete',
        params: { merchantId },
      })
      alert('删除商品成功')
      fetchGoodsList() // 刷新商品列表
    }
    catch (error) {
      console.error('删除商品失败：', error)
      alert('删除商品失败，请重试')
    }
  }
}
</script>

<template>
  <view class="dashboard-page min-h-screen flex flex-col bg-gray-50">
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileChange"
    />

    <view class="navbar h-14 bg-white border-b border-gray-100 flex items-center px-4 shadow-sm sticky top-0 z-30">
      <view class="text-lg font-extrabold text-indigo-600 tracking-wider">
        Zhangbi
      </view>
      <view class="ml-auto text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
        商户版
      </view>
    </view>

    <view class="content flex-1 overflow-auto p-3 md:p-6 max-w-3xl mx-auto w-full space-y-4">
      <view class="flex gap-3 items-center sticky top-0 z-20 pt-1">
        <view class="flex-1 bg-white rounded-full border border-gray-200 px-3 py-2.5 flex items-center shadow-sm">
          <view class="i-carbon-search text-gray-400 mr-2 text-lg"></view>
          <input
            v-model="searchKey" placeholder="搜索商品名称..."
            class="flex-1 bg-transparent outline-none text-gray-800 text-sm placeholder:text-gray-400"
            type="text"
          />
        </view>

        <button
          class="bg-indigo-600 text-white rounded-full h-10 px-5 flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95 transition-all"
          @click="openAddPopup"
        >
          <span class="text-sm font-bold tracking-wide">新增商品</span>
        </button>
      </view>

      <view class="space-y-3 pb-safe">
        <!-- 加载状态 -->
        <view v-if="isLoading" class="flex flex-col items-center justify-center py-16 text-gray-400">
          <view class="i-carbon-loading text-4xl mb-2 opacity-50 animate-spin"></view>
          <span class="text-sm">加载中...</span>
        </view>

        <!-- 无商品状态 -->
        <view v-else-if="filteredGoods.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400">
          <view class="i-carbon-box text-4xl mb-2 opacity-50"></view>
          <span class="text-sm">暂无相关商品</span>
        </view>

        <!-- 商品列表 -->
        <view
          v-for="item in filteredGoods" :key="item.id"
          class="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-3 items-start"
        >
          <view class="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 relative group">
            <image :src="item.img || 'https://via.placeholder.com/150?text=No+Img'" mode="aspectFill" class="w-full h-full object-cover" />
          </view>

          <view class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <view class="flex justify-between items-start gap-2">
              <view class="text-gray-900 font-bold text-[14px] leading-tight truncate">
                {{ item.name }}
              </view>
              <view class="text-xs text-gray-400 flex-shrink-0">
                库存 {{ item.count }}
              </view>
            </view>

            <view class="flex items-center mt-2">
              <span v-if="item.classify" class="bg-indigo-50 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded font-medium">
                {{ item.classify }}
              </span>
            </view>

            <view class="flex items-end justify-between mt-auto">
              <view class="text-dark font-bold text-xs-1 leading-none">
                <span class="text-xs font-normal">¥</span>{{ item.price }}
              </view>

              <view class="flex gap-2">
                <button
                  class="bg-blue-500 text-white  h-6 px-3 flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95 transition-all"
                  @click.stop="openEditPopup(item)"
                >
                  <span class="text-sm font-bold tracking-wide">编辑</span>
                </button>
                <button
                  class="bg-red-500 text-white  h-6 px-3 flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95 transition-all "
                  @click.stop="deleteGoods(item.id)"
                >
                  <span class="text-sm font-bold tracking-wide">删除</span>
                </button>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 新增商品弹窗 -->
    <view
      v-if="newGoodsData.isPopupOpen || isEditPopupOpen"
      class="fixed inset-0 bg-black/60 z-40 backdrop-blur-[2px] transition-opacity"
    ></view>

    <view v-if="newGoodsData.isPopupOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <view class="bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[85vh] pointer-events-auto animate-pop-in">
        <view class="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 class="font-bold text-lg text-gray-800">
            新增商品
          </h3>
          <button class="text-gray-400 p-1 active:text-gray-600 m-1" @click="closeAddPopup">
            <view class="i-carbon-close text-xl"></view>
          </button>
        </view>

        <view class="overflow-y-auto p-5 space-y-4">
          <div class="flex justify-center">
            <div v-if="newGoodsData.formData.img" class="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <image :src="newGoodsData.formData.img" class="w-full h-full object-cover" />
              <button class="absolute top-0 right-0 bg-black/50 text-white w-6 h-6 flex items-center justify-center rounded-bl-lg hover:bg-red-500 transition" @click="removeImage('add')">
                ✕
              </button>
            </div>
            <div v-else class="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 cursor-pointer active:scale-95 hover:border-indigo-400 hover:text-indigo-500 transition" @click="triggerFileUpload('add')">
              <view class="i-carbon-image text-2xl mb-1"></view>
              <span class="text-xs">上传图片</span>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-xs text-gray-500 font-medium ml-1">商品名称 <span class="text-red-500">*</span></label>
              <input v-model="newGoodsData.formData.name" class="input-box" placeholder="" />
            </div>
            <div>
              <label class="text-xs text-gray-500 font-medium ml-1">商品条码 <span class="text-red-500">*</span></label>
              <input v-model="newGoodsData.formData.goodsId" class="input-box" placeholder="" />
            </div>
            <div class="flex gap-3">
              <div class="relative flex-1">
                <label class="text-xs text-gray-500 font-medium ml-1">价格 <span class="text-red-500">*</span></label>
                <input v-model="newGoodsData.formData.price" type="number" class="input-box pl-7" placeholder="0.00" />
              </div>
              <div class="flex-1">
                <label class="text-xs text-gray-500 font-medium ml-1">库存</label>
                <input v-model="newGoodsData.formData.count" type="number" class="input-box" placeholder="0" />
              </div>
            </div>

            <div class="relative">
              <label class="text-xs text-gray-500 font-medium ml-1">分类 <span class="text-red-500">*</span></label>
              <select v-model="newGoodsData.formData.classify" class="input-box appearance-none bg-transparent">
                <option value="" disabled>
                  请选择分类
                </option>
                <option v-for="opt in categoryOptions" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
              <view class="absolute right-3 top-[34px] text-gray-400 pointer-events-none">
                <view class="i-carbon-chevron-down"></view>
              </view>
            </div>

            <div>
              <label class="text-xs text-gray-500 font-medium ml-1">商品描述</label>
              <textarea v-model="newGoodsData.formData.info" class="input-box h-20 py-2 resize-none" placeholder="请输入商品详情..."></textarea>
            </div>
          </div>
        </view>

        <view class="p-4 border-t border-gray-100 flex gap-3 bg-gray-50 rounded-b-2xl">
          <button class="btn-secondary flex-1 pt-2" @click="closeAddPopup">
            取消
          </button>
          <button class="btn-primary flex-1 pt-2" @click="saveNewGoods">
            确认新增
          </button>
        </view>
      </view>
    </view>

    <!-- 编辑商品弹窗 -->
    <view v-if="isEditPopupOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <view class="bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[85vh] pointer-events-auto animate-pop-in">
        <view class="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 class="font-bold text-lg text-gray-800">
            编辑商品
          </h3>
          <button class="text-gray-400 p-1 active:text-gray-600 m-1" @click="closeEditPopup">
            <view class="i-carbon-close text-xl"></view>
          </button>
        </view>

        <view class="overflow-y-auto p-5 space-y-4">
          <div class="flex justify-center">
            <div class="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group cursor-pointer" @click="triggerFileUpload('edit')">
              <image v-if="editFormData.img" :src="editFormData.img" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                <view class="i-carbon-image text-2xl"></view>
              </div>
              <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span class="text-white text-xs font-bold border border-white/50 px-2 py-1 rounded-full backdrop-blur-sm">点击更换</span>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <label class="text-xs text-gray-500 font-medium ml-1">商品名称</label>
              <input v-model="editFormData.name" class="input-box" />
            </div>
            <div>
              <label class="text-xs text-gray-500 font-medium ml-1">商品条码</label>
              <input v-model="editFormData.goodsId" class="input-box" />
            </div>
            <div class="flex gap-3">
              <div class="relative flex-1">
                <label class="text-xs text-gray-500 font-medium ml-1">价格</label>
                <input v-model="editFormData.price" type="number" class="input-box pl-7" />
              </div>
              <div class="flex-1">
                <label class="text-xs text-gray-500 font-medium ml-1">库存</label>
                <input v-model="editFormData.count" type="number" class="input-box" />
              </div>
            </div>

            <div class="relative">
              <label class="text-xs text-gray-500 font-medium ml-1">分类</label>
              <select v-model="editFormData.classify" class="input-box appearance-none bg-transparent">
                <option v-for="opt in categoryOptions" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
              <view class="absolute right-3 top-[34px] text-gray-400 pointer-events-none">
                <view class="i-carbon-chevron-down"></view>
              </view>
            </div>

            <div>
              <label class="text-xs text-gray-500 font-medium ml-1">描述</label>
              <textarea v-model="editFormData.info" class="input-box h-20 py-2 resize-none"></textarea>
            </div>
          </div>
        </view>

        <view class="p-5 border-t border-gray-100 flex gap-10 bg-gray-50 rounded-b-2xl">
          <button class="btn-secondary flex-1 pt-2" @click="closeEditPopup">
            取消
          </button>
          <button class="btn-primary flex-1 pt-2 " @click="saveEditedGoods">
            保存修改
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* 原有样式保持不变 */
.input-box {
  @apply w-full px-3 h-10 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-400 bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all;
}

.btn-primary {
  @apply h-10 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 active:scale-95 transition text-sm shadow-md shadow-indigo-200;
}

.btn-secondary {
  @apply h-10 bg-white text-gray-600 font-medium rounded-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition text-sm;
}

@keyframes pop-in {
  0% {
    transform: scale(0.9) translateY(10px);
    opacity: 0;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}
.animate-pop-in {
  animation: pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.pb-safe {
  padding-bottom: calc(50px + env(safe-area-inset-bottom));
}

/* 新增加载动画 */
.animate-spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

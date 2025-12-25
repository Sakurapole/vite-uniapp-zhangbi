<script setup>
import { onShow } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'

import {
  createProductAPI,
  deleteProductAPI,
  getProductListAPI,
  updateProductAPI,
} from '@/api/product'
import CustomTabBar from '@/components/CustomTabBar/index.vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const categoryOptions = ['食品', '纪念品', '酒水']

const goods = ref([])
const isLoading = ref(false)
const searchKey = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const isPopupOpen = ref(false)
const isEditMode = ref(false)
const formData = ref({
  id: '',
  name: '',
  price: '',
  count: '',
  classify: '',
  info: '',
  img: '',
})

function initForm() {
  return {
    id: '',
    name: '',
    price: '',
    count: '',
    classify: '',
    info: '',
    img: '',
  }
}

onShow(() => {
  handleSearch()
})

let searchTimer = null
watch(searchKey, (newVal) => {
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    handleSearch()
  }, 500)
})

async function fetchGoodsList() {
  if (!userStore.token) {
    uni.showToast({ title: '请重新登录', icon: 'none' })
    setTimeout(() => uni.reLaunch({ url: '/pages/login/index' }), 1000)
    return
  }

  try {
    isLoading.value = true
    const res = await getProductListAPI({
      page: currentPage.value,
      size: pageSize.value,
      keyword: searchKey.value,
    })

    if (currentPage.value === 1) {
      goods.value = res.items || []
    }
    else {
      goods.value = [...goods.value, ...res.items]
    }
    total.value = res.total
  }
  catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    isLoading.value = false
  }
}

function openAddPopup() {
  isEditMode.value = false
  formData.value = initForm()
  isPopupOpen.value = true
}

function openEditPopup(item) {
  isEditMode.value = true
  formData.value = {
    id: item.product_id,
    name: item.product_name,
    classify: item.category,
    info: item.description,
    price: item.price,
    img: item.image_url,
    count: item.stock,
  }
  isPopupOpen.value = true
}

function closePopup() {
  isPopupOpen.value = false
}

function handleCategoryChange(e) {
  const index = e.detail.value
  formData.value.classify = categoryOptions[index]
}

async function handleSave() {
  const form = formData.value

  if (!form.name)
    return uni.showToast({ title: '请输入商品名称', icon: 'none' })
  if (!form.price)
    return uni.showToast({ title: '请输入销售价格', icon: 'none' })
  if (!form.count && form.count !== 0)
    return uni.showToast({ title: '请输入库存数量', icon: 'none' })
  if (!form.classify)
    return uni.showToast({ title: '请选择分类', icon: 'none' })

  try {
    const payload = {
      name: form.name,
      price: String(form.price),
      stock: Number(form.count),
      desc: form.info || '',
      category: form.classify,
      image_url: form.img || '',
    }

    if (isEditMode.value) {
      await updateProductAPI(form.id, payload)
      uni.showToast({ title: '修改成功', icon: 'success' })
    }
    else {
      await createProductAPI(payload)
      uni.showToast({ title: '新增成功', icon: 'success' })
    }

    closePopup()
    handleSearch()
  }
  catch (error) {
    const msg = error.detail?.[0]?.msg || error.message || '操作失败'
    uni.showToast({ title: msg, icon: 'none' })
  }
}

function handleDelete(id) {
  uni.showModal({
    title: '确认删除',
    content: '删除后无法恢复，确定要删除吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await deleteProductAPI(id)
          uni.showToast({ title: '已删除', icon: 'success' })
          handleSearch()
        }
        catch (error) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function handleUploadImage() {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      const tempPath = res.tempFilePaths[0]
      formData.value.img = tempPath
    },
  })
}

function removeImage() {
  formData.value.img = ''
}

function handleSearch() {
  currentPage.value = 1
  fetchGoodsList()
}

function loadMore() {
  if (goods.value.length < total.value) {
    currentPage.value++
    fetchGoodsList()
  }
}
</script>

<template>
  <view class="min-h-screen bg-gray-100 pb-32 font-sans text-gray-800">
    <view class="p-4 space-y-4">
      <view class="bg-white border border-indigo-50 rounded-xl px-4 py-2 flex items-center shadow-sm">
        <view class="text-lg mr-3 opacity-50">
          🔍
        </view>
        <input
          v-model="searchKey"
          placeholder="搜索商品名称..."
          class="flex-1 bg-transparent outline-none text-gray-800 text-sm placeholder:text-gray-400 h-10"
          type="text"
          confirm-type="search"
          @confirm="handleSearch"
        />
        <view v-if="searchKey" class="text-gray-400" @click="searchKey = ''; handleSearch()">
          <view class="i-carbon-close-filled"></view>
        </view>
      </view>

      <view
        class="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-4 text-white flex justify-between items-center shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-transform cursor-pointer mt-4"
        @click="openAddPopup"
      >
        <view class="flex items-center gap-3">
          <view class="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center text-xl backdrop-blur-sm">
            ✨
          </view>
          <view class="flex flex-col">
            <text class="font-bold text-lg leading-tight">
              录入新商品
            </text>
            <text class="text-indigo-100 text-xs opacity-80">
              点击登记入库
            </text>
          </view>
        </view>
        <view class="bg-white/10 w-8 h-8 rounded-lg flex items-center justify-center">
          <view class="i-carbon-add text-xl font-bold"></view>
        </view>
      </view>

      <view v-if="isLoading && currentPage === 1" class="flex flex-col items-center justify-center py-10 text-gray-400">
        <view class="i-carbon-loading text-4xl mb-2 opacity-50 animate-spin"></view>
        <span class="text-xs font-bold tracking-widest">正在同步商品库...</span>
      </view>

      <view v-else-if="goods.length === 0" class="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-50">
        <view class="text-4xl mb-3">
          📦
        </view>
        <view class="text-gray-400 text-sm font-medium">
          暂无相关物资数据
        </view>
      </view>

      <view v-else class="space-y-4">
        <view v-for="item in goods" :key="item.product_id" class="bg-white rounded-2xl p-4 shadow-sm relative border border-gray-50 flex gap-4">
          <view class="w-24 h-24 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-inner relative">
            <image :src="item.image_url" mode="aspectFill" class="w-full h-full object-cover" />
            <view v-if="!item.image_url" class="absolute inset-0 flex items-center justify-center text-gray-300 text-2xl">
              🖼️
            </view>
          </view>

          <view class="flex-1 min-w-0 flex flex-col justify-between">
            <view>
              <view class="flex justify-between items-start">
                <view class="text-gray-900 font-bold text-lg leading-tight truncate pr-2">
                  {{ item.product_name }}
                </view>
                <view class="text-indigo-600 font-black text-lg font-sans">
                  <span class="text-xs font-bold align-top">¥</span>{{ item.price }}
                </view>
              </view>
              <view class="flex flex-wrap gap-2 mt-2">
                <span v-if="item.category" class="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold border border-orange-100">{{ item.category }}</span>
                <span class="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold">库存: {{ item.stock }}</span>
                <span class="bg-blue-50 text-blue-500 px-2 py-0.5 rounded text-[10px] font-bold">已售: {{ item.sold }}</span>
              </view>
            </view>
            <view class="flex justify-end gap-2 mt-3">
              <button class="bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] px-3 py-1.5  flex items-center gap-1 border-0 transition-colors" @click.stop="openEditPopup(item)">
                📝 编辑
              </button>
              <button class="bg-red-50 hover:bg-red-100 text-red-500 text-[10px] px-3 py-1.5 flex items-center gap-1 border-0 transition-colors" @click.stop="handleDelete(item.product_id)">
                🗑️ 删除
              </button>
            </view>
          </view>
        </view>
      </view>

      <view v-if="goods.length > 0 && goods.length < total" class="text-center py-4 text-xs text-gray-400" @click="loadMore">
        点击加载更多 ({{ goods.length }}/{{ total }})
      </view>
      <view v-if="goods.length > 0 && goods.length >= total" class="text-center py-4 text-xs text-gray-300">
        - 到底了 -
      </view>
    </view>

    <view v-if="isPopupOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <view class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="closePopup"></view>

      <view class="bg-white w-full max-w-sm h-[80vh] rounded-3xl shadow-2xl flex flex-col relative z-[101] overflow-hidden animate-pop-in">
        <view :class="isEditMode ? 'bg-slate-800' : 'bg-indigo-600'" class="p-4 pt-5 pb-8 flex justify-between items-center text-white relative transition-colors duration-300 flex-none z-10">
          <h3 class="font-bold text-xl">
            {{ isEditMode ? '编辑商品' : '录入新商品' }}
          </h3>
          <view class="text-white/70 p-1 hover:text-white cursor-pointer" @click="closePopup">
            <view class="i-carbon-close text-2xl"></view>
          </view>
        </view>

        <scroll-view
          scroll-y
          class="flex-1 h-0 w-full bg-white -mt-4 rounded-t-3xl relative z-20"
          :enable-flex="true"
        >
          <view class="px-5 pt-6 pb-5">
            <view class="flex justify-center mb-4">
              <view v-if="formData.img" class="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-indigo-100 shadow-md">
                <image :src="formData.img" class="w-full h-full object-cover" />
                <view class="absolute top-1 right-1 bg-black/60 text-white w-6 h-6 flex items-center justify-center rounded-full z-10" @click.stop="removeImage">
                  ✕
                </view>
              </view>
              <view v-else class="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-gray-400 cursor-pointer active:scale-95 transition-all" @click="handleUploadImage">
                <view class="text-2xl mb-1">
                  📷
                </view>
                <text class="text-xs font-bold">
                  上传封面
                </text>
              </view>
            </view>

            <view class="space-y-3">
              <view>
                <text class="text-xs text-gray-500 font-bold ml-1">
                  商品名称
                </text>
                <input v-model="formData.name" :cursor-spacing="20" class="modern-input" placeholder="请输入名称" />
              </view>

              <view class="flex gap-3">
                <view class="flex-1">
                  <text class="text-xs text-gray-500 font-bold ml-1">
                    销售价格
                  </text>
                  <input v-model="formData.price" type="digit" :cursor-spacing="20" class="modern-input" placeholder="0.00" />
                </view>
                <view class="flex-1">
                  <text class="text-xs text-gray-500 font-bold ml-1">
                    库存数量
                  </text>
                  <input v-model="formData.count" type="number" :cursor-spacing="20" class="modern-input" placeholder="0" />
                </view>
              </view>

              <view class="relative">
                <text class="text-xs text-gray-500 font-bold ml-1">
                  所属分类
                </text>
                <picker mode="selector" :range="categoryOptions" @change="handleCategoryChange">
                  <view class="modern-input flex items-center justify-between">
                    <text :class="formData.classify ? 'text-gray-800' : 'text-gray-400'">
                      {{ formData.classify || '请选择分类' }}
                    </text>
                    <text class="text-gray-400">
                      ▼
                    </text>
                  </view>
                </picker>
              </view>

              <view>
                <text class="text-xs text-gray-500 font-bold ml-1">
                  商品描述
                </text>
                <textarea v-model="formData.info" :cursor-spacing="50" class="modern-input h-20 py-2" placeholder="输入详情..." />
              </view>

              <view class="h-4"></view>
            </view>
          </view>
        </scroll-view>

        <view class="p-5 border-t border-gray-50 bg-gray-50 flex gap-3 z-30 flex-none">
          <button class="flex-1 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm shadow-sm active:scale-95 transition-transform" @click="closePopup">
            取消
          </button>
          <button
            class="flex-1 py-3 rounded-xl text-white font-bold text-sm shadow-lg active:scale-95 transition-transform"
            :class="isEditMode ? 'bg-slate-800 shadow-gray-400/50' : 'bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-indigo-200'"
            @click="handleSave"
          >
            {{ isEditMode ? '保存修改' : '确认入库' }}
          </button>
        </view>
      </view>
    </view>

    <CustomTabBar :current="1" />
  </view>
</template>

<style scoped>
/* 替换 input 默认样式，减小 padding 适应手机屏 */
.modern-input {
  width: 100%;
  background-color: #f3f4f6; /* bg-gray-100 */
  color: #1f2937; /* text-gray-800 */
  font-size: 0.875rem; /* text-sm */
  font-weight: 700; /* font-bold */
  border-radius: 0.75rem; /* rounded-xl */
  padding: 0.6rem 0.8rem; /* 调整为更适合的高度 */
  border: 2px solid transparent;
  margin-top: 0.25rem;
  transition: all 0.2s;
  box-sizing: border-box; /* 关键 */
  height: 46px; /* 显式高度 */
}

/* textarea 特殊处理 */
textarea.modern-input {
  height: 80px;
  line-height: 1.4;
}

.modern-input:focus-within,
.modern-input:focus {
  background-color: #ffffff;
  border-color: #c7d2fe; /* border-indigo-200 */
}

@keyframes pop-in {
  0% {
    transform: scale(0.95);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-pop-in {
  animation: pop-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}
</style>

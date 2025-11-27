<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
const userStore = useUserStore()

const userName = computed(() => userStore.userName)

function changeAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      userInfo.value.avatar = res.tempFilePaths[0]
      showToast('头像已更新')
    },
  })
}

function editUsername() {
  uni.showModal({
    title: '修改用户名',
    content: '请输入新用户名',
    editable: true,
    placeholderText: '请输入2-12位字符',
    success: (res) => {
      if (res.confirm && res.content.trim()) {
        userInfo.value.username = res.content.trim()
        showToast('用户名修改成功')
      }
    },
  })
}

function deleteAccount() {
  uni.showModal({
    title: '警告',
    content: '注销账户将永久删除您的所有数据，此操作不可恢复。确定要继续吗？',
    confirmText: '确定注销',
    cancelText: '取消',
    confirmColor: '#3b82f6',
    success: (res) => {
      if (res.confirm) {
        showToast('账户注销功能暂未开放', 'none')
      }
    },
  })
}

async function saveProfile() {
  try {
    await new Promise(resolve => setTimeout(resolve, 800))
    showToast('保存成功')
  }
  catch (error) {
    showToast('保存失败，请重试', 'none')
  }
}

function showToast(title, icon = 'success') {
  uni.showToast({ title, icon, duration: 1500 })
}
</script>

<template>
  <view class="profile-edit-page h-full flex flex-col bg-white">
    <!-- 顶部头像区：蓝白渐变+线条装饰 -->
    <view class="header-section relative">
      <view class="relative h-40 overflow-hidden bg-gradient-to-r from-blue-500 to-blue-400">
        <!-- 线条装饰：替代模糊圆，增强线条感 -->
        <view class="absolute -right-8 -top-8 h-32 w-32 rounded-full border border-white/10"></view>
        <view class="absolute bottom-4 right-16 h-16 w-16 rounded-full border border-white/10"></view>
      </view>

      <!-- 头像容器：蓝色边框+白色底 -->
      <view class="absolute bottom-0 left-1/2 translate-y-1/2 transform -translate-x-1/2">
        <view class="relative">
          <view class="h-24 w-24 overflow-hidden border-4 border-white rounded-full shadow-sm" @click="changeAvatar">
            <image
              v-if="userInfo.avatar"
              :src="userInfo.avatar"
              class="size-full"
              mode="aspectFill"
            />
            <image
              v-else
              src="~@assets/images/avatar-default.png"
              class="size-full"
              mode="aspectFill"
            />
          </view>
          <!-- 编辑图标：蓝色背景 -->
          <view class="absolute bottom-0 right-0 h-7 w-7 flex items-center justify-center border-2 border-white rounded-full bg-blue-500">
            <view class="i-carbon-edit text-sm text-white"></view>
          </view>
        </view>
      </view>
    </view>

    <!-- 主体内容：精简为仅保留核心功能卡片 -->
    <view class="content-section flex-1 px-4 pb-4 pt-16">
      <!-- 基本信息卡片：仅保留用户名 -->
      <view class="info-card mb-4 overflow-hidden rounded-xl bg-white border border-blue-50 shadow-sm">
        <view class="card-header">
          <view class="i-carbon-user text-lg text-black"></view>
          <view class="card-title">
            基本信息
          </view>
        </view>

        <view class="divide-y divide-blue-50">
          <!-- 仅保留用户名编辑项 -->
          <view class="info-item" @click="editUsername">
            <view class="info-label">
              <view class="i-carbon-user-identification text-lg text-black"></view>
              <text>用户名</text>
            </view>
            <view class="info-value">
              <text>{{ userName || '商户' }}</text>
              <view class="i-carbon-chevron-right text-sm text-blue-200"></view>
            </view>
          </view>
        </view>
      </view>

      <!-- 账户设置卡片：仅保留注销账户 -->
      <view class="info-card mb-4 overflow-hidden rounded-xl bg-white border border-blue-50 shadow-sm">
        <view class="divide-y divide-blue-50">
          <!-- 注销账户：蓝色文字，契合风格 -->
          <view class="info-item" @click="deleteAccount">
            <view class="info-label">
              <view class="i-carbon-user-x text-lg text-blue-400"></view>
              <text class="text-red">
                注销账户
              </text>
            </view>
            <view class="info-value">
              <view class="i-carbon-chevron-right text-sm text-blue-200"></view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 保存按钮：蓝色主色，简化样式 -->
    <view class="action-section px-4 pb-8 pt-4">
      <button
        class="w-full flex items-center justify-center rounded-lg bg-blue-500 py-3 text-white font-medium transition-colors duration-200 active:bg-blue-600"
        hover-class="bg-blue-600"
        @click="saveProfile"
      >
        <view class="i-carbon-save mr-2 text-lg"></view>
        保存修改
      </button>
    </view>
  </view>
</template>

<style scoped>
/* 基础卡片样式：蓝白线条风核心 */
.info-card {
  @apply bg-white rounded-xl border border-blue-50 shadow-sm overflow-hidden;
}

/* 卡片头部：线条分隔 */
.card-header {
  @apply flex items-center px-5 py-4 border-b border-blue-50;
}

.card-title {
  @apply ml-3 text-lg font-bold text-blue-800;
}

/* 信息项：线条分隔与 hover 效果 */
.info-item {
  @apply flex items-center justify-between px-5 py-4 active:bg-blue-50 transition-colors duration-200 hover:bg-blue-50;
}

.info-label {
  @apply flex items-center text-blue-900 font-medium;
}

.info-label text {
  @apply ml-3;
}

.info-value {
  @apply flex items-center text-blue-700;
}

.info-value text {
  @apply mr-2;
}

/* 响应式适配：小屏幕优化 */
@media (max-width: 375px) {
  .info-item {
    @apply px-4 py-3;
  }

  .card-header {
    @apply px-4 py-3;
  }
}

/* 移除默认高亮，优化H5/web交互 */
* {
  -webkit-tap-highlight-color: transparent;
  tap-highlight-color: transparent;
}
</style>

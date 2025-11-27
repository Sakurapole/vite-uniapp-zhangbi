<script setup>
import { appVersion } from '@/settings/index.mjs'

const appStore = useAppStore()

const settings = ref({
  darkMode: false,
  themeColor: 'blue',
  fontSize: 'medium',
  pushNotification: true,
  soundAlert: true,
  vibration: true,
  biometric: false,
  autoClean: true,
})

const hasUpdate = ref(false)

const fontSizes = {
  small: '小',
  medium: '中',
  large: '大',
}

const autoLockOptions = {
  1: '1分钟',
  5: '5分钟',
  10: '10分钟',
  30: '30分钟',
  0: '从不',
}

const currentThemeColor = computed(() => appStore.primaryColor)
const currentThemeText = computed(() => appStore.currentThemeInfo?.name || '默认')
const fontSizeText = computed(() => fontSizes[settings.value.fontSize] || '中')

function resetSettings() {
  uni.showModal({
    title: '重置设置',
    content: '确定要将所有设置恢复为默认值吗？',
    confirmText: '重置',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        settings.value = {
          darkMode: false,
          themeColor: 'blue',
          fontSize: 'medium',
          pushNotification: true,
          soundAlert: true,
          vibration: true,
          biometric: false,
          autoLock: 5,
          autoClean: true,
        }
        showToast('设置已重置')
      }
    },
  })
}

function toggleSetting(key) {
  settings.value[key] = !settings.value[key]

  if (settings.value.vibration) {
    uni.vibrateShort()
  }

  saveSettings()
}

function selectThemeColor() {
  const items = Object.entries(appStore.themeModel).map(([key, value]) => value.name)

  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      const colorKeys = Object.keys(appStore.themeModel)

      appStore.currentTheme = colorKeys[res.tapIndex]

      showToast('主题已更换')
    },
  })
}

function adjustFontSize() {
  const items = Object.values(fontSizes)

  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      const sizeKeys = Object.keys(fontSizes)
      settings.value.fontSize = sizeKeys[res.tapIndex]
      saveSettings()
      showToast('字体大小已调整')
    },
  })
}

function checkUpdate() {
  uni.showLoading({
    title: '检查中...',
  })

  setTimeout(() => {
    uni.hideLoading()
    if (hasUpdate.value) {
      // todo
    }
    else {
      showToast('待开发')
    }
  }, 1500)
}

function saveSettings() {
  uni.setStorageSync('app_settings', settings.value)
}

function showToast(title, icon = 'success') {
  uni.showToast({
    title,
    icon,
  })
}

function loadSettings() {
  try {
    const savedSettings = uni.getStorageSync('app_settings')
    if (savedSettings) {
      settings.value = { ...settings.value, ...savedSettings }
    }
  }
  catch (error) {
    console.log('读取设置失败:', error)
  }
}

loadSettings()
</script>

<template>
  <view class="p-4">
    <view class="pb-4 text-center text-gray-500">
      <!-- 暂时为模板 -->
    </view>

    <view class="settings-card">
      <view class="card-header">
        <view class="i-carbon-paint-brush text-lg text-primary-500"></view>
        <view class="card-title">
          显示与主题
        </view>
      </view>

      <view class="divide-y divide-gray-100">
        <view class="setting-item">
          <view class="setting-label">
            <view class="i-carbon-moon text-lg text-gray-400"></view>
            <view class="setting-info">
              <text class="setting-title">
                深色模式
              </text>
              <text class="setting-desc">
                开启后界面将使用深色主题
              </text>
            </view>
          </view>
          <view class="setting-control">
            <switch
              :checked="settings.darkMode"
              :color="currentThemeColor"
              @change="toggleSetting('darkMode')"
            />
          </view>
        </view>

        <view class="setting-item" @click="selectThemeColor">
          <view class="setting-label">
            <view class="i-carbon-color-palette text-lg text-gray-400"></view>
            <view class="setting-info">
              <text class="setting-title">
                主题色彩
              </text>
              <text class="setting-desc">
                {{ currentThemeText }}
              </text>
            </view>
          </view>
          <view class="setting-control">
            <view class="h-6 w-6 border-2 border-gray-200 rounded-full" :style="{ backgroundColor: currentThemeColor }"></view>
            <view class="i-carbon-chevron-right ml-2 text-sm text-gray-400"></view>
          </view>
        </view>

        <view class="setting-item" @click="adjustFontSize">
          <view class="setting-label">
            <view class="i-carbon-text-font text-lg text-gray-400"></view>
            <view class="setting-info">
              <text class="setting-title">
                字体大小
              </text>
              <text class="setting-desc">
                {{ fontSizeText }}
              </text>
            </view>
          </view>
          <view class="setting-control">
            <view class="i-carbon-chevron-right text-sm text-gray-400"></view>
          </view>
        </view>
      </view>
    </view>

    <view class="settings-card">
      <view class="card-header">
        <view class="i-carbon-information text-lg text-primary-500"></view>
        <view class="card-title">
          关于与帮助
        </view>
      </view>

      <view class="divide-y divide-gray-100">
        <view class="setting-item" @click="checkUpdate">
          <view class="setting-label">
            <view class="i-carbon-application text-lg text-gray-400"></view>
            <view class="setting-info">
              <text class="setting-title">
                版本信息
              </text>
              <text class="setting-desc">
                当前版本 {{ appVersion }}
              </text>
            </view>
          </view>
          <view class="setting-control">
            <view v-if="hasUpdate" class="rounded-full bg-red-500 px-2 py-1 text-xs text-white">
              有更新
            </view>
            <view class="i-carbon-chevron-right ml-2 text-sm text-gray-400"></view>
          </view>
        </view>
      </view>
    </view>

    <view class="mt-4">
      <button
        class="w-full flex items-center justify-center rounded-lg bg-primary-400 py-3 text-white font-medium transition-colors duration-200 active:bg-primary-600"
        hover-class="bg-primary-600"
        @click="resetSettings"
      >
        <view class="i-carbon-reset mr-2 text-lg"></view>
        重置设置
      </button>
    </view>
  </view>
</template>

<style scoped>
/* 设置卡片样式 */
.settings-card {
  @apply bg-white rounded-xl shadow-sm mb-4 overflow-hidden;
}

.card-header {
  @apply flex items-center px-5 py-4 border-b border-gray-100;
}

.card-title {
  @apply ml-3 text-lg font-bold text-gray-800;
}

/* 设置项样式 */
.setting-item {
  @apply flex items-center justify-between px-5 py-4 active:bg-gray-50 transition-colors duration-200;
}

.setting-label {
  @apply flex items-start flex-1 min-w-0;
}

.setting-info {
  @apply ml-3 flex-1 min-w-0;
}

.setting-title {
  @apply text-gray-800 font-medium block;
}

.setting-desc {
  @apply text-gray-500 text-sm mt-0.5 block;
}

.setting-control {
  @apply flex items-center flex-none ml-4;
}

/* 响应式调整 */
@media (max-width: 375px) {
  .setting-item {
    @apply px-4 py-3;
  }

  .card-header {
    @apply px-4 py-3;
  }

  .setting-info {
    @apply ml-2;
  }

  .setting-control {
    @apply ml-2;
  }
}
</style>

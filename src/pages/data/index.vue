<script setup>
import { computed, ref } from 'vue'

const goodsStock = ref([
  { id: 1, name: '手电筒', count: 5, img: '/static/images/goods/flashlight.png' },
  { id: 2, name: '水杯', count: 3, img: '/static/images/goods/cup.png' },
  { id: 3, name: '夜视镜', count: 2, img: '/static/images/goods/nightvision.png' },
  { id: 4, name: '急救包', count: 1, img: '/static/images/goods/firstaid.png' },
  { id: 5, name: '笔记本', count: 4, img: '/static/images/goods/notebook.png' },
  { id: 6, name: '绳索', count: 2, img: '/static/images/goods/rope.png' },
])

const guestGroups = ref([
  {
    groupId: 'A组',
    guestCount: 3,
    selectedScript: {
      name: '皇帝爱上王者荣耀',
      img: '/static/images/script1.png',
      difficulty: '困难',
      props: [
        { name: '手电筒', needCount: 3 },
        { name: '水杯', needCount: 3 },
        { name: '夜视镜', needCount: 4 },
      ],
    },
  },
  {
    groupId: 'B组',
    guestCount: 2,
    selectedScript: {
      name: '转生成为史莱姆',
      img: '/static/images/script2.png',
      difficulty: '中等',
      props: [
        { name: '手电筒', needCount: 2 },
        { name: '急救包', needCount: 3 },
      ],
    },
  },
])

function getPropCompareResult(propName, needCount) {
  const stockItem = goodsStock.value.find(item => item.name === propName)
  const currentStock = stockItem ? stockItem.count : 0
  return {
    currentStock,
    needCount,
    shortage: currentStock < needCount,
    shortageCount: Math.max(0, needCount - currentStock),
  }
}

const totalShortageCount = computed(() => {
  let count = 0
  guestGroups.value.forEach((group) => {
    group.selectedScript.props.forEach((prop) => {
      const { shortageCount } = getPropCompareResult(prop.name, prop.needCount)
      count += shortageCount
    })
  })
  return count
})

function goToGoodsManage() {
  uni.navigateTo({ url: '/pages/goods/stock' })
}
</script>

<template>
  <view class="prop-check-page h-full flex flex-col bg-gray-50">
    <!-- 顶部导航栏：带库存预警提示 -->
    <view class="navbar h-16 bg-white border-b border-gray-100 flex items-center px-6">
      <view class="text-xl font-bold text-blue-600">
        剧本道具核对
      </view>
      <!-- 库存预警提醒：有短缺时显示红色 -->
      <view v-if="totalShortageCount > 0" class="ml-auto flex items-center">
        <view class="i-carbon-alert text-red-500 mr-1.5"></view>
        <text class="text-red-500 text-sm">
          有 {{ totalShortageCount }} 项道具库存不足
        </text>
      </view>
    </view>

    <!-- 主体内容 -->
    <view class="content flex-1 overflow-auto p-4 md:p-6">
      <!-- 1. 操作按钮区：快速补充库存 -->
      <view class="operate-bar mb-6 flex justify-end">
        <button
          class="bg-blue-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          @click="goToGoodsManage"
        >
          <view class="i-carbon-add-box mr-1.5"></view>
          前往货品管理补充库存
        </button>
      </view>

      <!-- 2. 客人分组列表：两拨客人分别展示 -->
      <view class="group-list space-y-6">
        <view v-for="(group, index) in guestGroups" :key="index">
          <!-- 分组标题栏 -->
          <view class="group-header flex items-center mb-3">
            <view class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              {{ group.groupId.slice(0, 1) }}
            </view>
            <view class="ml-2.5">
              <view class="font-medium text-gray-800">
                {{ group.groupId }}（{{ group.guestCount }}人）
              </view>
              <view class="text-xs text-gray-500">
                所选剧本：{{ group.selectedScript.name }}（{{ group.selectedScript.difficulty }}）
              </view>
            </view>
          </view>

          <!-- 剧本信息卡片 -->
          <view class="script-card bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex items-center">
            <image
              :src="group.selectedScript.img"
              alt="剧本图片"
              class="w-20 h-20 rounded-lg object-cover mr-4"
            />
            <view class="flex-1">
              <view class="font-medium text-gray-800 mb-1">
                {{ group.selectedScript.name }}
              </view>
              <view class="text-sm text-gray-500">
                难度：{{ group.selectedScript.difficulty }} | 所需道具：{{ group.selectedScript.props.length }}项
              </view>
            </view>
          </view>

          <!-- 道具核对表格：核心对比区域 -->
          <view class="prop-table bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <!-- 表格表头 -->
            <view class="grid grid-cols-4 bg-gray-50 text-sm font-medium text-gray-600 py-3 px-4">
              <view class="col-span-1">
                道具名称
              </view>
              <view class="col-span-1">
                需求数量
              </view>
              <view class="col-span-1">
                当前库存
              </view>
              <view class="col-span-1 text-center">
                状态
              </view>
            </view>

            <!-- 表格内容：逐项对比 -->
            <view
              v-for="(prop, pIndex) in group.selectedScript.props"
              :key="pIndex"
              class="grid grid-cols-4 items-center py-3 px-4 border-t border-gray-100"
            >
              <!-- 道具名称 -->
              <view class="col-span-1 flex items-center">
                <!-- 匹配货品管理中的道具图片 -->
                <image
                  :src="goodsStock.find(item => item.name === prop.name)?.img || '/static/images/goods/default.png'"
                  alt="道具图片"
                  class="w-6 h-6 rounded mr-2 object-cover"
                />
                <text class="text-gray-700">
                  {{ prop.name }}
                </text>
              </view>

              <!-- 需求数量 -->
              <view class="col-span-1 text-gray-700">
                {{ prop.needCount }}个
              </view>

              <!-- 当前库存：短缺时红色 -->
              <view class="col-span-1">
                <text :class="getPropCompareResult(prop.name, prop.needCount).shortage ? 'text-red-500 font-medium' : 'text-gray-700'">
                  {{ getPropCompareResult(prop.name, prop.needCount).currentStock }}个
                </text>
              </view>

              <!-- 状态：短缺时红色提醒 -->
              <view class="col-span-1 text-center">
                <view v-if="getPropCompareResult(prop.name, prop.needCount).shortage" class="text-red-500 text-sm flex items-center justify-center">
                  <view class="i-carbon-warning mr-1"></view>
                  短缺{{ getPropCompareResult(prop.name, prop.needCount).shortageCount }}个
                </view>
                <view v-else class="text-green-500 text-sm flex items-center justify-center">
                  <view class="i-carbon-check mr-1"></view>
                  库存充足
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* 图片加载异常占位 */
image {
  background-color: #f9fafb;
}

/* 按钮基础样式重置 */
button {
  border: none;
  outline: none;
  cursor: pointer;
}

/* 响应式适配：小屏表格横向滚动 */
@media (max-width: 767px) {
  .prop-table {
    overflow-x: auto;
  }
  .grid.grid-cols-4 {
    min-width: 320px;
  }
  .script-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .script-card image {
    width: 100%;
    height: auto;
    margin-bottom: 3px;
  }
}
</style>

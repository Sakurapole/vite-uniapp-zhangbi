<script setup>
import { computed, ref } from 'vue'

const searchKey = ref('')
const activePerson = ref('all')
const activeDifficulty = ref('all')
const scriptList = ref([
  {
    id: 1,
    name: '皇帝爱上王者荣耀',
    img: 'https://i.postimg.cc/jj7s549M/ghost.png',
    tags: ['搞笑剧本', '恐怖', '剧情向'],
    person: 3,
    difficulty: 'hard',
    items: ['手电筒', '水杯', '夜视镜'],
  },
  {
    id: 2,
    name: '转生成为史莱姆',
    img: 'https://i.postimg.cc/jj7s549M/ghost.png',
    tags: ['可怕剧本', '悬疑', '解谜'],
    person: 2,
    difficulty: 'medium',
    items: ['手电筒', '急救包'],
  },
  {
    id: 3,
    name: '假如明天世界末日',
    img: 'https://i.postimg.cc/jj7s549M/ghost.png',
    tags: ['开心剧本', '校园', '新手'],
    person: 4,
    difficulty: 'easy',
    items: ['手电筒', '笔记本'],
  },
  {
    id: 4,
    name: '霸道总裁爱上穿棉裤的我',
    img: 'https://i.postimg.cc/jj7s549M/ghost.png',
    tags: ['开心剧本', '探险', '高难度'],
    person: 1,
    difficulty: 'hard',
    items: ['手电筒', '绳索', '水杯'],
  },
])

const filteredScripts = computed(() => {
  return scriptList.value.filter((script) => {
    const matchSearch = searchKey.value.trim()
      ? script.name.toLowerCase().includes(searchKey.value.trim().toLowerCase())
      || script.tags.some(tag => tag.toLowerCase().includes(searchKey.value.trim().toLowerCase()))
      : true

    const matchPerson = activePerson.value === 'all' ? true : script.person === Number(activePerson.value)

    const matchDifficulty = activeDifficulty.value === 'all' ? true : script.difficulty === activeDifficulty.value
    return matchSearch && matchPerson && matchDifficulty
  })
})

function togglePerson(person) {
  activePerson.value = person
}
function toggleDifficulty(difficulty) {
  activeDifficulty.value = difficulty
}

function difficultyText(key) {
  const map = { easy: '简单', medium: '中等', hard: '困难' }
  return map[key] || key
}
</script>

<template>
  <view class="script-page h-full flex flex-col bg-gray-50">
    <view class="navbar h-16 bg-white border-b border-gray-100 flex items-center px-6">
      <view class="text-xl font-bold text-blue-600">
        剧本管理
      </view>
    </view>

    <view class="content flex-1 overflow-auto p-4 md:p-6">
      <view class="search-bar bg-white rounded-xl border border-gray-100 p-3 mb-4 flex items-center">
        <view class="i-carbon-search text-gray-400 ml-2 mr-3"></view>
        <input
          v-model="searchKey"
          placeholder="搜索剧本名称/标签"
          class="flex-1 bg-transparent outline-none text-gray-700 text-sm"
          type="text"
        />
      </view>

      <view class="filter-bar mb-6 space-y-3">
        <!-- 人数筛选 -->
        <view class="flex items-center space-x-2">
          <view class="text-sm font-medium text-gray-700 w-16">
            人数：
          </view>
          <view class="flex flex-wrap gap-2">
            <button
              class="px-3 py-1 rounded-full text-sm transition-colors"
              :class="activePerson === 'all' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'"
              @click="togglePerson('all')"
            >
              全部
            </button>
            <button
              class="px-3 py-1 rounded-full text-sm transition-colors"
              :class="activePerson === '1' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'"
              @click="togglePerson('1')"
            >
              1人
            </button>
            <button
              class="px-3 py-1 rounded-full text-sm transition-colors"
              :class="activePerson === '2' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'"
              @click="togglePerson('2')"
            >
              2人
            </button>
            <button
              class="px-3 py-1 rounded-full text-sm transition-colors"
              :class="activePerson === '3' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'"
              @click="togglePerson('3')"
            >
              3人
            </button>
            <button
              class="px-3 py-1 rounded-full text-sm transition-colors"
              :class="activePerson === '4' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'"
              @click="togglePerson('4')"
            >
              4人
            </button>
          </view>
        </view>

        <!-- 难度筛选 -->
        <view class="flex items-center space-x-2">
          <view class="text-sm font-medium text-gray-700 w-16">
            难度：
          </view>
          <view class="flex flex-wrap gap-2">
            <button
              class="px-3 py-1 rounded-full text-sm transition-colors"
              :class="activeDifficulty === 'all' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'"
              @click="toggleDifficulty('all')"
            >
              全部
            </button>
            <button
              class="px-3 py-1 rounded-full text-sm transition-colors"
              :class="activeDifficulty === 'easy' ? 'bg-green-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'"
              @click="toggleDifficulty('easy')"
            >
              简单
            </button>
            <button
              class="px-3 py-1 rounded-full text-sm transition-colors"
              :class="activeDifficulty === 'medium' ? 'bg-yellow-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-yellow-300'"
              @click="toggleDifficulty('medium')"
            >
              中等
            </button>
            <button
              class="px-3 py-1 rounded-full text-sm transition-colors"
              :class="activeDifficulty === 'hard' ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300'"
              @click="toggleDifficulty('hard')"
            >
              困难
            </button>
          </view>
        </view>
      </view>

      <view class="script-list grid grid-cols-1 gap-4">
        <!-- 空列表提示 -->
        <view v-if="filteredScripts.length === 0" class="text-center text-gray-500 py-10">
          <view class="i-carbon-file-text text-4xl mb-2"></view>
          <text>暂无匹配的剧本数据</text>
        </view>

        <!-- 剧本卡片 -->
        <view
          v-for="script in filteredScripts"
          :key="script.id"
          class="script-card bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
          <div class="flex flex-col md:flex-row">
            <div class="w-full md:w-1/3 h-48 md:h-auto relative">
              <image
                :src="script.img"
                alt="剧本图片"
                class="w-full h-full object-cover"
              />

              <div class="absolute top-3 right-3 flex flex-wrap gap-2">
                <span class="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                  {{ script.tags[0] }}
                </span>
                <span class="px-2 py-1 bg-gray-700 text-white text-xs rounded-full">
                  {{ script.tags[1] }}
                </span>
              </div>
            </div>

            <!-- 卡片内容：右侧文字区域 -->
            <div class="w-full md:w-2/3 p-4 flex flex-col justify-between">
              <!-- 上半部分：名称+基础信息 -->
              <div>
                <view class="text-lg font-bold text-gray-800 mb-2">
                  {{ script.name }}
                </view>
                <div class="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div class="flex items-center">
                    <i class="i-carbon-users mr-1 text-gray-400"></i>
                    <span>{{ script.person }}人</span>
                  </div>
                  <div class="flex items-center">
                    <i class="i-carbon-difficulty mr-1" :class="script.difficulty === 'easy' ? 'text-green-500' : script.difficulty === 'medium' ? 'text-yellow-500' : 'text-red-500'"></i>
                    <span>{{ difficultyText(script.difficulty) }}</span>
                  </div>
                </div>
              </div>

              <!-- 下半部分：所需物品 -->
              <div class="mt-2">
                <view class="text-xs text-gray-500 mb-1">
                  所需物品：
                </view>
                <div class="flex flex-wrap gap-2">
                  <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                    {{ script.items[0] }}
                  </span>
                  <span class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                    {{ script.items[1] }}
                  </span>
                  <span v-if="script.items[2]" class="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                    {{ script.items[2] }}
                  </span>
                </div>
              </div>
            </div>
          </div>
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

/* 适配小屏卡片布局 */
@media (max-width: 767px) {
  .script-card .flex {
    flex-direction: column;
  }
  .script-card .w-full.md\:w-1\/3 {
    width: 100%;
    height: 200px;
  }
  .script-card .w-full.md\:w-2\/3 {
    width: 100%;
  }
}
</style>

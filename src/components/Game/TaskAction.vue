<script setup>
import { computed, ref } from 'vue'
import { MECHANISM_TYPES } from '@/constants/mechanisms'
import { useGameStore } from '@/store/game'

const gameStore = useGameStore()
const inputValue = ref('') // 用于文本输入或工作人员ID

// 🧠 计算当前需要展示的机制列表
const activeMechanisms = computed(() => {
  const task = gameStore.currentTask
  if (!task)
    return []

  const list = []

  // 1. 如果是辅助性任务，把主任务的机制加进来 (isMain = true)
  if (gameStore.isSubTaskAuxiliary) {
    (task.task_complete_mechanisms || []).forEach((m) => {
      list.push({ ...m, isMain: true })
    })
  }

  // 2. 如果选了子任务，把子任务的机制加进来 (isMain = false)
  if (gameStore.selectedSubTaskId && task.sub_tasks) {
    const sub = task.sub_tasks.find(s => s.sub_task_id === gameStore.selectedSubTaskId)
    if (sub && sub.task_complete_mechanism) {
      sub.task_complete_mechanism.forEach((m) => {
        list.push({ ...m, isMain: false })
      })
    }
  }
  // 3. 如果没子任务，只加主任务机制
  else if (!task.having_sub_tasks) {
    (task.task_complete_mechanisms || []).forEach((m) => {
      list.push({ ...m, isMain: true }) // 这种情况下 isMain 标记其实不重要
    })
  }

  return list
})

// --- 各种提交处理函数 ---

// 1. GPS 提交
async function handleGPS(mech) {
  uni.showLoading({ title: '定位中...' })
  try {
    const res = await uni.getLocation({ type: 'gcj02' })
    gameStore.submitTask({
      user_location_coordinate: [res.longitude, res.latitude],
    }, mech.mechanism_name, mech.isMain)
  }
  catch (e) {
    uni.showToast({ title: '定位失败，请检查权限', icon: 'none' })
  }
}

// 2. 图片提交
function handleImage(mech) {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      // TODO: 这里需要先调用你的 uploadFileAPI 把图片传到服务器拿到 URL
      // const imageUrl = await uploadFile(res.tempFilePaths[0])
      const mockUrl = 'http://mock-url.com/image.jpg'

      gameStore.submitTask({
        image: mockUrl,
      }, mech.mechanism_name, mech.isMain)
    },
  })
}

// 3. 扫码/文本提交
function handleScanOrInput(mech) {
  // 如果是扫码
  uni.scanCode({
    success: (res) => {
      gameStore.submitTask({
        staff_id: res.result, // 假设扫码结果就是 ID
      }, mech.mechanism_name, mech.isMain)
    },
  })
}

// 4. 文本答案提交
function handleAnswer(mech) {
  if (!inputValue.value)
    return uni.showToast({ title: '请输入答案', icon: 'none' })
  gameStore.submitTask({
    answer: inputValue.value,
  }, mech.mechanism_name, mech.isMain)
  inputValue.value = ''
}
</script>

<template>
  <view class="mt-4 space-y-4">
    <view
      v-for="(mech, index) in activeMechanisms"
      :key="index"
      class="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
    >
      <view class="flex justify-between items-center mb-3">
        <view class="flex items-center gap-2">
          <text class="font-bold text-gray-800">
            {{ MECHANISM_TYPES[mech.mechanism_name]?.label || mech.mechanism_name }}
          </text>
          <text v-if="mech.isMain && gameStore.isSubTaskAuxiliary" class="text-[10px] bg-green-100 text-green-600 px-1 rounded">
            主任务目标
          </text>
        </view>
      </view>

      <button
        v-if="mech.mechanism_name === 'GPS_CHECK'"
        class="bg-blue-50 text-blue-600 w-full py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold active:scale-95"
        @click="handleGPS(mech)"
      >
        <view class="i-carbon-location"></view> 打卡当前位置
      </button>

      <button
        v-else-if="mech.mechanism_name === 'AI_IMAGE_JUDGE'"
        class="bg-orange-50 text-orange-600 w-full py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold active:scale-95"
        @click="handleImage(mech)"
      >
        <view class="i-carbon-camera"></view> 拍照上传
      </button>

      <view v-else-if="mech.mechanism_name === 'STAFF_CONFIRM'" class="flex gap-2">
        <button class="flex-1 bg-indigo-600 text-white text-sm" @click="handleScanOrInput(mech)">
          扫核销码
        </button>
      </view>

      <view v-else-if="mech.mechanism_name === 'AI_ANSWER_CORRECT'" class="flex gap-2">
        <input v-model="inputValue" class="flex-1 bg-gray-100 rounded px-3 text-sm" placeholder="输入答案" />
        <button class="bg-indigo-600 text-white text-xs px-4" @click="handleAnswer(mech)">
          提交
        </button>
      </view>

      <view v-else-if="mech.mechanism_name === 'AI_NPC_DIALOGUE_COMPLETE'" class="text-xs text-gray-400 bg-gray-50 p-2 rounded text-center">
        💡 请点击下方“NPC对话”按钮与角色互动以完成此任务
      </view>
    </view>
  </view>
</template>

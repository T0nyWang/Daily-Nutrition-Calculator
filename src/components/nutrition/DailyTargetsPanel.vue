<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useNutritionStore } from '../../stores'
import { formatNumber } from '../../utils/nutrition'

const nutritionStore = useNutritionStore()
const { currentTargets, selectedDate, summaryRows, tdee } = storeToRefs(nutritionStore)

const calorieDifferenceTone = computed(() => {
  const caloriesRow = summaryRows.value.find((row) => row.key === 'calories')

  if (!caloriesRow || caloriesRow.difference === null) {
    return 'info'
  }

  if (caloriesRow.difference > 0) {
    return 'danger'
  }

  if (caloriesRow.difference < 0) {
    return 'success'
  }

  return 'info'
})
</script>

<template>
  <article class="app-panel">
    <div class="panel-heading">
      <div>
        <p class="panel-kicker">Day</p>
        <h2>日期與每日目標</h2>
      </div>
    </div>

    <div class="date-toolbar">
      <el-button @click="nutritionStore.shiftSelectedDate(-1)">前一天</el-button>
      <el-date-picker
        v-model="selectedDate"
        type="date"
        value-format="YYYY-MM-DD"
        format="YYYY/MM/DD"
        :clearable="false"
        class="date-picker"
      />
      <el-button @click="nutritionStore.goToToday()">今天</el-button>
      <el-button @click="nutritionStore.shiftSelectedDate(1)">後一天</el-button>
    </div>

    <el-form label-position="top" class="stack-form">
      <el-form-item label="熱量目標模式">
        <el-radio-group v-model="currentTargets.calorieMode">
          <el-radio-button label="tdee">使用 TDEE</el-radio-button>
          <el-radio-button label="custom">自訂熱量</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <div class="form-grid form-grid-4">
        <el-form-item label="熱量目標 (kcal)">
          <el-input-number
            v-model="currentTargets.customCalories"
            :min="0"
            :step="50"
            controls-position="right"
            :disabled="currentTargets.calorieMode === 'tdee'"
          />
        </el-form-item>

        <el-form-item label="蛋白質目標 (g)">
          <el-input-number v-model="currentTargets.proteinGrams" :min="0" :step="5" controls-position="right" />
        </el-form-item>

        <el-form-item label="碳水目標 (g)">
          <el-input-number v-model="currentTargets.carbGrams" :min="0" :step="5" controls-position="right" />
        </el-form-item>

        <el-form-item label="脂肪目標 (g)">
          <el-input-number v-model="currentTargets.fatGrams" :min="0" :step="1" controls-position="right" />
        </el-form-item>
      </div>
    </el-form>

    <el-alert
      :title="
        currentTargets.calorieMode === 'tdee'
          ? `今日熱量目標將使用 TDEE：${tdee === null ? '請先完成基本資料' : `${formatNumber(tdee, 0)} kcal`}`
          : `今日使用自訂熱量目標：${formatNumber(currentTargets.customCalories ?? 0, 0)} kcal`
      "
      :type="calorieDifferenceTone"
      :closable="false"
      show-icon
    />
  </article>
</template>

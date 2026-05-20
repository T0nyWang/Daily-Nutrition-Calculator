<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { SummaryMethod } from 'element-plus'

import { MEAL_DEFINITIONS } from '../../constants/nutrition'
import { useNutritionStore } from '../../stores'
import type { FoodSource, MealEntry, MealKey } from '../../types/nutrition'
import { formatNumber, getEntryMeasurementUnit } from '../../utils/nutrition'

const emit = defineEmits<{
  'create-entry': [payload: { meal: MealKey; source: FoodSource }]
  'edit-entry': [entry: MealEntry]
  'delete-entry': [entry: MealEntry]
}>()

const nutritionStore = useNutritionStore()
const { databaseError, databaseFoods, databaseLoading, entriesByMeal, mealTotals } = storeToRefs(nutritionStore)

function getMealTableSummary(meal: MealKey) {
  const totals = mealTotals.value[meal]

  return [
    '總計',
    `${totals.count} 項`,
    `${formatNumber(totals.protein)} g`,
    `${formatNumber(totals.carb)} g`,
    `${formatNumber(totals.fat)} g`,
    `${formatNumber(totals.calories, 0)} kcal`,
    '',
  ]
}

function getMealTableSummaryMethod(meal: MealKey): SummaryMethod<MealEntry> {
  return () => getMealTableSummary(meal)
}
</script>

<template>
  <section class="app-panel meals-panel">
    <div class="panel-heading">
      <div>
        <p class="panel-kicker">Meals</p>
        <h2>五餐紀錄</h2>
      </div>

      <div class="inline-actions">
        <el-tag type="info" size="large">資料庫 {{ databaseFoods.length }} 筆</el-tag>
        <el-tag v-if="databaseLoading" type="warning" size="large">讀取資料庫中</el-tag>
      </div>
    </div>

    <el-alert
      v-if="databaseError"
      :title="databaseError"
      type="error"
      :closable="false"
      show-icon
      class="section-alert"
    />

    <div class="meal-list">
      <article v-for="meal in MEAL_DEFINITIONS" :key="meal.key" class="meal-card">
        <div class="meal-header">
          <div>
            <h3>{{ meal.label }}</h3>
            <p>{{ mealTotals[meal.key].count }} 項 · {{ formatNumber(mealTotals[meal.key].calories, 0) }} kcal</p>
          </div>

          <div class="inline-actions">
            <el-button type="primary" plain @click="emit('create-entry', { meal: meal.key, source: 'database' })">
              從資料庫新增
            </el-button>
            <el-button @click="emit('create-entry', { meal: meal.key, source: 'custom' })">從自訂食物新增</el-button>
          </div>
        </div>

        <div class="table-shell">
          <el-table
            :data="entriesByMeal[meal.key]"
            empty-text="尚未新增餐點"
            class="entry-table"
            scrollbar-always-on
            show-summary
            :summary-method="getMealTableSummaryMethod(meal.key)"
          >
            <el-table-column label="品項" min-width="220">
              <template #default="{ row }">
                <div class="table-name-cell">
                  <strong>{{ row.foodNameSnapshot }}</strong>
                  <span>{{ `${row.source === 'database' ? '資料庫' : '自訂'} · ${getEntryMeasurementUnit(row)}` }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="grams" label="份量" width="110">
              <template #default="{ row }">{{ formatNumber(row.grams, 0) }} {{ getEntryMeasurementUnit(row) }}</template>
            </el-table-column>
            <el-table-column label="蛋白質" width="110">
              <template #default="{ row }">{{ formatNumber(row.nutrition.protein) }} g</template>
            </el-table-column>
            <el-table-column label="碳水" width="110">
              <template #default="{ row }">{{ formatNumber(row.nutrition.carb) }} g</template>
            </el-table-column>
            <el-table-column label="脂肪" width="110">
              <template #default="{ row }">{{ formatNumber(row.nutrition.fat) }} g</template>
            </el-table-column>
            <el-table-column label="熱量" width="110">
              <template #default="{ row }">{{ formatNumber(row.nutrition.calories, 0) }} kcal</template>
            </el-table-column>
            <el-table-column label="操作" width="160">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button type="primary" plain size="small" @click="emit('edit-entry', row)">編輯</el-button>
                  <el-button type="danger" plain size="small" @click="emit('delete-entry', row)">刪除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.meals-panel {
  margin-top: 20px;
}

.meal-list {
  display: grid;
  gap: 18px;
  margin-top: 18px;
}

.meal-card {
  min-width: 0;
  padding: 20px;
  border-radius: 24px;
  background: rgba(249, 250, 251, 0.75);
  border: 1px solid rgba(31, 41, 55, 0.06);
}

.meal-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
}

.meal-header h3 {
  margin: 0;
  font-family: "Georgia", "Times New Roman", serif;
  letter-spacing: -0.02em;
}

.meal-header p {
  margin: 12px 0 0;
  color: var(--ink-subtle);
  font-size: 0.94rem;
}

.entry-table {
  margin-top: 16px;
}

@media (max-width: 1120px) {
  .meal-header {
    align-items: stretch;
  }

  .meal-header .inline-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: min(100%, 440px);
  }

  .meal-header .inline-actions > .el-button {
    width: 100%;
  }
}

@media (max-width: 720px) {
  .meal-header {
    flex-direction: column;
  }
}
</style>

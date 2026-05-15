<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, EditPen } from '@element-plus/icons-vue'

import {
  ACTIVITY_LEVEL_OPTIONS,
  MEAL_DEFINITIONS,
  SEX_OPTIONS,
} from '../constants/nutrition'
import type { FoodReference, FoodSource, MealEntry, MealKey } from '../types/nutrition'
import { useNutritionStore } from '../stores'
import { calculateCaloriesFromMacros, formatNumber, normalizeFoodSearch } from '../utils/nutrition'

type EntryDialogMode = 'create' | 'edit'
type CustomFoodDialogMode = 'create' | 'edit'

const nutritionStore = useNutritionStore()
const {
  customFoods,
  currentTargets,
  databaseError,
  databaseFoods,
  databaseLoading,
  entriesByMeal,
  mealTotals,
  profile,
  selectedDate,
  summaryRows,
  totals,
  bmr,
  tdee,
  effectiveCalorieTarget,
} = storeToRefs(nutritionStore)

const COMPACT_BREAKPOINT = 720
const isCompact = ref(false)
let compactMediaQuery: MediaQueryList | null = null

const entryDialog = reactive({
  visible: false,
  mode: 'create' as EntryDialogMode,
  meal: 'breakfast' as MealKey,
  source: 'database' as FoodSource,
  query: '',
  selectedFoodId: '',
  grams: 100,
  editingEntryId: '',
})

const customFoodDialog = reactive({
  visible: false,
  mode: 'create' as CustomFoodDialogMode,
  id: '',
  name: '',
  category: '',
  alias: '',
  description: '',
  referenceGrams: 100,
  protein: 0,
  carb: 0,
  fat: 0,
  calories: null as number | null,
})

const dateLabel = computed(() => {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
})

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

const entrySourceFoods = computed(() => {
  return entryDialog.source === 'database' ? databaseFoods.value : customFoods.value
})

const filteredEntryFoods = computed(() => {
  const query = normalizeFoodSearch(entryDialog.query)
  const foods = entrySourceFoods.value

  if (!query) {
    return foods.slice(0, 40)
  }

  return foods.filter((food) => normalizeFoodSearch(food.searchText ?? '').includes(query)).slice(0, 60)
})

const selectedEntryFood = computed(() => {
  return entrySourceFoods.value.find((food) => food.id === entryDialog.selectedFoodId) ?? null
})

const customFoodCaloriesPreview = computed(() => {
  if (customFoodDialog.calories !== null) {
    return customFoodDialog.calories
  }

  return calculateCaloriesFromMacros({
    protein: customFoodDialog.protein,
    carb: customFoodDialog.carb,
    fat: customFoodDialog.fat,
  })
})

onMounted(() => {
  if (typeof window !== 'undefined') {
    compactMediaQuery = window.matchMedia(`(max-width: ${COMPACT_BREAKPOINT}px)`)
    syncViewportState(compactMediaQuery)
    compactMediaQuery.addEventListener('change', syncViewportState)
  }

  nutritionStore.loadDatabase()
})

onBeforeUnmount(() => {
  compactMediaQuery?.removeEventListener('change', syncViewportState)
})

function syncViewportState(event?: MediaQueryList | MediaQueryListEvent) {
  isCompact.value = event ? event.matches : false
}

function openEntryDialog(meal: MealKey, source: FoodSource) {
  entryDialog.visible = true
  entryDialog.mode = 'create'
  entryDialog.meal = meal
  entryDialog.source = source
  entryDialog.query = ''
  entryDialog.selectedFoodId = ''
  entryDialog.grams = 100
  entryDialog.editingEntryId = ''
}

function editEntry(entry: MealEntry) {
  entryDialog.visible = true
  entryDialog.mode = 'edit'
  entryDialog.meal = entry.meal
  entryDialog.source = entry.source
  entryDialog.query = entry.foodNameSnapshot
  entryDialog.selectedFoodId = entry.foodId
  entryDialog.grams = entry.grams
  entryDialog.editingEntryId = entry.id
}

function submitEntryDialog() {
  const food = selectedEntryFood.value

  if (!food) {
    ElMessage.warning('請先選擇一個食品')
    return
  }

  if (!entryDialog.grams || entryDialog.grams <= 0) {
    ElMessage.warning('請輸入有效的食用克數')
    return
  }

  nutritionStore.saveMealEntry({
    entryId: entryDialog.mode === 'edit' ? entryDialog.editingEntryId : undefined,
    meal: entryDialog.meal,
    food,
    grams: entryDialog.grams,
  })

  ElMessage.success(entryDialog.mode === 'edit' ? '已更新餐點項目' : '已新增餐點項目')
  entryDialog.visible = false
}

async function removeEntry(entry: MealEntry) {
  await ElMessageBox.confirm(`這筆餐點資料會從「${entry.meal === 'breakfast' ? '早餐' : entry.meal === 'lunch' ? '午餐' : entry.meal === 'dinner' ? '晚餐' : entry.meal === 'snack' ? '點心' : '宵夜'}」移除，確定要刪除「${entry.foodNameSnapshot}」嗎？`, '刪除餐點項目', {
    type: 'warning',
    confirmButtonText: '確認刪除',
    cancelButtonText: '保留資料',
    confirmButtonClass: 'danger-confirm-button',
    cancelButtonClass: 'danger-cancel-button',
    customClass: 'danger-message-box',
    distinguishCancelAndClose: true,
  })

  nutritionStore.deleteMealEntry(entry.meal, entry.id)
  ElMessage.success('已刪除餐點項目')
}

function openCustomFoodDialog(food?: FoodReference) {
  customFoodDialog.visible = true

  if (food) {
    const referenceGrams = food.referenceGrams ?? 100

    customFoodDialog.mode = 'edit'
    customFoodDialog.id = food.id
    customFoodDialog.name = food.name
    customFoodDialog.category = food.category ?? ''
    customFoodDialog.alias = food.alias ?? ''
    customFoodDialog.description = food.description ?? ''
    customFoodDialog.referenceGrams = referenceGrams
    customFoodDialog.protein = Number(((food.per100g.protein * referenceGrams) / 100).toFixed(1))
    customFoodDialog.carb = Number(((food.per100g.carb * referenceGrams) / 100).toFixed(1))
    customFoodDialog.fat = Number(((food.per100g.fat * referenceGrams) / 100).toFixed(1))
    customFoodDialog.calories = Number(((food.per100g.calories * referenceGrams) / 100).toFixed(1))
    return
  }

  customFoodDialog.mode = 'create'
  customFoodDialog.id = ''
  customFoodDialog.name = ''
  customFoodDialog.category = ''
  customFoodDialog.alias = ''
  customFoodDialog.description = ''
  customFoodDialog.referenceGrams = 100
  customFoodDialog.protein = 0
  customFoodDialog.carb = 0
  customFoodDialog.fat = 0
  customFoodDialog.calories = null
}

function submitCustomFoodDialog() {
  if (!customFoodDialog.name.trim()) {
    ElMessage.warning('請輸入自訂食物名稱')
    return
  }

  if (!customFoodDialog.referenceGrams || customFoodDialog.referenceGrams <= 0) {
    ElMessage.warning('請輸入有效的參考重量')
    return
  }

  nutritionStore.saveCustomFood({
    id: customFoodDialog.mode === 'edit' ? customFoodDialog.id : undefined,
    name: customFoodDialog.name.trim(),
    category: customFoodDialog.category.trim() || undefined,
    alias: customFoodDialog.alias.trim() || undefined,
    description: customFoodDialog.description.trim() || undefined,
    referenceGrams: customFoodDialog.referenceGrams,
    protein: customFoodDialog.protein,
    carb: customFoodDialog.carb,
    fat: customFoodDialog.fat,
    calories: customFoodDialog.calories,
  })

  ElMessage.success(customFoodDialog.mode === 'edit' ? '已更新自訂食物' : '已建立自訂食物')
  customFoodDialog.visible = false
}

async function removeCustomFood(food: FoodReference) {
  await ElMessageBox.confirm(`自訂食物「${food.name}」刪除後，之後新增餐點時將無法再直接選取。確定要刪除嗎？`, '刪除自訂食物', {
    type: 'warning',
    confirmButtonText: '確認刪除',
    cancelButtonText: '先保留',
    confirmButtonClass: 'danger-confirm-button',
    cancelButtonClass: 'danger-cancel-button',
    customClass: 'danger-message-box',
    distinguishCancelAndClose: true,
  })

  nutritionStore.deleteCustomFood(food.id)
  ElMessage.success('已刪除自訂食物')
}
</script>

<template>
  <main class="nutrition-app">
    <section class="hero-panel">
      <div class="hero-copy">
        <p class="hero-kicker">Daily Nutrition Calculator</p>
        <h1>每日熱量與三大營養素追蹤</h1>
        <p class="hero-description">
          依照個人資料計算 BMR 與 TDEE，搭配食品資料庫與自訂食物，建立可長期保存的每日飲食紀錄。
        </p>
      </div>

      <div class="hero-stats">
        <article class="metric-card">
          <span>選擇日期</span>
          <strong>{{ dateLabel }}</strong>
          <small>{{ selectedDate }}</small>
        </article>

        <article class="metric-card">
          <span>今日總熱量</span>
          <strong>{{ formatNumber(totals.calories, 0) }} kcal</strong>
          <small>
            目標
            {{ effectiveCalorieTarget === null ? '請先完成基本資料' : `${formatNumber(effectiveCalorieTarget, 0)} kcal` }}
          </small>
        </article>

        <article class="metric-card">
          <span>BMR / TDEE</span>
          <strong>
            {{ bmr === null ? '--' : formatNumber(bmr, 0) }}
            /
            {{ tdee === null ? '--' : formatNumber(tdee, 0) }}
          </strong>
          <small>依 Mifflin-St Jeor 公式估算</small>
        </article>
      </div>
    </section>

    <section class="panel-grid top-grid">
      <article class="app-panel">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Profile</p>
            <h2>基本資料與代謝估算</h2>
          </div>
        </div>

        <el-form label-position="top" class="stack-form">
          <div class="form-grid form-grid-5">
            <el-form-item label="性別">
              <el-segmented v-model="profile.sex" :options="SEX_OPTIONS" block />
            </el-form-item>

            <el-form-item label="年齡">
              <el-input-number v-model="profile.age" :min="1" :max="120" :step="1" controls-position="right" />
            </el-form-item>

            <el-form-item label="身高 (cm)">
              <el-input-number v-model="profile.heightCm" :min="50" :max="260" :step="1" controls-position="right" />
            </el-form-item>

            <el-form-item label="體重 (kg)">
              <el-input-number v-model="profile.weightKg" :min="20" :max="300" :step="0.1" controls-position="right" />
            </el-form-item>

            <el-form-item label="活動量">
              <el-select v-model="profile.activityLevel" placeholder="請選擇活動量">
                <el-option
                  v-for="option in ACTIVITY_LEVEL_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </div>
        </el-form>

        <div class="calculation-grid">
          <div class="calculation-card">
            <span>BMR</span>
            <strong>{{ bmr === null ? '--' : `${formatNumber(bmr, 0)} kcal` }}</strong>
            <small>基礎代謝率</small>
          </div>

          <div class="calculation-card">
            <span>TDEE</span>
            <strong>{{ tdee === null ? '--' : `${formatNumber(tdee, 0)} kcal` }}</strong>
            <small>每日總消耗估算</small>
          </div>
        </div>
      </article>

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
    </section>

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
              <el-button type="primary" plain @click="openEntryDialog(meal.key, 'database')">
                從資料庫新增
              </el-button>
              <el-button @click="openEntryDialog(meal.key, 'custom')">從自訂食物新增</el-button>
            </div>
          </div>

          <div v-if="isCompact" class="table-shell compact-table-shell">
            <table v-if="entriesByMeal[meal.key].length > 0" class="compact-table">
              <thead>
                <tr>
                  <th>品項</th>
                  <th>克</th>
                  <th>kcal</th>
                  <th>P</th>
                  <th>C</th>
                  <th>F</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in entriesByMeal[meal.key]" :key="entry.id">
                  <td class="compact-name-cell">
                    <strong>{{ entry.foodNameSnapshot }}</strong>
                    <span class="compact-meta">
                      {{ entry.source === 'database' ? '資料庫' : '自訂' }}
                    </span>
                  </td>
                  <td>{{ formatNumber(entry.grams, 0) }}</td>
                  <td>{{ formatNumber(entry.nutrition.calories, 0) }}</td>
                  <td>{{ formatNumber(entry.nutrition.protein) }}</td>
                  <td>{{ formatNumber(entry.nutrition.carb) }}</td>
                  <td>{{ formatNumber(entry.nutrition.fat) }}</td>
                  <td class="compact-actions-cell">
                    <div class="compact-action-group">
                      <el-button
                        :icon="EditPen"
                        circle
                        size="small"
                        type="primary"
                        plain
                        title="編輯"
                        @click="editEntry(entry)"
                      />
                      <el-button
                        :icon="Delete"
                        circle
                        size="small"
                        type="danger"
                        plain
                        title="刪除"
                        @click="removeEntry(entry)"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div v-else class="empty-hint">尚未新增餐點</div>
          </div>

          <div v-else class="table-shell">
            <el-table :data="entriesByMeal[meal.key]" empty-text="尚未新增餐點" class="entry-table">
              <el-table-column prop="foodNameSnapshot" label="品項" min-width="220" />
              <el-table-column prop="grams" label="克數" width="90">
                <template #default="{ row }">{{ formatNumber(row.grams, 0) }} g</template>
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
              <el-table-column label="操作" width="160" :fixed="isCompact ? false : 'right'">
                <template #default="{ row }">
                  <div class="table-actions">
                    <el-button type="primary" plain size="small" @click="editEntry(row)">編輯</el-button>
                    <el-button type="danger" plain size="small" @click="removeEntry(row)">刪除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </article>
      </div>
    </section>

    <section class="panel-grid bottom-grid">
      <article class="app-panel">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Summary</p>
            <h2>每日統計與目標對比</h2>
          </div>
        </div>

        <div class="summary-topline">
          <div class="summary-chip">
            <span>實際攝取</span>
            <strong>{{ formatNumber(totals.calories, 0) }} kcal</strong>
          </div>
          <div class="summary-chip">
            <span>蛋白質</span>
            <strong>{{ formatNumber(totals.protein) }} g</strong>
          </div>
          <div class="summary-chip">
            <span>碳水</span>
            <strong>{{ formatNumber(totals.carb) }} g</strong>
          </div>
          <div class="summary-chip">
            <span>脂肪</span>
            <strong>{{ formatNumber(totals.fat) }} g</strong>
          </div>
        </div>

        <div v-if="isCompact" class="summary-card-list">
          <article v-for="row in summaryRows" :key="row.key" class="summary-card-item">
            <div class="summary-card-head">
              <strong>{{ row.label }}</strong>
              <el-tag :type="row.difference === null ? 'info' : row.difference > 0 ? 'danger' : row.difference < 0 ? 'success' : 'info'">
                {{
                  row.difference === null
                    ? '—'
                    : `${row.difference > 0 ? '+' : ''}${formatNumber(row.difference, row.unit === 'kcal' ? 0 : 1)} ${row.unit}`
                }}
              </el-tag>
            </div>
            <p>目標：{{ row.target === null ? '—' : `${formatNumber(row.target, row.unit === 'kcal' ? 0 : 1)} ${row.unit}` }}</p>
            <p>實際：{{ `${formatNumber(row.actual, row.unit === 'kcal' ? 0 : 1)} ${row.unit}` }}</p>
          </article>
        </div>

        <div v-else class="table-shell">
          <el-table :data="summaryRows" class="summary-table">
            <el-table-column prop="label" label="指標" min-width="120" />
            <el-table-column label="目標" min-width="120">
              <template #default="{ row }">
                {{ row.target === null ? '—' : `${formatNumber(row.target, row.unit === 'kcal' ? 0 : 1)} ${row.unit}` }}
              </template>
            </el-table-column>
            <el-table-column label="實際" min-width="120">
              <template #default="{ row }">
                {{ `${formatNumber(row.actual, row.unit === 'kcal' ? 0 : 1)} ${row.unit}` }}
              </template>
            </el-table-column>
            <el-table-column label="差值" min-width="140">
              <template #default="{ row }">
                <el-tag :type="row.difference === null ? 'info' : row.difference > 0 ? 'danger' : row.difference < 0 ? 'success' : 'info'">
                  {{
                    row.difference === null
                      ? '—'
                      : `${row.difference > 0 ? '+' : ''}${formatNumber(row.difference, row.unit === 'kcal' ? 0 : 1)} ${row.unit}`
                  }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </article>

      <article class="app-panel">
        <div class="panel-heading">
          <div>
            <p class="panel-kicker">Custom Foods</p>
            <h2>自訂食物庫</h2>
          </div>

          <el-button type="primary" @click="openCustomFoodDialog()">新增自訂食物</el-button>
        </div>

        <el-alert
          title="自訂食物會保存到 localStorage，之後任何日期都可以重複使用。"
          type="info"
          :closable="false"
          show-icon
          class="section-alert"
        />

        <div v-if="isCompact" class="table-shell compact-table-shell">
          <table v-if="customFoods.length > 0" class="compact-table">
            <thead>
              <tr>
                <th>名稱</th>
                <th>kcal</th>
                <th>P</th>
                <th>C</th>
                <th>F</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="food in customFoods" :key="food.id">
                <td class="compact-name-cell">
                  <strong>{{ food.name }}</strong>
                  <span class="compact-meta">{{ food.category || '未分類' }}</span>
                </td>
                <td>{{ formatNumber(food.per100g.calories, 0) }}</td>
                <td>{{ formatNumber(food.per100g.protein) }}</td>
                <td>{{ formatNumber(food.per100g.carb) }}</td>
                <td>{{ formatNumber(food.per100g.fat) }}</td>
                <td class="compact-actions-cell">
                  <div class="compact-action-group">
                    <el-button
                      :icon="EditPen"
                      circle
                      size="small"
                      type="primary"
                      plain
                      title="編輯"
                      @click="openCustomFoodDialog(food)"
                    />
                    <el-button
                      :icon="Delete"
                      circle
                      size="small"
                      type="danger"
                      plain
                      title="刪除"
                      @click="removeCustomFood(food)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <div v-else class="empty-hint">尚未建立自訂食物</div>
        </div>

        <div v-else class="table-shell">
          <el-table :data="customFoods" empty-text="尚未建立自訂食物" class="custom-food-table">
            <el-table-column prop="name" label="名稱" min-width="180" />
            <el-table-column prop="category" label="分類" min-width="110" />
            <el-table-column label="每 100g 熱量" width="130">
              <template #default="{ row }">{{ formatNumber(row.per100g.calories, 0) }} kcal</template>
            </el-table-column>
            <el-table-column label="蛋白質" width="100">
              <template #default="{ row }">{{ formatNumber(row.per100g.protein) }} g</template>
            </el-table-column>
            <el-table-column label="碳水" width="100">
              <template #default="{ row }">{{ formatNumber(row.per100g.carb) }} g</template>
            </el-table-column>
            <el-table-column label="脂肪" width="100">
              <template #default="{ row }">{{ formatNumber(row.per100g.fat) }} g</template>
            </el-table-column>
            <el-table-column label="操作" width="160" :fixed="isCompact ? false : 'right'">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button type="primary" plain size="small" @click="openCustomFoodDialog(row)">編輯</el-button>
                  <el-button type="danger" plain size="small" @click="removeCustomFood(row)">刪除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </article>
    </section>

    <el-dialog
      v-model="entryDialog.visible"
      :title="entryDialog.mode === 'edit' ? '編輯餐點項目' : `新增${MEAL_DEFINITIONS.find((item) => item.key === entryDialog.meal)?.label ?? ''}餐點`"
      width="min(960px, 92vw)"
      class="app-dialog entry-dialog"
      destroy-on-close
    >
      <div class="dialog-layout">
        <div class="dialog-main dialog-panel">
          <el-form label-position="top">
            <el-form-item label="資料來源">
              <el-radio-group v-model="entryDialog.source">
                <el-radio-button label="database">食品資料庫</el-radio-button>
                <el-radio-button label="custom">自訂食物庫</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="搜尋食品">
              <el-input
                v-model="entryDialog.query"
                :placeholder="entryDialog.source === 'database' ? '輸入品名、俗名、描述或分類' : '輸入自訂食物名稱'"
                clearable
              />
            </el-form-item>

            <div class="dialog-section">
              <div class="dialog-section-head">
                <strong>搜尋結果</strong>
                <span>{{ filteredEntryFoods.length }} 筆</span>
              </div>

              <div class="food-results">
                <button
                  v-for="food in filteredEntryFoods"
                  :key="food.id"
                  type="button"
                  class="food-option"
                  :class="{ 'is-selected': food.id === entryDialog.selectedFoodId }"
                  @click="entryDialog.selectedFoodId = food.id"
                >
                  <strong>{{ food.name }}</strong>
                  <span>{{ food.category || '未分類' }}</span>
                  <small>{{ food.alias || food.description || '—' }}</small>
                </button>

                <div v-if="filteredEntryFoods.length === 0" class="empty-hint">
                  {{ entryDialog.source === 'custom' ? '目前沒有符合條件的自訂食物' : '找不到符合條件的食品資料' }}
                </div>
              </div>
            </div>
          </el-form>
        </div>

        <aside class="dialog-sidebar">
          <div class="selection-card">
            <div class="dialog-section-head">
              <strong>已選食品</strong>
              <span>{{ selectedEntryFood ? '可加入餐點' : '尚未選取' }}</span>
            </div>

            <div class="selection-hero">
              <h3>{{ selectedEntryFood?.name ?? '尚未選擇食品' }}</h3>
              <p class="selection-meta">{{ selectedEntryFood?.category || '請從左側列表選一個項目' }}</p>
            </div>

            <template v-if="selectedEntryFood">
              <div class="per100-grid">
                <div>
                  <span>熱量</span>
                  <strong>{{ formatNumber(selectedEntryFood.per100g.calories, 0) }}</strong>
                </div>
                <div>
                  <span>蛋白質</span>
                  <strong>{{ formatNumber(selectedEntryFood.per100g.protein) }}</strong>
                </div>
                <div>
                  <span>碳水</span>
                  <strong>{{ formatNumber(selectedEntryFood.per100g.carb) }}</strong>
                </div>
                <div>
                  <span>脂肪</span>
                  <strong>{{ formatNumber(selectedEntryFood.per100g.fat) }}</strong>
                </div>
              </div>
            </template>

            <el-form label-position="top" class="dialog-form">
              <el-form-item label="食用克數">
                <el-input-number v-model="entryDialog.grams" :min="1" :step="5" controls-position="right" />
              </el-form-item>
            </el-form>
          </div>
        </aside>
      </div>

      <template #footer>
        <el-button type="primary" @click="submitEntryDialog">
          {{ entryDialog.mode === 'edit' ? '儲存變更' : '新增餐點' }}
        </el-button>
        <el-button @click="entryDialog.visible = false">取消</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="customFoodDialog.visible"
      :title="customFoodDialog.mode === 'edit' ? '編輯自訂食物' : '新增自訂食物'"
      width="min(720px, 92vw)"
      class="app-dialog custom-food-dialog"
      destroy-on-close
    >
      <div class="custom-food-layout">
        <div class="custom-food-main dialog-panel">
          <el-form label-position="top" class="stack-form">
            <div class="dialog-section">
              <div class="dialog-section-head">
                <strong>基本資訊</strong>
                <span>名稱、分類與描述</span>
              </div>

              <div class="form-grid form-grid-2">
                <el-form-item label="名稱">
                  <el-input v-model="customFoodDialog.name" placeholder="例如：自製雞胸沙拉" />
                </el-form-item>

                <el-form-item label="分類">
                  <el-input v-model="customFoodDialog.category" placeholder="例如：自製料理" />
                </el-form-item>

                <el-form-item label="俗名 / 別名">
                  <el-input v-model="customFoodDialog.alias" placeholder="可不填" />
                </el-form-item>

                <el-form-item label="參考重量 (g)">
                  <el-input-number v-model="customFoodDialog.referenceGrams" :min="1" :step="10" controls-position="right" />
                </el-form-item>
              </div>

              <el-form-item label="描述">
                <el-input
                  v-model="customFoodDialog.description"
                  type="textarea"
                  :rows="2"
                  placeholder="例如：一份含生菜、雞胸與油醋醬"
                />
              </el-form-item>
            </div>

            <div class="dialog-section">
              <div class="dialog-section-head">
                <strong>營養數值</strong>
                <span>輸入參考重量對應的營養素</span>
              </div>

              <div class="form-grid form-grid-4">
                <el-form-item label="蛋白質 (g)">
                  <el-input-number v-model="customFoodDialog.protein" :min="0" :step="0.5" controls-position="right" />
                </el-form-item>

                <el-form-item label="碳水 (g)">
                  <el-input-number v-model="customFoodDialog.carb" :min="0" :step="0.5" controls-position="right" />
                </el-form-item>

                <el-form-item label="脂肪 (g)">
                  <el-input-number v-model="customFoodDialog.fat" :min="0" :step="0.5" controls-position="right" />
                </el-form-item>

                <el-form-item label="熱量 (kcal，可留空)">
                  <el-input-number v-model="customFoodDialog.calories" :min="0" :step="1" controls-position="right" />
                </el-form-item>
              </div>
            </div>
          </el-form>
        </div>

        <aside class="custom-food-side">
          <div class="custom-food-preview">
            <div class="dialog-section-head">
              <strong>儲存預覽</strong>
              <span>送出前確認</span>
            </div>

            <div class="preview-metric">
              <span>參考重量熱量</span>
              <strong>{{ formatNumber(customFoodCaloriesPreview, 0) }} kcal</strong>
            </div>

            <div class="preview-note">
              <span>正規化後</span>
              <strong>將保存為每 100g 營養值</strong>
            </div>
          </div>
        </aside>
      </div>

      <template #footer>
        <el-button type="primary" @click="submitCustomFoodDialog">
          {{ customFoodDialog.mode === 'edit' ? '儲存變更' : '建立自訂食物' }}
        </el-button>
        <el-button @click="customFoodDialog.visible = false">取消</el-button>
      </template>
    </el-dialog>
  </main>
</template>

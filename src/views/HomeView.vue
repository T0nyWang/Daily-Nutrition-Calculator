<script setup lang="ts">
import { computed, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import type { SummaryMethod } from 'element-plus'

import {
  ACTIVITY_LEVEL_OPTIONS,
  MEAL_DEFINITIONS,
  SEX_OPTIONS,
} from '../constants/nutrition'
import type { FoodReference, FoodSource, MealEntry, MealKey, MeasurementUnit } from '../types/nutrition'
import { useNutritionStore } from '../stores'
import {
  calculateCaloriesFromMacros,
  calculateNutritionFromFood,
  formatNumber,
  getEntryMeasurementUnit,
  getFoodMeasurementUnit,
  normalizeFoodSearch,
} from '../utils/nutrition'

type EntryDialogMode = 'create' | 'edit'
type CustomFoodDialogMode = 'create' | 'edit'
type DeleteDialogType = 'entry' | 'custom-food'

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

const logoUrl = `${import.meta.env.BASE_URL}logo.svg`
const MEASUREMENT_UNIT_OPTIONS: Array<{ label: string; value: MeasurementUnit }> = [
  { label: '克 (g)', value: 'g' },
  { label: '毫升 (ml)', value: 'ml' },
]

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
  referenceUnit: 'g' as MeasurementUnit,
  protein: 0,
  carb: 0,
  fat: 0,
  calories: null as number | null,
})

const deleteDialog = reactive({
  visible: false,
  type: 'entry' as DeleteDialogType,
  entry: null as MealEntry | null,
  food: null as FoodReference | null,
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

const selectedEntryUnit = computed(() => {
  return selectedEntryFood.value ? getFoodMeasurementUnit(selectedEntryFood.value) : 'g'
})

const entryNutritionPreview = computed(() => {
  if (!selectedEntryFood.value || !entryDialog.grams || entryDialog.grams <= 0) {
    return null
  }

  return calculateNutritionFromFood(selectedEntryFood.value, entryDialog.grams)
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

type MealTableSummaryProps = Parameters<SummaryMethod<MealEntry>>[0]

function getMealTableSummary(_: MealTableSummaryProps, meal: MealKey) {
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
  return (summary) => getMealTableSummary(summary, meal)
}

const deleteDialogTitle = computed(() => {
  return deleteDialog.type === 'entry' ? '刪除餐點項目' : '刪除自訂食物'
})

const deleteDialogSubject = computed(() => {
  return deleteDialog.type === 'entry' ? deleteDialog.entry?.foodNameSnapshot ?? '' : deleteDialog.food?.name ?? ''
})

const deleteDialogDescription = computed(() => {
  if (deleteDialog.type === 'entry' && deleteDialog.entry) {
    const mealLabel =
      deleteDialog.entry.meal === 'breakfast'
        ? '早餐'
        : deleteDialog.entry.meal === 'lunch'
          ? '午餐'
          : deleteDialog.entry.meal === 'dinner'
            ? '晚餐'
            : deleteDialog.entry.meal === 'snack'
              ? '點心'
              : '宵夜'

    return `這筆資料會從「${mealLabel}」移除，刪除後將不會保留在當日紀錄中。`
  }

  return '刪除後，之後新增餐點時將無法再直接選取這個自訂食物。'
})

nutritionStore.loadDatabase()

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

function selectEntryFood(food: FoodReference) {
  entryDialog.selectedFoodId = food.id
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
    ElMessage.warning(`請輸入有效的食用${selectedEntryUnit.value === 'ml' ? '毫升' : '克數'}`)
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

function removeEntry(entry: MealEntry) {
  deleteDialog.visible = true
  deleteDialog.type = 'entry'
  deleteDialog.entry = entry
  deleteDialog.food = null
}

function openCustomFoodDialog(food?: FoodReference) {
  customFoodDialog.visible = true

  if (food) {
    const referenceGrams = food.referenceGrams ?? 100
    const referenceUnit = food.referenceUnit ?? food.per100Unit ?? 'g'

    customFoodDialog.mode = 'edit'
    customFoodDialog.id = food.id
    customFoodDialog.name = food.name
    customFoodDialog.category = food.category ?? ''
    customFoodDialog.alias = food.alias ?? ''
    customFoodDialog.description = food.description ?? ''
    customFoodDialog.referenceGrams = referenceGrams
    customFoodDialog.referenceUnit = referenceUnit
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
  customFoodDialog.referenceUnit = 'g'
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
    ElMessage.warning(`請輸入有效的參考${customFoodDialog.referenceUnit === 'ml' ? '毫升' : '重量'}`)
    return
  }

  nutritionStore.saveCustomFood({
    id: customFoodDialog.mode === 'edit' ? customFoodDialog.id : undefined,
    name: customFoodDialog.name.trim(),
    category: customFoodDialog.category.trim() || undefined,
    alias: customFoodDialog.alias.trim() || undefined,
    description: customFoodDialog.description.trim() || undefined,
    referenceGrams: customFoodDialog.referenceGrams,
    referenceUnit: customFoodDialog.referenceUnit,
    protein: customFoodDialog.protein,
    carb: customFoodDialog.carb,
    fat: customFoodDialog.fat,
    calories: customFoodDialog.calories,
  })

  ElMessage.success(customFoodDialog.mode === 'edit' ? '已更新自訂食物' : '已建立自訂食物')
  customFoodDialog.visible = false
}

function removeCustomFood(food: FoodReference) {
  deleteDialog.visible = true
  deleteDialog.type = 'custom-food'
  deleteDialog.entry = null
  deleteDialog.food = food
}

function closeDeleteDialog() {
  deleteDialog.visible = false
  deleteDialog.entry = null
  deleteDialog.food = null
}

function confirmDeleteDialog() {
  if (deleteDialog.type === 'entry' && deleteDialog.entry) {
    nutritionStore.deleteMealEntry(deleteDialog.entry.meal, deleteDialog.entry.id)
    ElMessage.success('已刪除餐點項目')
    closeDeleteDialog()
    return
  }

  if (deleteDialog.type === 'custom-food' && deleteDialog.food) {
    nutritionStore.deleteCustomFood(deleteDialog.food.id)
    ElMessage.success('已刪除自訂食物')
    closeDeleteDialog()
  }
}
</script>

<template>
  <main class="nutrition-app">
    <section class="hero-panel">
      <div class="hero-copy">
        <div class="hero-brand">
          <img :src="logoUrl" alt="Daily Nutrition Calculator logo" class="hero-logo" />
          <div class="hero-brand-copy">
            <p class="hero-kicker">Daily Nutrition Calculator</p>
            <span class="hero-badge">BMR · TDEE · Macro Tracker</span>
          </div>
        </div>

        <h1>每日熱量與三大營養素追蹤</h1>
        <p class="hero-description">
          依照個人資料計算 BMR 與 TDEE，搭配食品資料庫與自訂食物，建立可長期保存的每日飲食紀錄。
        </p>
      </div>

      <div class="hero-stats">
        <article class="metric-card">
          <div class="metric-card-head">
            <span>選擇日期</span>
            <small>{{ selectedDate }}</small>
          </div>
          <strong>{{ dateLabel }}</strong>
        </article>

        <article class="metric-card">
          <div class="metric-card-head">
            <span>今日總熱量</span>
            <small>
              目標
              {{ effectiveCalorieTarget === null ? '請先完成基本資料' : `${formatNumber(effectiveCalorieTarget, 0)} kcal` }}
            </small>
          </div>
          <strong>{{ formatNumber(totals.calories, 0) }} kcal</strong>
        </article>

        <article class="metric-card">
          <div class="metric-card-head">
            <span>BMR / TDEE</span>
            <small>依 Mifflin-St Jeor 公式估算</small>
          </div>
          <strong>
            {{ bmr === null ? '--' : formatNumber(bmr, 0) }}
            /
            {{ tdee === null ? '--' : formatNumber(tdee, 0) }}
          </strong>
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

        <div class="table-shell">
          <el-table :data="summaryRows" class="summary-table" scrollbar-always-on>
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

        <div class="table-shell">
          <el-table :data="customFoods" empty-text="尚未建立自訂食物" class="custom-food-table" scrollbar-always-on>
            <el-table-column label="名稱" min-width="180">
              <template #default="{ row }">
                <div class="table-name-cell">
                  <strong>{{ row.name }}</strong>
                  <span>{{ `${row.category || '未分類'} · 100 ${getFoodMeasurementUnit(row)}` }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="category" label="分類" min-width="110" />
            <el-table-column label="基準" width="100">
              <template #default="{ row }">100 {{ getFoodMeasurementUnit(row) }}</template>
            </el-table-column>
            <el-table-column label="熱量" width="130">
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
            <el-table-column label="操作" width="160">
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
        align-center
        :close-on-click-modal="false"
        :close-on-press-escape="false"
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

              <el-table
                :data="filteredEntryFoods"
                row-key="id"
                highlight-current-row
                :current-row-key="entryDialog.selectedFoodId"
                :empty-text="entryDialog.source === 'custom' ? '目前沒有符合條件的自訂食物' : '找不到符合條件的食品資料'"
                :max-height="320"
                class="search-results-table"
                @row-click="selectEntryFood"
              >
                <el-table-column label="名稱" min-width="200">
                  <template #default="{ row }">
                    <div class="table-name-cell">
                      <strong>{{ row.name }}</strong>
                      <span>{{ row.category || '未分類' }}</span>
                    </div>
                  </template>
                </el-table-column>
                <el-table-column label="說明" min-width="220">
                  <template #default="{ row }">
                    {{ row.alias || row.description || '—' }}
                  </template>
                </el-table-column>
              </el-table>
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
              <p class="selection-meta">
                {{ selectedEntryFood?.category || '請從左側列表選一個項目' }}
                {{ selectedEntryFood ? ` · 每 100${selectedEntryUnit}` : '' }}
              </p>
            </div>

            <template v-if="selectedEntryFood">
              <el-descriptions :column="1" border class="preview-descriptions selection-descriptions">
                <el-descriptions-item label="熱量">
                  {{ formatNumber(selectedEntryFood.per100g.calories, 0) }} kcal
                </el-descriptions-item>
                <el-descriptions-item label="蛋白質">
                  {{ formatNumber(selectedEntryFood.per100g.protein) }} g
                </el-descriptions-item>
                <el-descriptions-item label="碳水">
                  {{ formatNumber(selectedEntryFood.per100g.carb) }} g
                </el-descriptions-item>
                <el-descriptions-item label="脂肪">
                  {{ formatNumber(selectedEntryFood.per100g.fat) }} g
                </el-descriptions-item>
              </el-descriptions>
            </template>

            <el-form label-position="top" class="dialog-form">
              <el-form-item :label="`食用份量 (${selectedEntryUnit})`">
                <el-input-number v-model="entryDialog.grams" :min="1" :step="5" controls-position="right" />
              </el-form-item>
            </el-form>

            <template v-if="entryNutritionPreview">
              <div class="dialog-section">
                <div class="dialog-section-head">
                  <strong>本次加入預覽</strong>
                  <span>{{ `${formatNumber(entryDialog.grams, 0)} ${selectedEntryUnit}` }}</span>
                </div>

                <el-descriptions :column="1" border class="preview-descriptions">
                  <el-descriptions-item label="熱量">
                    {{ formatNumber(entryNutritionPreview.calories, 0) }} kcal
                  </el-descriptions-item>
                  <el-descriptions-item label="蛋白質">
                    {{ formatNumber(entryNutritionPreview.protein) }} g
                  </el-descriptions-item>
                  <el-descriptions-item label="碳水">
                    {{ formatNumber(entryNutritionPreview.carb) }} g
                  </el-descriptions-item>
                  <el-descriptions-item label="脂肪">
                    {{ formatNumber(entryNutritionPreview.fat) }} g
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </template>
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
        width="min(860px, 92vw)"
        class="app-dialog custom-food-dialog"
        align-center
        :close-on-click-modal="false"
        :close-on-press-escape="false"
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

                <el-form-item :label="`參考基準 (${customFoodDialog.referenceUnit})`">
                  <el-input-number v-model="customFoodDialog.referenceGrams" :min="1" :step="10" controls-position="right" />
                </el-form-item>
              </div>

              <el-form-item label="基準單位">
                <el-segmented v-model="customFoodDialog.referenceUnit" :options="MEASUREMENT_UNIT_OPTIONS" block />
              </el-form-item>

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
                <span>輸入參考基準對應的營養素</span>
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

            <el-descriptions :column="1" border class="preview-descriptions">
              <el-descriptions-item label="參考基準熱量">
                {{ formatNumber(customFoodCaloriesPreview, 0) }} kcal
              </el-descriptions-item>
              <el-descriptions-item label="儲存格式">
                {{ `每 100${customFoodDialog.referenceUnit} 營養值` }}
              </el-descriptions-item>
            </el-descriptions>

            <el-alert
              :title="`系統會依照你輸入的參考基準，正規化為每 100${customFoodDialog.referenceUnit} 的營養資料。`"
              type="info"
              :closable="false"
              show-icon
            />
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

    <el-dialog
      v-model="deleteDialog.visible"
      :title="deleteDialogTitle"
      width="min(460px, 92vw)"
      class="app-dialog delete-dialog"
      align-center
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      destroy-on-close
    >
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>
          {{ deleteDialogDescription }}
        </template>
      </el-alert>

      <div class="dialog-section">
        <div class="dialog-section-head">
          <strong>確認刪除</strong>
          <span>{{ deleteDialog.type === 'entry' ? '此操作不會自動還原' : '刪除後需重新建立' }}</span>
        </div>

        <el-descriptions :column="1" border class="preview-descriptions">
          <el-descriptions-item label="項目名稱">
            {{ deleteDialogSubject || '未選取項目' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <el-button type="danger" @click="confirmDeleteDialog">確認刪除</el-button>
        <el-button type="info" plain @click="closeDeleteDialog">先保留</el-button>
      </template>
    </el-dialog>
  </main>
</template>

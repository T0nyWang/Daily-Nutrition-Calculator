<script setup lang="ts">
import { computed, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'

import { MEAL_DEFINITIONS } from '../../constants/nutrition'
import { useNutritionStore } from '../../stores'
import type { FoodReference, FoodSource, MealEntry, MealKey } from '../../types/nutrition'
import {
  calculateNutritionFromFood,
  formatNumber,
  getFoodMeasurementUnit,
  normalizeFoodSearch,
} from '../../utils/nutrition'

type EntryDialogMode = 'create' | 'edit'

const nutritionStore = useNutritionStore()
const { customFoods, databaseFoods } = storeToRefs(nutritionStore)

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

function openCreate(meal: MealKey, source: FoodSource) {
  entryDialog.visible = true
  entryDialog.mode = 'create'
  entryDialog.meal = meal
  entryDialog.source = source
  entryDialog.query = ''
  entryDialog.selectedFoodId = ''
  entryDialog.grams = 100
  entryDialog.editingEntryId = ''
}

function openEdit(entry: MealEntry) {
  entryDialog.visible = true
  entryDialog.mode = 'edit'
  entryDialog.meal = entry.meal
  entryDialog.source = entry.source
  entryDialog.query = entry.foodNameSnapshot
  entryDialog.selectedFoodId = entry.foodId
  entryDialog.grams = entry.grams
  entryDialog.editingEntryId = entry.id
}

function selectEntryFood(food: FoodReference) {
  entryDialog.selectedFoodId = food.id
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

defineExpose({
  openCreate,
  openEdit,
})
</script>

<template>
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
</template>

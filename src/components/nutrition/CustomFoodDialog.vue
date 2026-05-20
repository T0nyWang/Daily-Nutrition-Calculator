<script setup lang="ts">
import { computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'

import { useNutritionStore } from '../../stores'
import type { FoodReference, MeasurementUnit } from '../../types/nutrition'
import { calculateCaloriesFromMacros, formatNumber } from '../../utils/nutrition'

type CustomFoodDialogMode = 'create' | 'edit'

const nutritionStore = useNutritionStore()

const MEASUREMENT_UNIT_OPTIONS: Array<{ label: string; value: MeasurementUnit }> = [
  { label: '克 (g)', value: 'g' },
  { label: '毫升 (ml)', value: 'ml' },
]

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

function open(food?: FoodReference) {
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
    category: customFoodDialog.category.trim() || null,
    alias: customFoodDialog.alias.trim() || null,
    description: customFoodDialog.description.trim() || null,
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

defineExpose({
  open,
})
</script>

<template>
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
</template>

<style scoped>
.custom-food-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
  align-items: start;
}

.custom-food-main,
.custom-food-side {
  min-width: 0;
}

.custom-food-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 0;
  padding: 18px;
  border-radius: 20px;
  background: rgba(248, 250, 252, 0.72);
  border: 1px solid rgba(31, 41, 55, 0.06);
  box-shadow: var(--shadow-md);
}

.dialog-section-head {
  align-items: flex-start;
}

.dialog-section-head span {
  text-align: left;
}

.form-grid-4 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.custom-food-preview :deep(.el-descriptions) {
  margin-top: 0;
}

.custom-food-preview :deep(.el-descriptions__label) {
  width: 120px;
}

.custom-food-preview :deep(.el-alert) {
  margin-top: 0;
}

:deep(.custom-food-dialog .stack-form) {
  margin-top: 8px;
}

:deep(.custom-food-dialog .el-form-item) {
  margin-bottom: 14px;
}

:deep(.custom-food-dialog .form-grid) {
  gap: 10px 14px;
}

:deep(.custom-food-dialog .el-dialog__body) {
  padding-bottom: 8px;
}

:deep(.custom-food-dialog .el-textarea__inner) {
  min-height: 72px !important;
}

@media (max-width: 1120px) {
  .custom-food-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .form-grid-4 {
    grid-template-columns: 1fr;
  }

  .custom-food-preview {
    padding: 10px 12px;
    border-radius: 16px;
  }

  :deep(.custom-food-dialog .el-form-item) {
    margin-bottom: 12px;
  }
}
</style>

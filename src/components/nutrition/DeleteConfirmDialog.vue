<script setup lang="ts">
import { computed, reactive } from 'vue'
import { ElMessage } from 'element-plus'

import { useNutritionStore } from '../../stores'
import type { FoodReference, MealEntry } from '../../types/nutrition'

type DeleteDialogType = 'entry' | 'custom-food'

const nutritionStore = useNutritionStore()

const deleteDialog = reactive({
  visible: false,
  type: 'entry' as DeleteDialogType,
  entry: null as MealEntry | null,
  food: null as FoodReference | null,
})

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

function openEntry(entry: MealEntry) {
  deleteDialog.visible = true
  deleteDialog.type = 'entry'
  deleteDialog.entry = entry
  deleteDialog.food = null
}

function openCustomFood(food: FoodReference) {
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

defineExpose({
  openEntry,
  openCustomFood,
})
</script>

<template>
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
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useNutritionStore } from '../../stores'
import type { FoodReference } from '../../types/nutrition'
import { formatNumber, getFoodMeasurementUnit, normalizeFoodSearch } from '../../utils/nutrition'

const emit = defineEmits<{
  'create-custom-food': []
  'edit-custom-food': [food: FoodReference]
  'delete-custom-food': [food: FoodReference]
}>()

const nutritionStore = useNutritionStore()
const { customFoods } = storeToRefs(nutritionStore)
const customFoodQuery = ref('')

const filteredCustomFoods = computed(() => {
  const query = normalizeFoodSearch(customFoodQuery.value)

  if (!query) {
    return customFoods.value
  }

  return customFoods.value.filter((food) => {
    const searchText =
      food.searchText ??
      normalizeFoodSearch([food.name, food.alias, food.description, food.category].filter(Boolean).join(' '))

    return searchText.includes(query)
  })
})
</script>

<template>
  <article class="app-panel">
    <div class="panel-heading">
      <div>
        <p class="panel-kicker">Custom Foods</p>
        <h2>自訂食物庫</h2>
      </div>

      <el-button type="primary" @click="emit('create-custom-food')">新增自訂食物</el-button>
    </div>

    <el-alert
      title="自訂食物會同步到目前登入帳號，之後任何日期都可以重複使用。"
      type="info"
      :closable="false"
      show-icon
      class="section-alert"
    />

    <el-input
      v-model="customFoodQuery"
      placeholder="搜尋自訂食物名稱、分類或描述"
      clearable
      class="custom-food-search"
    />

    <div class="table-shell">
      <el-table
        :data="filteredCustomFoods"
        :empty-text="customFoodQuery ? '找不到符合條件的自訂食物' : '尚未建立自訂食物'"
        class="custom-food-table"
        scrollbar-always-on
        :height="420"
      >
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
              <el-button type="primary" plain size="small" @click="emit('edit-custom-food', row)">編輯</el-button>
              <el-button type="danger" plain size="small" @click="emit('delete-custom-food', row)">刪除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </article>
</template>

<style scoped>
.custom-food-search {
  width: min(100%, 360px);
  margin-top: 16px;
}

.custom-food-table {
  margin-top: 16px;
}

@media (max-width: 720px) {
  .custom-food-search {
    width: 100%;
  }
}
</style>

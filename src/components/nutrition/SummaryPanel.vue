<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useNutritionStore } from '../../stores'
import { formatNumber } from '../../utils/nutrition'

const nutritionStore = useNutritionStore()
const { summaryRows, totals } = storeToRefs(nutritionStore)
</script>

<template>
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
</template>

<style scoped>
.summary-topline {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.summary-chip {
  min-width: 140px;
  padding: 16px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(31, 41, 55, 0.06);
  box-shadow: var(--shadow-md);
}

.summary-chip span {
  display: block;
  color: var(--ink-subtle);
  font-size: 0.79rem;
}

.summary-chip strong {
  display: block;
  margin-top: 4px;
  font-size: 1.35rem;
  line-height: 1.15;
}

.summary-table {
  margin-top: 16px;
}

@media (max-width: 1120px) {
  .summary-topline {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

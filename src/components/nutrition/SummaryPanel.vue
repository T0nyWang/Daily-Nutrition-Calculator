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

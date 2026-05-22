<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useNutritionStore } from '../../stores'
import type { SummaryRow } from '../../types/nutrition'
import { formatNumber } from '../../utils/nutrition'

const nutritionStore = useNutritionStore()
const { summaryRows } = storeToRefs(nutritionStore)

const progressRows = computed(() =>
  summaryRows.value.map((row) => {
    const percentage = row.target === null || row.target <= 0 ? null : Math.round((row.actual / row.target) * 100)

    return {
      ...row,
      percentage,
      barPercentage: percentage === null ? 0 : Math.min(100, Math.max(0, percentage)),
    }
  }),
)

function getProgressStatus(row: SummaryRow & { percentage: number | null }): 'success' | 'warning' | undefined {
  if (row.percentage === null || row.percentage < 90) {
    return undefined
  }

  if (row.percentage <= 110 || row.key === 'protein') {
    return 'success'
  }

  return 'warning'
}

function formatProgressValue(row: SummaryRow & { percentage: number | null }) {
  if (row.target === null || row.percentage === null) {
    return '--'
  }

  return `${formatNumber(row.actual, row.unit === 'kcal' ? 0 : 1)} / ${formatNumber(row.target, row.unit === 'kcal' ? 0 : 1)} ${row.unit} (${formatNumber(row.percentage, 0)}%)`
}

function formatSummaryLabel(row: SummaryRow) {
  return row.key === 'calories' ? '實際攝取' : row.label
}

function formatActualValue(row: SummaryRow) {
  return `${formatNumber(row.actual, row.unit === 'kcal' ? 0 : 1)} ${row.unit}`
}
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
      <div v-for="row in progressRows" :key="row.key" class="summary-chip">
        <div class="summary-chip-copy">
          <span>{{ formatSummaryLabel(row) }}</span>
          <strong>{{ formatActualValue(row) }}</strong>
          <small>{{ formatProgressValue(row) }}</small>
        </div>
        <el-progress
          type="circle"
          :percentage="row.barPercentage"
          :status="getProgressStatus(row)"
          :width="72"
          :stroke-width="8"
        >
          <template #default>
            {{ row.percentage === null ? '--' : `${formatNumber(row.percentage, 0)}%` }}
          </template>
        </el-progress>
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
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.summary-chip {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(31, 41, 55, 0.06);
  box-shadow: var(--shadow-md);
}

.summary-chip-copy {
  min-width: 0;
}

.summary-chip-copy span {
  display: block;
  color: var(--ink-subtle);
  font-size: 0.79rem;
}

.summary-chip-copy strong {
  display: block;
  margin-top: 4px;
  font-size: 1.35rem;
  line-height: 1.15;
}

.summary-chip-copy small {
  display: block;
  margin-top: 8px;
  color: var(--ink-subtle);
  font-size: 0.72rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.summary-chip :deep(.el-progress) {
  flex: 0 0 auto;
}

.summary-chip :deep(.el-progress__text) {
  min-width: 0;
  font-weight: 700;
  color: var(--ink);
}

.summary-table {
  margin-top: 18px;
}

@media (max-width: 1120px) {
  .summary-topline {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .summary-topline {
    grid-template-columns: 1fr;
  }
}
</style>

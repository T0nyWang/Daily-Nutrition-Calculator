<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useNutritionStore } from '../../stores'
import { formatNumber } from '../../utils/nutrition'

const nutritionStore = useNutritionStore()
const { bmr, effectiveCalorieTarget, selectedDate, tdee, totals } = storeToRefs(nutritionStore)

const logoUrl = `${import.meta.env.BASE_URL}logo.svg`

const dateLabel = computed(() => {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
})
</script>

<template>
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
</template>

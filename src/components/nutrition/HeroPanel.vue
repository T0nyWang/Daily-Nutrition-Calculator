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

<style scoped>
.hero-panel {
  backdrop-filter: blur(18px);
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  box-shadow: var(--shadow-lg);
  min-width: 0;
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
  padding: 24px;
  border-radius: 30px;
}

.hero-panel > *,
.hero-copy,
.hero-stats {
  min-width: 0;
}

.hero-copy h1 {
  margin: 0;
  font-family: "Georgia", "Times New Roman", serif;
  letter-spacing: -0.02em;
  font-size: clamp(2.25rem, 4.5vw, 4rem);
  line-height: 1;
}

.hero-brand {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
}

.hero-logo {
  width: 76px;
  height: 76px;
  flex: 0 0 auto;
  filter: drop-shadow(0 16px 28px rgba(15, 118, 110, 0.18));
}

.hero-brand-copy {
  min-width: 0;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 7px 11px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
  font-size: 0.77rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.hero-kicker {
  margin: 0 0 6px;
  color: var(--accent);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-description {
  margin: 12px 0 0;
  color: var(--ink-subtle);
  font-size: 0.94rem;
}

.hero-stats {
  display: grid;
  gap: 12px;
}

.metric-card {
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(31, 41, 55, 0.06);
  box-shadow: var(--shadow-md);
  padding: 15px 18px;
}

.metric-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.metric-card span {
  display: block;
  color: var(--ink-subtle);
  font-size: 0.79rem;
}

.metric-card strong {
  display: block;
  margin-top: 4px;
  font-size: 1.35rem;
  line-height: 1.15;
}

.metric-card small {
  display: block;
  margin-top: 0;
  color: var(--ink-subtle);
  font-size: 0.8rem;
  text-align: right;
}

@media (max-width: 1120px) {
  .hero-panel {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .hero-panel {
    padding: 18px;
    border-radius: 22px;
  }

  .hero-brand {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }

  .metric-card-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 2px;
  }

  .metric-card small {
    text-align: left;
  }

  .hero-logo {
    width: 72px;
    height: 72px;
  }
}
</style>

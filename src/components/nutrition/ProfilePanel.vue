<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { ACTIVITY_LEVEL_OPTIONS, SEX_OPTIONS } from '../../constants/nutrition'
import { useNutritionStore } from '../../stores'
import { formatNumber } from '../../utils/nutrition'

const nutritionStore = useNutritionStore()
const { bmr, profile, tdee } = storeToRefs(nutritionStore)
</script>

<template>
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
</template>

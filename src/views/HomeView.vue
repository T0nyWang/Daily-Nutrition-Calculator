<script setup lang="ts">
import { ref } from 'vue'

import CustomFoodDialog from '../components/nutrition/CustomFoodDialog.vue'
import CustomFoodsPanel from '../components/nutrition/CustomFoodsPanel.vue'
import DailyTargetsPanel from '../components/nutrition/DailyTargetsPanel.vue'
import DeleteConfirmDialog from '../components/nutrition/DeleteConfirmDialog.vue'
import EntryDialog from '../components/nutrition/EntryDialog.vue'
import HeroPanel from '../components/nutrition/HeroPanel.vue'
import MealsPanel from '../components/nutrition/MealsPanel.vue'
import ProfilePanel from '../components/nutrition/ProfilePanel.vue'
import SummaryPanel from '../components/nutrition/SummaryPanel.vue'
import { useNutritionStore } from '../stores'
import type { FoodReference, FoodSource, MealEntry, MealKey } from '../types/nutrition'

interface EntryDialogExpose {
  openCreate(meal: MealKey, source: FoodSource): void
  openEdit(entry: MealEntry): void
}

interface CustomFoodDialogExpose {
  open(food?: FoodReference): void
}

interface DeleteConfirmDialogExpose {
  openEntry(entry: MealEntry): void
  openCustomFood(food: FoodReference): void
}

const nutritionStore = useNutritionStore()
const entryDialogRef = ref<EntryDialogExpose>()
const customFoodDialogRef = ref<CustomFoodDialogExpose>()
const deleteConfirmDialogRef = ref<DeleteConfirmDialogExpose>()

nutritionStore.loadDatabase()

function handleCreateEntry(payload: { meal: MealKey; source: FoodSource }) {
  entryDialogRef.value?.openCreate(payload.meal, payload.source)
}

function handleEditEntry(entry: MealEntry) {
  entryDialogRef.value?.openEdit(entry)
}

function handleDeleteEntry(entry: MealEntry) {
  deleteConfirmDialogRef.value?.openEntry(entry)
}

function handleCreateCustomFood() {
  customFoodDialogRef.value?.open()
}

function handleEditCustomFood(food: FoodReference) {
  customFoodDialogRef.value?.open(food)
}

function handleDeleteCustomFood(food: FoodReference) {
  deleteConfirmDialogRef.value?.openCustomFood(food)
}
</script>

<template>
  <main class="nutrition-app">
    <HeroPanel />

    <section class="panel-grid top-grid">
      <ProfilePanel />
      <DailyTargetsPanel />
    </section>

    <MealsPanel
      @create-entry="handleCreateEntry"
      @edit-entry="handleEditEntry"
      @delete-entry="handleDeleteEntry"
    />

    <section class="panel-grid bottom-grid">
      <SummaryPanel />
      <CustomFoodsPanel
        @create-custom-food="handleCreateCustomFood"
        @edit-custom-food="handleEditCustomFood"
        @delete-custom-food="handleDeleteCustomFood"
      />
    </section>

    <EntryDialog ref="entryDialogRef" />
    <CustomFoodDialog ref="customFoodDialogRef" />
    <DeleteConfirmDialog ref="deleteConfirmDialogRef" />
  </main>
</template>

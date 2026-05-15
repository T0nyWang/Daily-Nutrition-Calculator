import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { DEFAULT_PROFILE, DEFAULT_TARGETS, MEAL_KEYS, STORAGE_KEYS } from '../constants/nutrition'
import type { CustomFoodInput, DailyLog, DailyTargets, FoodReference, MealKey, SummaryRow } from '../types/nutrition'
import { shiftDateKey, todayDateKey } from '../utils/date'
import {
  calculateBmr,
  calculateNutritionFromFood,
  calculateTdee,
  cloneTargets,
  createDailyLog,
  getMealTotals,
  getSummaryRows,
  normalizeCustomFood,
  sumNutritionValues,
} from '../utils/nutrition'
import { loadFromStorage, saveToStorage } from '../utils/storage'

interface SaveMealEntryPayload {
  entryId?: string
  meal: MealKey
  food: FoodReference
  grams: number
}

export const useNutritionStore = defineStore('nutrition', () => {
  const profile = ref(loadFromStorage(STORAGE_KEYS.profile, DEFAULT_PROFILE))
  const globalTargets = ref(loadFromStorage<DailyTargets>(STORAGE_KEYS.targets, DEFAULT_TARGETS))
  const dailyLogs = ref<Record<string, DailyLog>>(loadFromStorage(STORAGE_KEYS.dailyLogs, {}))
  const customFoods = ref<FoodReference[]>(loadFromStorage(STORAGE_KEYS.customFoods, []))
  const databaseFoods = ref<FoodReference[]>([])
  const databaseLoading = ref(false)
  const databaseError = ref('')
  const selectedDate = ref(todayDateKey())

  function ensureDailyLog(dateKey: string) {
    const existing = dailyLogs.value[dateKey]

    if (existing) {
      return existing
    }

    const nextLog = createDailyLog(dateKey, globalTargets.value)
    dailyLogs.value = {
      ...dailyLogs.value,
      [dateKey]: nextLog,
    }

    return nextLog
  }

  const currentLog = computed(() => ensureDailyLog(selectedDate.value))
  const currentTargets = computed(() => currentLog.value.targets)
  const entriesByMeal = computed(() => currentLog.value.entriesByMeal)
  const allEntries = computed(() => MEAL_KEYS.flatMap((mealKey) => entriesByMeal.value[mealKey]))
  const totals = computed(() => sumNutritionValues(allEntries.value.map((entry) => entry.nutrition)))
  const mealTotals = computed(() => getMealTotals(entriesByMeal.value))
  const bmr = computed(() => calculateBmr(profile.value))
  const tdee = computed(() => calculateTdee(profile.value))
  const effectiveCalorieTarget = computed(() => {
    if (currentTargets.value.calorieMode === 'custom') {
      return currentTargets.value.customCalories ?? 0
    }

    return tdee.value
  })
  const summaryRows = computed<SummaryRow[]>(() =>
    getSummaryRows(currentTargets.value, totals.value, effectiveCalorieTarget.value),
  )

  async function loadDatabase() {
    if (databaseFoods.value.length || databaseLoading.value) {
      return
    }

    databaseLoading.value = true
    databaseError.value = ''

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/nutrition-database.json`)

      if (!response.ok) {
        throw new Error(`資料讀取失敗 (${response.status})`)
      }

      databaseFoods.value = (await response.json()) as FoodReference[]
    } catch (error) {
      const message = error instanceof Error ? error.message : '無法載入食品資料庫'
      databaseError.value = `食品資料庫載入失敗：${message}`
    } finally {
      databaseLoading.value = false
    }
  }

  function saveMealEntry({ entryId, meal, food, grams }: SaveMealEntryPayload) {
    const log = ensureDailyLog(selectedDate.value)
    const mealEntries = [...log.entriesByMeal[meal]]
    const nextEntry = {
      id: entryId ?? crypto.randomUUID(),
      meal,
      foodId: food.id,
      foodNameSnapshot: food.name,
      grams,
      unit: food.per100Unit ?? food.referenceUnit ?? 'g',
      nutrition: calculateNutritionFromFood(food, grams),
      source: food.source,
    }
    const existingIndex = mealEntries.findIndex((entry) => entry.id === nextEntry.id)

    if (existingIndex >= 0) {
      mealEntries.splice(existingIndex, 1, nextEntry)
    } else {
      mealEntries.unshift(nextEntry)
    }

    log.entriesByMeal[meal] = mealEntries
  }

  function deleteMealEntry(meal: MealKey, entryId: string) {
    const log = ensureDailyLog(selectedDate.value)
    log.entriesByMeal[meal] = log.entriesByMeal[meal].filter((entry) => entry.id !== entryId)
  }

  function saveCustomFood(input: CustomFoodInput) {
    const nextFood = normalizeCustomFood(input)
    const existingIndex = customFoods.value.findIndex((item) => item.id === nextFood.id)

    if (existingIndex >= 0) {
      const nextFoods = [...customFoods.value]
      nextFoods.splice(existingIndex, 1, nextFood)
      customFoods.value = nextFoods
      return
    }

    customFoods.value = [nextFood, ...customFoods.value]
  }

  function deleteCustomFood(foodId: string) {
    customFoods.value = customFoods.value.filter((food) => food.id !== foodId)
  }

  function goToToday() {
    selectedDate.value = todayDateKey()
  }

  function shiftSelectedDateBy(days: number) {
    selectedDate.value = shiftDateKey(selectedDate.value, days)
  }

  watch(
    profile,
    (value) => {
      saveToStorage(STORAGE_KEYS.profile, value)
    },
    { deep: true },
  )

  watch(
    globalTargets,
    (value) => {
      saveToStorage(STORAGE_KEYS.targets, value)
    },
    { deep: true },
  )

  watch(
    dailyLogs,
    (value) => {
      saveToStorage(STORAGE_KEYS.dailyLogs, value)
    },
    { deep: true },
  )

  watch(
    customFoods,
    (value) => {
      saveToStorage(STORAGE_KEYS.customFoods, value)
    },
    { deep: true },
  )

  watch(
    selectedDate,
    (value) => {
      ensureDailyLog(value)
    },
    { immediate: true },
  )

  watch(
    currentTargets,
    (value) => {
      globalTargets.value = cloneTargets(value)
    },
    { deep: true },
  )

  return {
    profile,
    selectedDate,
    databaseFoods,
    databaseLoading,
    databaseError,
    customFoods,
    currentTargets,
    entriesByMeal,
    mealTotals,
    totals,
    bmr,
    tdee,
    effectiveCalorieTarget,
    summaryRows,
    loadDatabase,
    saveMealEntry,
    deleteMealEntry,
    saveCustomFood,
    deleteCustomFood,
    goToToday,
    shiftSelectedDate: shiftSelectedDateBy,
  }
})

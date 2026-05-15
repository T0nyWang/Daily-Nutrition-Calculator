import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { DEFAULT_PROFILE, DEFAULT_TARGETS, MEAL_KEYS, STORAGE_KEYS } from '../constants/nutrition'
import type {
  ActivityLevel,
  CustomFoodInput,
  DailyLog,
  DailyTargets,
  FoodReference,
  FoodSource,
  MealEntry,
  MealKey,
  MeasurementUnit,
  NutritionValues,
  Sex,
  SummaryRow,
  UserProfile,
} from '../types/nutrition'
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

const SEX_VALUES: Sex[] = ['male', 'female']
const ACTIVITY_LEVEL_VALUES: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'veryActive']
const CALORIE_MODE_VALUES: DailyTargets['calorieMode'][] = ['tdee', 'custom']
const FOOD_SOURCE_VALUES: FoodSource[] = ['database', 'custom']
const MEASUREMENT_UNIT_VALUES: MeasurementUnit[] = ['g', 'ml']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finiteNumberOr(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function optionOr<T extends string>(value: unknown, options: T[], fallback: T) {
  return typeof value === 'string' && options.includes(value as T) ? (value as T) : fallback
}

function normalizeProfile(value: unknown): UserProfile {
  const record = isRecord(value) ? value : {}

  return {
    sex: optionOr(record.sex, SEX_VALUES, DEFAULT_PROFILE.sex),
    age: finiteNumberOr(record.age, DEFAULT_PROFILE.age),
    heightCm: finiteNumberOr(record.heightCm, DEFAULT_PROFILE.heightCm),
    weightKg: finiteNumberOr(record.weightKg, DEFAULT_PROFILE.weightKg),
    activityLevel: optionOr(record.activityLevel, ACTIVITY_LEVEL_VALUES, DEFAULT_PROFILE.activityLevel),
  }
}

function normalizeTargets(value: unknown): DailyTargets {
  const record = isRecord(value) ? value : {}

  return {
    calorieMode: optionOr(record.calorieMode, CALORIE_MODE_VALUES, DEFAULT_TARGETS.calorieMode),
    customCalories: finiteNumberOr(record.customCalories, DEFAULT_TARGETS.customCalories ?? 0),
    proteinGrams: finiteNumberOr(record.proteinGrams, DEFAULT_TARGETS.proteinGrams),
    carbGrams: finiteNumberOr(record.carbGrams, DEFAULT_TARGETS.carbGrams),
    fatGrams: finiteNumberOr(record.fatGrams, DEFAULT_TARGETS.fatGrams),
  }
}

function normalizeNutritionValues(value: unknown): NutritionValues {
  const record = isRecord(value) ? value : {}

  return {
    calories: finiteNumberOr(record.calories, 0),
    protein: finiteNumberOr(record.protein, 0),
    carb: finiteNumberOr(record.carb, 0),
    fat: finiteNumberOr(record.fat, 0),
  }
}

function normalizeMealEntry(value: unknown, meal: MealKey): MealEntry | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.foodId !== 'string') {
    return null
  }

  const foodNameSnapshot = typeof value.foodNameSnapshot === 'string' ? value.foodNameSnapshot : ''

  if (!foodNameSnapshot) {
    return null
  }

  return {
    id: value.id,
    meal,
    foodId: value.foodId,
    foodNameSnapshot,
    grams: finiteNumberOr(value.grams, 0),
    unit:
      typeof value.unit === 'string' && MEASUREMENT_UNIT_VALUES.includes(value.unit as MeasurementUnit)
        ? (value.unit as MeasurementUnit)
        : undefined,
    nutrition: normalizeNutritionValues(value.nutrition),
    source: optionOr(value.source, FOOD_SOURCE_VALUES, 'database'),
  }
}

function normalizeEntriesByMeal(value: unknown): Record<MealKey, MealEntry[]> {
  const record = isRecord(value) ? value : {}

  return MEAL_KEYS.reduce(
    (accumulator, mealKey) => {
      const entries = Array.isArray(record[mealKey]) ? record[mealKey] : []
      accumulator[mealKey] = entries
        .map((entry) => normalizeMealEntry(entry, mealKey))
        .filter((entry): entry is MealEntry => entry !== null)

      return accumulator
    },
    {} as Record<MealKey, MealEntry[]>,
  )
}

function normalizeDailyLog(value: unknown, dateKey: string): DailyLog {
  const record = isRecord(value) ? value : {}

  return {
    date: typeof record.date === 'string' && record.date ? record.date : dateKey,
    targets: normalizeTargets(record.targets),
    entriesByMeal: normalizeEntriesByMeal(record.entriesByMeal),
  }
}

function normalizeDailyLogs(value: unknown): Record<string, DailyLog> {
  if (!isRecord(value)) {
    return {}
  }

  return Object.entries(value).reduce<Record<string, DailyLog>>((accumulator, [dateKey, log]) => {
    if (dateKey) {
      accumulator[dateKey] = normalizeDailyLog(log, dateKey)
    }

    return accumulator
  }, {})
}

function normalizeFoodReference(value: unknown): FoodReference | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || !isRecord(value.per100g)) {
    return null
  }

  const referenceUnit = optionOr(value.referenceUnit, MEASUREMENT_UNIT_VALUES, 'g')
  const per100Unit = optionOr(value.per100Unit, MEASUREMENT_UNIT_VALUES, referenceUnit)

  return {
    id: value.id,
    source: optionOr(value.source, FOOD_SOURCE_VALUES, 'custom'),
    name: value.name,
    category: optionalString(value.category),
    alias: optionalString(value.alias),
    description: optionalString(value.description),
    referenceGrams: finiteNumberOr(value.referenceGrams, 100),
    referenceUnit,
    per100g: normalizeNutritionValues(value.per100g),
    per100Unit,
    searchText:
      typeof value.searchText === 'string' && value.searchText
        ? value.searchText
        : [value.name, value.alias, value.description, value.category].filter(Boolean).join(' ').toLowerCase(),
  }
}

function normalizeCustomFoods(value: unknown): FoodReference[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((food) => normalizeFoodReference(food))
    .filter((food): food is FoodReference => food !== null)
}

export const useNutritionStore = defineStore('nutrition', () => {
  const profile = ref(normalizeProfile(loadFromStorage<unknown>(STORAGE_KEYS.profile, DEFAULT_PROFILE)))
  const globalTargets = ref(normalizeTargets(loadFromStorage<unknown>(STORAGE_KEYS.targets, DEFAULT_TARGETS)))
  const dailyLogs = ref(normalizeDailyLogs(loadFromStorage<unknown>(STORAGE_KEYS.dailyLogs, {})))
  const customFoods = ref(normalizeCustomFoods(loadFromStorage<unknown>(STORAGE_KEYS.customFoods, [])))
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

  const currentLog = computed(() =>
    dailyLogs.value[selectedDate.value] ?? createDailyLog(selectedDate.value, globalTargets.value),
  )
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

import { computed, nextTick, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { DEFAULT_PROFILE, DEFAULT_TARGETS, MEAL_KEYS } from '../constants/nutrition'
import {
  deleteCustomFood as deleteRemoteCustomFood,
  loadCustomFoods,
  loadDailyLog,
  loadUserSettings,
  saveCustomFood as saveRemoteCustomFood,
  saveDailyLog,
  saveUserSettings,
} from '../services/nutritionRepository'
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
import { useAuthStore } from './auth'

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

function optionalStringOrNull(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function optionOr<T extends string>(value: unknown, options: T[], fallback: T) {
  return typeof value === 'string' && options.includes(value as T) ? (value as T) : fallback
}

function getFirebaseErrorDetail(error: unknown) {
  if (!isRecord(error)) {
    return ''
  }

  const code = typeof error.code === 'string' ? error.code : ''
  const message = typeof error.message === 'string' ? error.message : ''

  return [code, message].filter(Boolean).join('：')
}

function appendErrorDetail(message: string, error: unknown) {
  const detail = getFirebaseErrorDetail(error)

  return detail ? `${message}（${detail}）` : message
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
    category: optionalStringOrNull(value.category),
    alias: optionalStringOrNull(value.alias),
    description: optionalStringOrNull(value.description),
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
  const profile = ref(normalizeProfile(DEFAULT_PROFILE))
  const globalTargets = ref(normalizeTargets(DEFAULT_TARGETS))
  const dailyLogs = ref<Record<string, DailyLog>>({})
  const customFoods = ref<FoodReference[]>([])
  const databaseFoods = ref<FoodReference[]>([])
  const databaseLoading = ref(false)
  const databaseError = ref('')
  const userSettingsLoading = ref(false)
  const userSettingsError = ref('')
  const dailyLogLoading = ref(false)
  const dailyLogError = ref('')
  const customFoodsLoading = ref(false)
  const customFoodsError = ref('')
  const selectedDate = ref(todayDateKey())
  const userSettingsReady = ref(false)
  const dailyLogReadyDate = ref('')
  const customFoodsReady = ref(false)
  let userDataSyncInitialized = false
  let applyingRemoteUserSettings = false
  let applyingRemoteDailyLog = false
  let userSettingsSaveTimer: ReturnType<typeof setTimeout> | null = null
  let dailyLogSaveTimer: ReturnType<typeof setTimeout> | null = null

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

  function clearUserSettingsSaveTimer() {
    if (!userSettingsSaveTimer) {
      return
    }

    clearTimeout(userSettingsSaveTimer)
    userSettingsSaveTimer = null
  }

  function clearDailyLogSaveTimer() {
    if (!dailyLogSaveTimer) {
      return
    }

    clearTimeout(dailyLogSaveTimer)
    dailyLogSaveTimer = null
  }

  function scheduleSaveUserSettings() {
    const authStore = useAuthStore()
    const uid = authStore.currentUser?.uid

    if (!uid || !userSettingsReady.value || applyingRemoteUserSettings) {
      return
    }

    clearUserSettingsSaveTimer()
    userSettingsSaveTimer = setTimeout(async () => {
      try {
        await saveUserSettings(uid, {
          profile: profile.value,
          globalTargets: globalTargets.value,
        })
        userSettingsError.value = ''
      } catch {
        userSettingsError.value = '帳號資料同步失敗，請稍後再試'
      }
    }, 600)
  }

  function scheduleSaveCurrentDailyLog() {
    const authStore = useAuthStore()
    const uid = authStore.currentUser?.uid
    const dateKey = selectedDate.value

    if (!uid || dailyLogReadyDate.value !== dateKey || applyingRemoteDailyLog) {
      return
    }

    clearDailyLogSaveTimer()
    dailyLogSaveTimer = setTimeout(async () => {
      try {
        await saveDailyLog(uid, ensureDailyLog(dateKey))
        dailyLogError.value = ''
      } catch {
        dailyLogError.value = '每日紀錄同步失敗，請稍後再試'
      }
    }, 600)
  }

  async function loadRemoteUserSettings(uid: string) {
    clearUserSettingsSaveTimer()
    userSettingsLoading.value = true
    userSettingsError.value = ''
    userSettingsReady.value = false

    try {
      const settings = await loadUserSettings(uid)
      applyingRemoteUserSettings = true

      if (settings?.profile) {
        profile.value = normalizeProfile(settings.profile)
      }

      if (settings?.globalTargets) {
        const nextTargets = normalizeTargets(settings.globalTargets)
        globalTargets.value = nextTargets
        ensureDailyLog(selectedDate.value).targets = cloneTargets(nextTargets)
      }

      await nextTick()
      applyingRemoteUserSettings = false
      userSettingsReady.value = true

      if (!settings) {
        await saveUserSettings(uid, {
          profile: profile.value,
          globalTargets: globalTargets.value,
        })
      }
    } catch (error) {
      userSettingsError.value = appendErrorDetail('帳號資料讀取失敗，請確認 Firestore 規則或網路狀態', error)
    } finally {
      applyingRemoteUserSettings = false
      userSettingsLoading.value = false
    }
  }

  async function loadRemoteDailyLog(uid: string, dateKey: string) {
    clearDailyLogSaveTimer()
    dailyLogLoading.value = true
    dailyLogError.value = ''
    dailyLogReadyDate.value = ''

    try {
      const remoteLog = await loadDailyLog(uid, dateKey)
      const nextLog = remoteLog ? normalizeDailyLog(remoteLog, dateKey) : ensureDailyLog(dateKey)
      applyingRemoteDailyLog = true
      dailyLogs.value = {
        ...dailyLogs.value,
        [dateKey]: nextLog,
      }
      await nextTick()
      applyingRemoteDailyLog = false
      dailyLogReadyDate.value = dateKey

      if (!remoteLog) {
        await saveDailyLog(uid, nextLog)
      }
    } catch (error) {
      dailyLogError.value = appendErrorDetail('每日紀錄讀取失敗，請確認 Firestore 規則或網路狀態', error)
    } finally {
      applyingRemoteDailyLog = false
      dailyLogLoading.value = false
    }
  }

  async function loadRemoteCustomFoods(uid: string) {
    customFoodsLoading.value = true
    customFoodsError.value = ''
    customFoodsReady.value = false

    try {
      const remoteFoods = await loadCustomFoods(uid)

      if (remoteFoods.length) {
        customFoods.value = normalizeCustomFoods(remoteFoods)
      }

      await nextTick()
      customFoodsReady.value = true

      if (!remoteFoods.length && customFoods.value.length) {
        await Promise.all(customFoods.value.map((food) => saveRemoteCustomFood(uid, food)))
      }
    } catch (error) {
      customFoodsError.value = appendErrorDetail('自訂食物讀取失敗，請確認 Firestore 規則或網路狀態', error)
    } finally {
      customFoodsLoading.value = false
    }
  }

  async function loadRemoteUserData(uid: string) {
    await loadRemoteUserSettings(uid)
    await loadRemoteCustomFoods(uid)
    await loadRemoteDailyLog(uid, selectedDate.value)
  }

  function initializeUserDataSync() {
    if (userDataSyncInitialized) {
      return
    }

    userDataSyncInitialized = true
    const authStore = useAuthStore()

    watch(
      () => authStore.currentUser,
      (user) => {
        clearUserSettingsSaveTimer()
        clearDailyLogSaveTimer()

        if (!user) {
          userSettingsReady.value = false
          dailyLogReadyDate.value = ''
          customFoodsReady.value = false
          userSettingsError.value = ''
          dailyLogError.value = ''
          customFoodsError.value = ''
          return
        }

        void loadRemoteUserData(user.uid)
      },
      { immediate: true },
    )
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
      void saveRemoteCustomFoodForCurrentUser(nextFood)
      return
    }

    customFoods.value = [nextFood, ...customFoods.value]
    void saveRemoteCustomFoodForCurrentUser(nextFood)
  }

  function deleteCustomFood(foodId: string) {
    customFoods.value = customFoods.value.filter((food) => food.id !== foodId)
    void deleteRemoteCustomFoodForCurrentUser(foodId)
  }

  async function saveRemoteCustomFoodForCurrentUser(food: FoodReference) {
    const uid = useAuthStore().currentUser?.uid

    if (!uid) {
      return
    }

    try {
      await saveRemoteCustomFood(uid, food)
      customFoodsError.value = ''
    } catch (error) {
      customFoodsError.value = appendErrorDetail('自訂食物同步失敗，請稍後再試', error)
    }
  }

  async function deleteRemoteCustomFoodForCurrentUser(foodId: string) {
    const uid = useAuthStore().currentUser?.uid

    if (!uid) {
      return
    }

    try {
      await deleteRemoteCustomFood(uid, foodId)
      customFoodsError.value = ''
    } catch (error) {
      customFoodsError.value = appendErrorDetail('自訂食物刪除同步失敗，請稍後再試', error)
    }
  }

  function goToToday() {
    selectedDate.value = todayDateKey()
  }

  function shiftSelectedDateBy(days: number) {
    selectedDate.value = shiftDateKey(selectedDate.value, days)
  }

  watch(
    profile,
    () => {
      scheduleSaveUserSettings()
    },
    { deep: true },
  )

  watch(
    globalTargets,
    () => {
      scheduleSaveUserSettings()
    },
    { deep: true },
  )

  watch(
    dailyLogs,
    () => {
      scheduleSaveCurrentDailyLog()
    },
    { deep: true },
  )

  watch(
    selectedDate,
    (value) => {
      ensureDailyLog(value)
      const uid = useAuthStore().currentUser?.uid

      if (uid && userSettingsReady.value) {
        void loadRemoteDailyLog(uid, value)
      }
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
    userSettingsLoading,
    userSettingsError,
    dailyLogLoading,
    dailyLogError,
    customFoodsLoading,
    customFoodsError,
    customFoods,
    currentTargets,
    entriesByMeal,
    mealTotals,
    totals,
    bmr,
    tdee,
    effectiveCalorieTarget,
    summaryRows,
    initializeUserDataSync,
    loadDatabase,
    saveMealEntry,
    deleteMealEntry,
    saveCustomFood,
    deleteCustomFood,
    goToToday,
    shiftSelectedDate: shiftSelectedDateBy,
  }
})

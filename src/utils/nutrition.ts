import { ACTIVITY_MULTIPLIERS, MEAL_KEYS } from '../constants/nutrition'
import type {
  CustomFoodInput,
  DailyLog,
  DailyTargets,
  FoodReference,
  MealEntry,
  MealKey,
  NutritionValues,
  SummaryRow,
  UserProfile,
} from '../types/nutrition'

export function roundNumber(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export function normalizeFoodSearch(text: string) {
  return text.trim().toLowerCase()
}

export function calculateBmr(profile: UserProfile) {
  if (!profile.age || !profile.heightCm || !profile.weightKg) {
    return null
  }

  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age
  return roundNumber(base + (profile.sex === 'male' ? 5 : -161), 0)
}

export function calculateTdee(profile: UserProfile) {
  const bmr = calculateBmr(profile)

  if (bmr === null) {
    return null
  }

  return roundNumber(bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel], 0)
}

export function calculateCaloriesFromMacros(nutrition: Pick<NutritionValues, 'protein' | 'carb' | 'fat'>) {
  return nutrition.protein * 4 + nutrition.carb * 4 + nutrition.fat * 9
}

export function calculateNutritionFromFood(food: FoodReference, grams: number): NutritionValues {
  const multiplier = grams / 100

  return {
    calories: roundNumber(food.per100g.calories * multiplier, 0),
    protein: roundNumber(food.per100g.protein * multiplier, 1),
    carb: roundNumber(food.per100g.carb * multiplier, 1),
    fat: roundNumber(food.per100g.fat * multiplier, 1),
  }
}

export function getFoodMeasurementUnit(food: Pick<FoodReference, 'per100Unit' | 'referenceUnit'>) {
  return food.per100Unit ?? food.referenceUnit ?? 'g'
}

export function getEntryMeasurementUnit(entry: Pick<MealEntry, 'unit'>) {
  return entry.unit ?? 'g'
}

export function emptyNutritionValues(): NutritionValues {
  return {
    calories: 0,
    protein: 0,
    carb: 0,
    fat: 0,
  }
}

export function createEmptyEntriesByMeal(): Record<MealKey, MealEntry[]> {
  return {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
    lateNight: [],
  }
}

export function cloneTargets(targets: DailyTargets): DailyTargets {
  return {
    calorieMode: targets.calorieMode,
    customCalories: targets.customCalories,
    proteinGrams: targets.proteinGrams,
    carbGrams: targets.carbGrams,
    fatGrams: targets.fatGrams,
  }
}

export function createDailyLog(date: string, targets: DailyTargets): DailyLog {
  return {
    date,
    targets: cloneTargets(targets),
    entriesByMeal: createEmptyEntriesByMeal(),
  }
}

export function sumNutritionValues(values: NutritionValues[]) {
  return values.reduce<NutritionValues>(
    (accumulator, item) => ({
      calories: roundNumber(accumulator.calories + item.calories, 0),
      protein: roundNumber(accumulator.protein + item.protein, 1),
      carb: roundNumber(accumulator.carb + item.carb, 1),
      fat: roundNumber(accumulator.fat + item.fat, 1),
    }),
    emptyNutritionValues(),
  )
}

export function getMealTotals(entriesByMeal: Record<MealKey, MealEntry[]>) {
  return MEAL_KEYS.reduce(
    (accumulator, mealKey) => {
      const entries = entriesByMeal[mealKey]
      const nutrition = sumNutritionValues(entries.map((entry) => entry.nutrition))

      accumulator[mealKey] = {
        ...nutrition,
        count: entries.length,
      }

      return accumulator
    },
    {} as Record<MealKey, NutritionValues & { count: number }>,
  )
}

export function getSummaryRows(targets: DailyTargets, totals: NutritionValues, calorieTarget: number | null): SummaryRow[] {
  return [
    {
      key: 'calories',
      label: '熱量',
      unit: 'kcal',
      target: calorieTarget,
      actual: totals.calories,
      difference: calorieTarget === null ? null : roundNumber(totals.calories - calorieTarget, 0),
    },
    {
      key: 'protein',
      label: '蛋白質',
      unit: 'g',
      target: targets.proteinGrams,
      actual: totals.protein,
      difference: roundNumber(totals.protein - targets.proteinGrams, 1),
    },
    {
      key: 'carb',
      label: '碳水',
      unit: 'g',
      target: targets.carbGrams,
      actual: totals.carb,
      difference: roundNumber(totals.carb - targets.carbGrams, 1),
    },
    {
      key: 'fat',
      label: '脂肪',
      unit: 'g',
      target: targets.fatGrams,
      actual: totals.fat,
      difference: roundNumber(totals.fat - targets.fatGrams, 1),
    },
  ]
}

export function normalizeCustomFood(input: CustomFoodInput): FoodReference {
  const referenceGrams = input.referenceGrams
  const calories = input.calories ?? calculateCaloriesFromMacros(input)
  const scale = 100 / referenceGrams

  return {
    id: input.id ?? `custom-${crypto.randomUUID()}`,
    source: 'custom',
    name: input.name,
    category: input.category ?? null,
    alias: input.alias ?? null,
    description: input.description ?? null,
    referenceGrams,
    referenceUnit: input.referenceUnit,
    per100g: {
      calories: roundNumber(calories * scale, 1),
      protein: roundNumber(input.protein * scale, 1),
      carb: roundNumber(input.carb * scale, 1),
      fat: roundNumber(input.fat * scale, 1),
    },
    per100Unit: input.referenceUnit,
    searchText: normalizeFoodSearch([input.name, input.alias, input.description, input.category].filter(Boolean).join(' ')),
  }
}

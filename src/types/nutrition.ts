export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive'
export type CalorieMode = 'tdee' | 'custom'
export type FoodSource = 'database' | 'custom'
export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'lateNight'
export type MeasurementUnit = 'g' | 'ml'

export interface UserProfile {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activityLevel: ActivityLevel
}

export interface DailyTargets {
  calorieMode: CalorieMode
  customCalories?: number
  proteinGrams: number
  carbGrams: number
  fatGrams: number
}

export interface NutritionValues {
  calories: number
  protein: number
  carb: number
  fat: number
}

export interface FoodReference {
  id: string
  source: FoodSource
  name: string
  category: string | null
  alias: string | null
  description: string | null
  referenceGrams?: number
  referenceUnit?: MeasurementUnit
  per100g: NutritionValues
  per100Unit?: MeasurementUnit
  searchText?: string
}

export interface MealEntry {
  id: string
  meal: MealKey
  foodId: string
  foodNameSnapshot: string
  grams: number
  unit?: MeasurementUnit
  nutrition: NutritionValues
  source: FoodSource
}

export interface DailyLog {
  date: string
  targets: DailyTargets
  entriesByMeal: Record<MealKey, MealEntry[]>
}

export interface MealDefinition {
  key: MealKey
  label: string
}

export interface SummaryRow {
  key: keyof NutritionValues
  label: string
  unit: 'kcal' | 'g'
  target: number | null
  actual: number
  difference: number | null
}

export interface CustomFoodInput {
  id?: string
  name: string
  category: string | null
  alias: string | null
  description: string | null
  referenceGrams: number
  referenceUnit: MeasurementUnit
  protein: number
  carb: number
  fat: number
  calories: number | null
}

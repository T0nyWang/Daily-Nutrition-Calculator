import type {
  ActivityLevel,
  DailyTargets,
  MealDefinition,
  MealKey,
  UserProfile,
} from '../types/nutrition'

export const STORAGE_KEYS = {
  profile: 'dnc.profile.v1',
  targets: 'dnc.targets.v1',
  dailyLogs: 'dnc.dailyLogs.v1',
  customFoods: 'dnc.customFoods.v1',
} as const

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
}

export const ACTIVITY_LEVEL_OPTIONS = [
  { label: '久坐 / 幾乎不運動', value: 'sedentary' },
  { label: '輕量活動 / 每週 1-3 次', value: 'light' },
  { label: '中量活動 / 每週 3-5 次', value: 'moderate' },
  { label: '高量活動 / 每週 6-7 次', value: 'active' },
  { label: '非常高活動 / 體力工作或高強度訓練', value: 'veryActive' },
] as const

export const SEX_OPTIONS = [
  { label: '男性', value: 'male' },
  { label: '女性', value: 'female' },
] as const

export const MEAL_KEYS: MealKey[] = ['breakfast', 'lunch', 'dinner', 'snack', 'lateNight']

export const MEAL_DEFINITIONS: MealDefinition[] = [
  { key: 'breakfast', label: '早餐' },
  { key: 'lunch', label: '午餐' },
  { key: 'dinner', label: '晚餐' },
  { key: 'snack', label: '點心' },
  { key: 'lateNight', label: '宵夜' },
]

export const DEFAULT_PROFILE: UserProfile = {
  sex: 'male',
  age: 30,
  heightCm: 170,
  weightKg: 70,
  activityLevel: 'light',
}

export const DEFAULT_TARGETS: DailyTargets = {
  calorieMode: 'tdee',
  customCalories: 2000,
  proteinGrams: 120,
  carbGrams: 220,
  fatGrams: 60,
}

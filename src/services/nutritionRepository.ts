import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'

import { db } from './firebase'
import type { DailyLog, DailyTargets, FoodReference, UserProfile } from '../types/nutrition'

export interface UserSettings {
  profile?: UserProfile
  globalTargets?: DailyTargets
}

function getUserDocument(uid: string) {
  return doc(db, 'users', uid)
}

function getDailyLogDocument(uid: string, date: string) {
  return doc(db, 'users', uid, 'dailyLogs', date)
}

function getCustomFoodsCollection(uid: string) {
  return collection(db, 'users', uid, 'customFoods')
}

function getCustomFoodDocument(uid: string, foodId: string) {
  return doc(db, 'users', uid, 'customFoods', foodId)
}

export async function loadUserSettings(uid: string): Promise<UserSettings | null> {
  const snapshot = await getDoc(getUserDocument(uid))

  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data()

  return {
    profile: data.profile,
    globalTargets: data.globalTargets,
  }
}

export async function saveUserSettings(uid: string, settings: Required<UserSettings>) {
  await setDoc(
    getUserDocument(uid),
    {
      ...settings,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function loadDailyLog(uid: string, date: string): Promise<DailyLog | null> {
  const snapshot = await getDoc(getDailyLogDocument(uid, date))

  if (!snapshot.exists()) {
    return null
  }

  return snapshot.data() as DailyLog
}

export async function saveDailyLog(uid: string, log: DailyLog) {
  await setDoc(
    getDailyLogDocument(uid, log.date),
    {
      ...log,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function loadCustomFoods(uid: string): Promise<FoodReference[]> {
  const snapshot = await getDocs(getCustomFoodsCollection(uid))

  return snapshot.docs.map((documentSnapshot) => documentSnapshot.data() as FoodReference)
}

export async function saveCustomFood(uid: string, food: FoodReference) {
  await setDoc(
    getCustomFoodDocument(uid, food.id),
    {
      ...food,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function deleteCustomFood(uid: string, foodId: string) {
  await deleteDoc(getCustomFoodDocument(uid, foodId))
}

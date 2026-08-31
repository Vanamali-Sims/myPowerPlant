import { emptyProfile, type ProfileData } from '../types/profile'

const STORAGE_KEY = 'mypowerplant.profile'

export function loadProfile(): ProfileData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyProfile()
    const parsed = JSON.parse(raw) as Partial<ProfileData>
    return { ...emptyProfile(), ...parsed, fieldSources: parsed.fieldSources ?? {} }
  } catch {
    return emptyProfile()
  }
}

export function saveProfile(profile: ProfileData): ProfileData {
  const next = { ...profile, lastUpdated: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function clearStoredProfile(): void {
  localStorage.removeItem(STORAGE_KEY)
}

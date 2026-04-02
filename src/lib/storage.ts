import type { UserProfile } from '../types'

const USER_KEY = 'mindbreaker-user-v1'

export function loadUser(): UserProfile | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>
    if (
      typeof parsed.id === 'string' &&
      typeof parsed.username === 'string' &&
      typeof parsed.avatar === 'string'
    ) {
      return {
        id: parsed.id,
        username: parsed.username,
        avatar: parsed.avatar,
      }
    }
    return null
  } catch {
    return null
  }
}

export function saveUser(user: UserProfile): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

import type { UserProfile } from '../types'

type TelegramWebAppUser = {
  id: number
  username?: string
  first_name?: string
  last_name?: string
}

type TelegramWebApp = {
  initDataUnsafe?: {
    user?: TelegramWebAppUser
  }
  ready?: () => void
  expand?: () => void
  openTelegramLink?: (url: string) => void
}

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: TelegramWebApp
  }
}

const DEFAULT_AVATARS = ['😀', '😎', '🤖', '🦊', '🐼', '🐯', '🐸', '🧠']

function avatarFromId(id: number): string {
  const idx = Math.abs(id) % DEFAULT_AVATARS.length
  return DEFAULT_AVATARS[idx]
}

export function getTelegramWebApp(): TelegramWebApp | null {
  const tgWindow = window as TelegramWindow
  return tgWindow.Telegram?.WebApp ?? null
}

export function isTelegramWebApp(): boolean {
  return Boolean(getTelegramWebApp())
}

export function prepareTelegramWebApp(): void {
  const webApp = getTelegramWebApp()
  if (!webApp) return
  webApp.ready?.()
  webApp.expand?.()
}

export function getTelegramUserProfile(): UserProfile | null {
  const webApp = getTelegramWebApp()
  const tgUser = webApp?.initDataUnsafe?.user
  if (!tgUser?.id) return null

  const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim()
  const username = (tgUser.username ?? fullName ?? `Player ${tgUser.id}`).slice(0, 24)

  return {
    id: `tg-${tgUser.id}`,
    username,
    avatar: avatarFromId(tgUser.id),
  }
}

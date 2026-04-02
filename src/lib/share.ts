import { buildInviteLink } from './realtime'
import { getTelegramWebApp } from './platform'

export type ShareChannel = 'native' | 'telegram' | 'whatsapp' | 'clipboard'

function inviteText(roomName?: string): string {
  const roomPart = roomName ? ` for "${roomName}"` : ''
  return `Join my Code Cracking room${roomPart}.`
}

function buildSharePayload(roomId: string, roomName?: string) {
  const link = buildInviteLink(roomId)
  const text = inviteText(roomName)
  return { link, text }
}

export async function shareInviteSmart(roomId: string, roomName?: string): Promise<ShareChannel> {
  const { link, text } = buildSharePayload(roomId, roomName)
  const webApp = getTelegramWebApp()

  if (webApp?.openTelegramLink) {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
    webApp.openTelegramLink(shareUrl)
    return 'telegram'
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Code Cracking Invite',
        text,
        url: link,
      })
      return 'native'
    } catch {
      // User canceled native share; continue to clipboard fallback.
    }
  }

  await navigator.clipboard.writeText(`${text}\n${link}`)
  return 'clipboard'
}

export function shareInviteViaTelegram(roomId: string, roomName?: string): void {
  const { link, text } = buildSharePayload(roomId, roomName)
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
  window.open(shareUrl, '_blank', 'noopener,noreferrer')
}

export function shareInviteViaWhatsApp(roomId: string, roomName?: string): void {
  const { link, text } = buildSharePayload(roomId, roomName)
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`
  window.open(shareUrl, '_blank', 'noopener,noreferrer')
}

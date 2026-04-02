const ROOM_PREFIXES = ['Cipher', 'Neon', 'Quartz', 'Shadow', 'Nova', 'Echo', 'Zenith', 'Arcade']
const ROOM_SUFFIXES = ['Vault', 'Lab', 'Arena', 'Node', 'Grid', 'Chamber', 'Core', 'Deck']

export function generateRoomName(hostUsername?: string): string {
  const prefix = ROOM_PREFIXES[Math.floor(Math.random() * ROOM_PREFIXES.length)]
  const suffix = ROOM_SUFFIXES[Math.floor(Math.random() * ROOM_SUFFIXES.length)]
  const serial = Math.floor(100 + Math.random() * 900)
  const hostPart = hostUsername?.trim() ? `${hostUsername.trim().slice(0, 12)}'s` : 'Player'
  return `${hostPart} ${prefix} ${suffix} ${serial}`
}

export function normalizeRoomName(value: string, fallbackHost?: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ')
  if (!trimmed) return generateRoomName(fallbackHost)
  return trimmed.slice(0, 40)
}

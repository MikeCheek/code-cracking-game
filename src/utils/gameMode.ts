import type { RoomData, GameMode, WordLanguage } from '../types'
import { DEFAULT_GAME_MODE, DEFAULT_WORD_LANGUAGE } from '../constants'

export function getRoomGameMode(room: Pick<RoomData, 'settings'>): GameMode {
  return room.settings.gameMode ?? DEFAULT_GAME_MODE
}

export function isWordGame(room: Pick<RoomData, 'settings'>): boolean {
  return getRoomGameMode(room) === 'words'
}

export function getRoomWordLanguage(room: Pick<RoomData, 'settings'>): WordLanguage {
  return room.settings.wordLanguage ?? DEFAULT_WORD_LANGUAGE
}
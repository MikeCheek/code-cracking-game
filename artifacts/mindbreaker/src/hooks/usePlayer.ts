import { useState, useEffect } from "react";
import { Player, PREDEFINED_AVATARS } from "@/types/game";

const STORAGE_KEY = "mindbreaker_player";

function randomAvatar(): string {
  return PREDEFINED_AVATARS[Math.floor(Math.random() * PREDEFINED_AVATARS.length)];
}

function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function usePlayer() {
  const [player, setPlayer] = useState<Player | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return null;
  });

  const savePlayer = (p: Player) => {
    setPlayer(p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  };

  const createPlayer = (username: string, avatar: string) => {
    const newPlayer: Player = {
      id: generatePlayerId(),
      username,
      avatar,
      score: 0,
      penaltyCount: 0,
    };
    savePlayer(newPlayer);
    return newPlayer;
  };

  const updateAvatar = (avatar: string) => {
    if (!player) return;
    const updated = { ...player, avatar };
    savePlayer(updated);
  };

  const getOrCreate = (username: string, avatar: string): Player => {
    if (player) return player;
    return createPlayer(username, avatar);
  };

  return {
    player,
    createPlayer,
    updateAvatar,
    getOrCreate,
    randomAvatar,
    isSetup: !!player,
  };
}

'use client';

import { useState, useEffect, startTransition } from 'react';
import { use } from 'react';
import GameRoom from '@/components/GameRoom';
import UserSetup from '@/components/UserSetup';
import { User } from '@/types/game';

function isValidUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Record<string, unknown>).userId === 'string' &&
    typeof (obj as Record<string, unknown>).username === 'string' &&
    typeof (obj as Record<string, unknown>).avatar === 'string'
  );
}

function loadUserFromStorage(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('codecracker_user');
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return isValidUser(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const storedUser = loadUserFromStorage();
    startTransition(() => {
      setUser(storedUser);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black flex items-center justify-center">
        <div className="text-purple-400 animate-pulse">🔐 Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <UserSetup onComplete={(u) => {
      setUser(u);
    }} />;
  }

  return <GameRoom gameId={gameId} user={user} />;
}

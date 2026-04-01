'use client';

import { useState, useEffect, startTransition } from 'react';
import UserSetup from '@/components/UserSetup';
import Lobby from '@/components/Lobby';
import { User } from '@/types/game';
import { isFirebaseConfigured } from '@/lib/firebase';

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

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [firebaseOk, setFirebaseOk] = useState(true);

  useEffect(() => {
    const storedUser = loadUserFromStorage();
    const fbOk = isFirebaseConfigured();
    startTransition(() => {
      setUser(storedUser);
      setFirebaseOk(fbOk);
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black flex items-center justify-center">
        <div className="text-purple-400 animate-pulse text-xl">🔐 Loading...</div>
      </div>
    );
  }

  if (!firebaseOk) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black flex items-center justify-center p-4">
        <div className="bg-indigo-950/50 border border-yellow-500/30 rounded-2xl p-8 max-w-lg w-full text-center">
          <div className="text-6xl mb-4">⚙️</div>
          <h1 className="text-3xl font-bold text-yellow-400 mb-4">Firebase Setup Required</h1>
          <p className="text-purple-300 mb-6">
            To play Code Cracker, you need to configure Firebase. Create a project at{' '}
            <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
              firebase.google.com
            </a>{' '}
            and update the config in <code className="bg-purple-900/50 px-2 py-1 rounded text-cyan-300">src/lib/firebase.ts</code>
          </p>
          <div className="bg-purple-900/30 rounded-xl p-4 text-left text-sm font-mono text-purple-300">
            <p className="text-cyan-400 mb-2"># .env.local</p>
            <p>NEXT_PUBLIC_FIREBASE_API_KEY=your_key</p>
            <p>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain</p>
            <p>NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_id</p>
            <p>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket</p>
            <p>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender</p>
            <p>NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id</p>
          </div>
          <button
            onClick={() => { setFirebaseOk(true); }}
            className="mt-4 text-purple-400 hover:text-purple-200 text-sm underline"
          >
            I&apos;ve configured it, continue anyway →
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <UserSetup onComplete={setUser} />;
  }

  return <Lobby user={user} />;
}

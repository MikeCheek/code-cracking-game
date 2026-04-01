'use client';

import { useState } from 'react';
import { AVATARS, generateUserId } from '@/lib/gameLogic';
import { sounds } from '@/lib/sounds';
import { User } from '@/types/game';

interface Props {
  onComplete: (user: User) => void;
}

export default function UserSetup({ onComplete }: Props) {
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(() => AVATARS[Math.floor(Math.random() * AVATARS.length)]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    sounds.success();
    const user: User = {
      userId: generateUserId(),
      username: username.trim(),
      avatar: selectedAvatar,
    };
    localStorage.setItem('codecracker_user', JSON.stringify(user));
    onComplete(user);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black flex items-center justify-center p-4">
      <div className="bg-indigo-950/50 border border-purple-500/30 rounded-2xl p-8 w-full max-w-md shadow-2xl shadow-purple-500/20">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔐</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Code Cracker
          </h1>
          <p className="text-purple-300 mt-2">The ultimate mind game</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-purple-300 text-sm font-medium mb-2">
              👤 Your Hacker Name
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username..."
              maxLength={20}
              className="w-full bg-purple-900/30 border border-purple-500/50 rounded-xl px-4 py-3 text-white placeholder-purple-400/50 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
          </div>

          <div>
            <label className="block text-purple-300 text-sm font-medium mb-3">
              🎭 Choose Your Avatar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map(avatar => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => { setSelectedAvatar(avatar); sounds.click(); }}
                  className={`text-3xl p-2 rounded-xl transition-all ${
                    selectedAvatar === avatar
                      ? 'bg-purple-500/50 ring-2 ring-cyan-400 scale-110'
                      : 'bg-purple-900/30 hover:bg-purple-800/30 hover:scale-105'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={!username.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/30 hover:scale-105"
          >
            Enter the Arena 🚀
          </button>
        </form>
      </div>
    </div>
  );
}

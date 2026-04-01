'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Game, User } from '@/types/game';
import RockPaperScissors from './RockPaperScissors';
import CombinationSetup from './CombinationSetup';
import GameBoard from './GameBoard';

interface Props {
  gameId: string;
  user: User;
}

export default function GameRoom({ gameId, user }: Props) {
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gameRef = doc(db, 'games', gameId);
    const unsubscribe = onSnapshot(gameRef, (snap) => {
      if (snap.exists()) {
        setGame({ id: snap.id, ...snap.data() } as Game);
      } else {
        setError('Game not found');
      }
      setLoading(false);
    }, (err) => {
      setError('Connection error: ' + err.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [gameId]);

  // Handle both-ready transition to playing
  useEffect(() => {
    if (!game) return;
    if (game.status === 'setup' && game.player1.ready && game.player2?.ready) {
      const gameRef = doc(db, 'games', gameId);
      updateDoc(gameRef, { status: 'playing' });
    }
  }, [game, gameId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black flex items-center justify-center">
        <div className="text-purple-400 text-xl animate-pulse">🔄 Loading game...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black flex items-center justify-center">
        <div className="text-red-400 text-xl">⚠️ {error}</div>
      </div>
    );
  }

  if (!game) return null;

  const isPlayer1 = game.player1.userId === user.userId;
  const isPlayer2 = game.player2?.userId === user.userId;
  const isSpectator = !isPlayer1 && !isPlayer2;

  if (isSpectator) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">👀</div>
          <p className="text-purple-400 text-xl">You&apos;re spectating this game</p>
          <p className="text-purple-600 mt-2">Join a game to play!</p>
        </div>
      </div>
    );
  }

  // Waiting for player 2
  if (game.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black flex items-center justify-center p-4">
        <div className="bg-indigo-950/50 border border-purple-500/30 rounded-2xl p-8 text-center max-w-md w-full">
          <div className="text-6xl mb-4 animate-bounce">⏳</div>
          <h2 className="text-2xl font-bold text-white mb-4">Waiting for Opponent</h2>
          <div className="bg-purple-900/30 rounded-xl p-4 mb-6">
            <p className="text-purple-300 text-sm mb-2">Share this link to invite a friend:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.href}` : ''}
                className="flex-1 bg-purple-900/50 border border-purple-500/30 rounded-lg px-3 py-2 text-purple-300 text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}
                className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-sm"
              >
                📋
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-center text-purple-400 text-sm">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Game ID: {gameId}</span>
          </div>
        </div>
      </div>
    );
  }

  if (game.status === 'rps') {
    return <RockPaperScissors game={game} user={user} isPlayer1={isPlayer1} />;
  }

  if (game.status === 'setup') {
    return <CombinationSetup game={game} isPlayer1={isPlayer1} />;
  }

  return <GameBoard game={game} user={user} isPlayer1={isPlayer1} />;
}

'use client';

import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Game } from '@/types/game';
import { sounds } from '@/lib/sounds';

interface Props {
  game: Game;
  isPlayer1: boolean;
}

export default function CombinationSetup({ game, isPlayer1 }: Props) {
  const [combination, setCombination] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');

  const playerData = isPlayer1 ? game.player1 : game.player2!;
  const isReady = playerData.ready;

  const handleDigit = (digit: string) => {
    if (combination.length >= game.combinationLength) return;
    if (!game.allowRepeats && combination.includes(digit)) {
      setError(`Digit ${digit} already used!`);
      sounds.error();
      return;
    }
    setError('');
    sounds.click();
    setCombination(prev => prev + digit);
  };

  const handleBackspace = () => {
    sounds.click();
    setCombination(prev => prev.slice(0, -1));
    setError('');
  };

  const handleSubmit = async () => {
    if (combination.length !== game.combinationLength) {
      setError(`Need ${game.combinationLength} digits!`);
      sounds.error();
      return;
    }
    
    sounds.success();
    setConfirmed(true);
    
    const playerKey = isPlayer1 ? 'player1' : 'player2';
    const gameRef = doc(db, 'games', game.id);
    await updateDoc(gameRef, {
      [`${playerKey}.combination`]: combination,
      [`${playerKey}.ready`]: true,
    });

    // Check if both ready
    const otherReady = isPlayer1 ? game.player2?.ready : game.player1.ready;
    if (otherReady) {
      await updateDoc(gameRef, { status: 'playing' });
    }
  };

  const opponent = isPlayer1 ? game.player2 : game.player1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black flex items-center justify-center p-4">
      <div className="bg-indigo-950/50 border border-purple-500/30 rounded-2xl p-8 w-full max-w-md text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          🔐 Set Your Code
        </h2>
        <p className="text-purple-300 mb-2">
          Choose {game.combinationLength} {game.allowRepeats ? '' : 'unique '}digits
        </p>
        <p className="text-purple-400 text-sm mb-6">Your opponent won&apos;t see this!</p>

        {/* Display */}
        <div className="flex gap-3 justify-center mb-6">
          {Array.from({ length: game.combinationLength }).map((_, i) => (
            <div
              key={i}
              className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold border-2 transition-all ${
                combination[i]
                  ? confirmed
                    ? 'border-green-400 bg-green-900/30 text-green-300'
                    : 'border-cyan-400 bg-cyan-900/30 text-cyan-300'
                  : 'border-purple-500/30 bg-purple-900/20 text-purple-500'
              }`}
            >
              {combination[i] ? (confirmed ? '●' : combination[i]) : '?'}
            </div>
          ))}
        </div>

        {!isReady ? (
          <>
            {/* Number Pad */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  onClick={() => handleDigit(digit)}
                  disabled={combination.length >= game.combinationLength}
                  className="bg-purple-900/50 hover:bg-purple-700/50 border border-purple-500/30 hover:border-cyan-400 rounded-xl py-3 text-white font-bold text-lg transition-all hover:scale-105 disabled:opacity-30"
                >
                  {digit}
                </button>
              ))}
            </div>
            
            {error && <p className="text-red-400 text-sm mb-3">⚠️ {error}</p>}
            
            <div className="flex gap-2">
              <button
                onClick={handleBackspace}
                className="flex-1 bg-red-900/30 hover:bg-red-800/30 border border-red-500/30 text-red-300 py-3 rounded-xl transition"
              >
                ⌫ Delete
              </button>
              <button
                onClick={handleSubmit}
                disabled={combination.length !== game.combinationLength}
                className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
              >
                🔒 Lock In
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-green-300 font-medium">Code locked in!</p>
            </div>
            {!opponent?.ready ? (
              <p className="text-purple-400 animate-pulse">⏳ Waiting for {opponent?.username} to set their code...</p>
            ) : (
              <p className="text-cyan-400 animate-pulse">🚀 Both players ready! Starting game...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

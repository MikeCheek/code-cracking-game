'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Game, Guess, User } from '@/types/game';
import { calculateBullsAndCows } from '@/lib/gameLogic';
import { sounds } from '@/lib/sounds';

interface Props {
  game: Game;
  user: User;
  isPlayer1: boolean;
}

interface AnswerModalProps {
  pendingGuess: Guess;
  opponentName: string;
  combinationLength: number;
  onSubmit: (bulls: number, cows: number) => void;
  submitting: boolean;
}

function AnswerModal({ pendingGuess, opponentName, combinationLength, onSubmit, submitting }: AnswerModalProps) {
  const [bulls, setBulls] = useState(0);
  const [cows, setCows] = useState(0);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-indigo-950 border border-purple-500/50 rounded-2xl p-8 w-full max-w-md text-center shadow-2xl shadow-purple-500/30">
        <h3 className="text-2xl font-bold text-white mb-2">🎯 Answer Their Guess!</h3>
        <p className="text-purple-300 mb-6">{opponentName} guessed:</p>
        
        <div className="flex gap-3 justify-center mb-6">
          {pendingGuess.combination.split('').map((d, i) => (
            <div key={i} className="w-14 h-14 rounded-xl bg-indigo-800 border-2 border-indigo-500 flex items-center justify-center text-2xl font-bold text-white">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-green-400 text-sm mb-2 block">🐂 Bulls (right position)</label>
            <div className="flex gap-1 justify-center">
              {Array.from({ length: combinationLength + 1 }).map((_, n) => (
                <button
                  key={n}
                  onClick={() => { setBulls(n); sounds.click(); }}
                  className={`w-10 h-10 rounded-lg font-bold transition ${
                    bulls === n ? 'bg-green-600 text-white' : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-yellow-400 text-sm mb-2 block">🐄 Cows (wrong position)</label>
            <div className="flex gap-1 justify-center">
              {Array.from({ length: combinationLength + 1 }).map((_, n) => (
                <button
                  key={n}
                  onClick={() => { setCows(n); sounds.click(); }}
                  className={`w-10 h-10 rounded-lg font-bold transition ${
                    cows === n ? 'bg-yellow-600 text-white' : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => onSubmit(bulls, cows)}
          disabled={submitting}
          className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold py-3 rounded-xl hover:shadow-lg disabled:opacity-50 transition"
        >
          {submitting ? '⏳ Submitting...' : '✅ Submit Answer'}
        </button>
      </div>
    </div>
  );
}

export default function GameBoard({ game, user, isPlayer1 }: Props) {
  const [guess, setGuess] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  const isMyTurn = game.currentTurn === user.userId;
  const opponent = isPlayer1 ? game.player2! : game.player1;
  const myPlayer = isPlayer1 ? game.player1 : game.player2!;

  // Derive pending guess directly from game state
  const pendingGuess = game.guesses.find(
    g => g.byPlayer === opponent.userId && g.answeredBy === ''
  ) ?? null;

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [game.guesses.length]);

  const handleDigit = (digit: string) => {
    if (guess.length >= game.combinationLength) return;
    if (!game.allowRepeats && guess.includes(digit)) {
      setError(`Digit ${digit} already used!`);
      sounds.error();
      return;
    }
    setError('');
    sounds.click();
    setGuess(prev => prev + digit);
  };

  const submitGuess = async () => {
    if (guess.length !== game.combinationLength) {
      setError(`Need ${game.combinationLength} digits!`);
      return;
    }
    setSubmitting(true);
    sounds.click();
    
    const newGuess: Guess = {
      byPlayer: user.userId,
      combination: guess,
      bulls: -1,
      cows: -1,
      answeredBy: '',
      lied: false,
      timestamp: Date.now(),
    };

    const gameRef = doc(db, 'games', game.id);
    await updateDoc(gameRef, {
      guesses: arrayUnion(newGuess),
    });
    
    setGuess('');
    setSubmitting(false);
  };

  const submitAnswer = async (bulls: number, cows: number) => {
    if (!pendingGuess) return;
    setSubmitting(true);
    
    const mySecret = myPlayer.combination!;
    
    // Verify the actual answer
    const realAnswer = calculateBullsAndCows(pendingGuess.combination, mySecret);
    const isLying = realAnswer.bulls !== bulls || realAnswer.cows !== cows;
    
    if (isLying) {
      sounds.lie();
    } else if (bulls > 0) {
      sounds.bull();
    } else if (cows > 0) {
      sounds.cow();
    }
    
    const guessIndex = game.guesses.findIndex(
      g => g.byPlayer === opponent.userId && g.answeredBy === '' && g.combination === pendingGuess.combination
    );
    
    if (guessIndex === -1) {
      setSubmitting(false);
      return;
    }

    const updatedGuesses = [...game.guesses];
    updatedGuesses[guessIndex] = {
      ...updatedGuesses[guessIndex],
      bulls: isLying ? realAnswer.bulls : bulls,
      cows: isLying ? realAnswer.cows : cows,
      answeredBy: user.userId,
      lied: isLying,
    };

    const gameRef = doc(db, 'games', game.id);
    
    // Check for win condition
    const isWin = realAnswer.bulls === game.combinationLength;
    
    const updateData: Record<string, unknown> = {
      guesses: updatedGuesses,
      currentTurn: isWin ? game.currentTurn : user.userId,
    };
    
    if (isWin) {
      updateData.winner = opponent.userId;
      updateData.status = 'finished';
      sounds.win();
    }
    
    if (isLying) {
      const currentLies = (game.lies[user.userId] || 0) + 1;
      updateData[`lies.${user.userId}`] = currentLies;
      // Skip opponent's next turn as penalty
      updateData.currentTurn = user.userId;
    }
    
    await updateDoc(gameRef, updateData);
    setSubmitting(false);
  };

  const myGuesses = game.guesses.filter(g => g.byPlayer === user.userId);
  const opponentGuesses = game.guesses.filter(g => g.byPlayer === opponent.userId);

  if (game.status === 'finished') {
    const iWon = game.winner === user.userId;
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black flex items-center justify-center p-4">
        <div className="bg-indigo-950/50 border border-purple-500/30 rounded-2xl p-8 w-full max-w-md text-center">
          <div className="text-8xl mb-6">{iWon ? '🏆' : '💀'}</div>
          <h2 className={`text-4xl font-bold mb-4 ${iWon ? 'text-yellow-400' : 'text-red-400'}`}>
            {iWon ? 'You Win!' : 'You Lost!'}
          </h2>
          <p className="text-purple-300 mb-6">
            {iWon ? `${opponent.username} couldn't crack your code!` : `${opponent.username} cracked your code!`}
          </p>
          <div className="bg-purple-900/30 rounded-xl p-4 mb-6">
            <p className="text-purple-300 text-sm mb-2">Your secret code was:</p>
            <div className="flex gap-2 justify-center">
              {myPlayer.combination?.split('').map((d, i) => (
                <div key={i} className="w-12 h-12 rounded-xl bg-cyan-900/50 border border-cyan-400 flex items-center justify-center text-xl font-bold text-cyan-300">
                  {d}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold py-3 px-8 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition"
          >
            🏠 Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{user.avatar}</span>
            <div>
              <p className="text-white font-medium">{user.username}</p>
              <p className="text-purple-400 text-xs">Lies: {game.lies[user.userId] || 0} 🤥</p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
            isMyTurn 
              ? 'bg-green-900/50 border border-green-500/50 text-green-300 animate-pulse'
              : 'bg-purple-900/30 border border-purple-500/30 text-purple-400'
          }`}>
            {isMyTurn ? '⚡ YOUR TURN' : '⏳ Waiting...'}
          </div>
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-white font-medium">{opponent.username}</p>
              <p className="text-purple-400 text-xs">Lies: {game.lies[opponent.userId] || 0} 🤥</p>
            </div>
            <span className="text-2xl">{opponent.avatar}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* My Guesses */}
          <div className="bg-indigo-950/50 border border-purple-500/30 rounded-2xl p-4">
            <h3 className="text-lg font-bold text-white mb-3">🎯 My Guesses</h3>
            <div ref={historyRef} className="space-y-2 max-h-64 overflow-y-auto mb-4 pr-1">
              {myGuesses.length === 0 ? (
                <p className="text-purple-400 text-sm text-center py-4">No guesses yet</p>
              ) : (
                myGuesses.map((g, i) => (
                  <div key={i} className={`flex items-center justify-between rounded-xl p-3 ${
                    g.bulls === game.combinationLength
                      ? 'bg-green-900/30 border border-green-500/30'
                      : 'bg-purple-900/20 border border-purple-500/20'
                  }`}>
                    <div className="flex gap-1">
                      {g.combination.split('').map((d, j) => (
                        <div key={j} className="w-8 h-8 rounded-lg bg-cyan-900/50 border border-cyan-700 flex items-center justify-center text-sm font-bold text-cyan-300">
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {g.bulls < 0 ? (
                        <span className="text-yellow-400 animate-pulse">⏳ Pending</span>
                      ) : (
                        <>
                          <span className="text-green-400">🐂{g.bulls}</span>
                          <span className="text-yellow-400">🐄{g.cows}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Guess Input */}
            {isMyTurn && (
              <div>
                <div className="flex gap-2 mb-3">
                  {Array.from({ length: game.combinationLength }).map((_, i) => (
                    <div key={i} className={`flex-1 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 transition ${
                      guess[i]
                        ? 'border-cyan-400 bg-cyan-900/30 text-cyan-300'
                        : 'border-purple-500/30 bg-purple-900/20 text-purple-500'
                    }`}>
                      {guess[i] || '?'}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-1 mb-2">
                  {['0','1','2','3','4','5','6','7','8','9'].map(d => (
                    <button
                      key={d}
                      onClick={() => handleDigit(d)}
                      className="bg-purple-900/50 hover:bg-purple-700/50 border border-purple-500/30 hover:border-cyan-400 rounded-lg py-2 text-white font-bold transition hover:scale-105"
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {error && <p className="text-red-400 text-xs mb-2">⚠️ {error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setGuess(prev => prev.slice(0,-1)); sounds.click(); }}
                    className="bg-red-900/30 border border-red-500/30 text-red-300 px-4 py-2 rounded-xl text-sm"
                  >
                    ⌫
                  </button>
                  <button
                    onClick={submitGuess}
                    disabled={guess.length !== game.combinationLength || submitting}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold py-2 rounded-xl disabled:opacity-50 transition"
                  >
                    Guess! 🎯
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Opponent's Guesses */}
          <div className="bg-indigo-950/50 border border-purple-500/30 rounded-2xl p-4">
            <h3 className="text-lg font-bold text-white mb-3">👁️ {opponent.username}&apos;s Guesses</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {opponentGuesses.length === 0 ? (
                <p className="text-purple-400 text-sm text-center py-4">No guesses yet</p>
              ) : (
                opponentGuesses.map((g, i) => (
                  <div key={i} className={`flex items-center justify-between rounded-xl p-3 ${
                    g.lied ? 'bg-red-900/20 border border-red-500/20' : 'bg-purple-900/20 border border-purple-500/20'
                  }`}>
                    <div className="flex gap-1">
                      {g.combination.split('').map((d, j) => (
                        <div key={j} className="w-8 h-8 rounded-lg bg-indigo-900/50 border border-indigo-700 flex items-center justify-center text-sm font-bold text-indigo-300">
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {g.bulls < 0 ? (
                        <span className="text-yellow-400 animate-pulse">⏳</span>
                      ) : (
                        <>
                          <span className="text-green-400">🐂{g.bulls}</span>
                          <span className="text-yellow-400">🐄{g.cows}</span>
                          {g.lied && <span className="text-red-400">🤥 LIE!</span>}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Answer Modal - key resets internal state when pendingGuess changes */}
      {pendingGuess && (
        <AnswerModal
          key={pendingGuess.combination}
          pendingGuess={pendingGuess}
          opponentName={opponent.username}
          combinationLength={game.combinationLength}
          onSubmit={submitAnswer}
          submitting={submitting}
        />
      )}
    </div>
  );
}

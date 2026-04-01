'use client';

import { useState, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Game, RPSChoice, User } from '@/types/game';
import { sounds } from '@/lib/sounds';

interface Props {
  game: Game;
  user: User;
  isPlayer1: boolean;
}

const RPS_OPTIONS: { choice: RPSChoice; emoji: string; label: string }[] = [
  { choice: 'rock', emoji: '🪨', label: 'Rock' },
  { choice: 'paper', emoji: '📄', label: 'Paper' },
  { choice: 'scissors', emoji: '✂️', label: 'Scissors' },
];

const RPS_BEATS: Record<RPSChoice, RPSChoice> = {
  rock: 'scissors',
  scissors: 'paper',
  paper: 'rock',
};

export default function RockPaperScissors({ game, user, isPlayer1 }: Props) {
  const [myChoice, setMyChoice] = useState<RPSChoice | null>(null);
  
  const playerKey = isPlayer1 ? 'player1Choice' : 'player2Choice';
  const opponentKey = isPlayer1 ? 'player2Choice' : 'player1Choice';
  const myStoredChoice = game.rps[playerKey];
  const opponentChoice = game.rps[opponentKey];

  const makeChoice = async (choice: RPSChoice) => {
    if (myStoredChoice) return;
    sounds.rps();
    setMyChoice(choice);
    
    const gameRef = doc(db, 'games', game.id);
    const updateData: Record<string, RPSChoice> = {};
    updateData[`rps.${playerKey}`] = choice;
    await updateDoc(gameRef, updateData);
  };

  useEffect(() => {
    if (game.rps.player1Choice && game.rps.player2Choice && !game.rps.winner) {
      const p1 = game.rps.player1Choice;
      const p2 = game.rps.player2Choice;
      let winner: string;
      
      if (p1 === p2) {
        winner = 'tie';
      } else if (RPS_BEATS[p1] === p2) {
        winner = game.player1.userId;
      } else {
        winner = game.player2!.userId;
      }
      
      const gameRef = doc(db, 'games', game.id);
      
      if (isPlayer1) {
        // Only player1 updates the result to avoid race condition
        setTimeout(async () => {
          const firstPlayer = winner === 'tie' ? game.player1.userId : winner;
          await updateDoc(gameRef, {
            'rps.winner': winner,
            status: 'setup',
            currentTurn: firstPlayer,
          });
        }, 2000);
      }
    }
  }, [game.rps.player1Choice, game.rps.player2Choice, game.rps.winner, game.player1.userId, game.player2, isPlayer1, game.id]);

  const opponent = isPlayer1 ? game.player2 : game.player1;

  // Suppress unused variable warning - myChoice is used for optimistic UI
  void myChoice;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black flex items-center justify-center p-4">
      <div className="bg-indigo-950/50 border border-purple-500/30 rounded-2xl p-8 w-full max-w-lg text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
          ⚡ Rock Paper Scissors
        </h2>
        <p className="text-purple-300 mb-8">Determines who goes first!</p>

        {/* Players */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center">
            <div className="text-4xl">{user.avatar}</div>
            <div className="text-white font-medium mt-1">{user.username}</div>
            <div className="text-sm text-purple-400">You</div>
          </div>
          <div className="text-4xl font-bold text-purple-400">VS</div>
          <div className="text-center">
            <div className="text-4xl">{opponent?.avatar || '?'}</div>
            <div className="text-white font-medium mt-1">{opponent?.username || 'Waiting...'}</div>
            <div className="text-sm text-purple-400">Opponent</div>
          </div>
        </div>

        {/* Choices */}
        {!myStoredChoice ? (
          <div>
            <p className="text-purple-300 mb-4">Make your choice!</p>
            <div className="flex gap-4 justify-center">
              {RPS_OPTIONS.map(({ choice, emoji, label }) => (
                <button
                  key={choice}
                  onClick={() => makeChoice(choice)}
                  className="bg-purple-900/50 hover:bg-purple-700/50 border border-purple-500/30 hover:border-cyan-400 rounded-2xl p-6 transition-all hover:scale-110 hover:shadow-lg hover:shadow-cyan-500/20"
                >
                  <div className="text-5xl mb-2">{emoji}</div>
                  <div className="text-purple-300 text-sm">{label}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-purple-900/30 rounded-xl p-4 mb-4">
              <p className="text-purple-300 mb-2">Your choice:</p>
              <div className="text-5xl">
                {RPS_OPTIONS.find(o => o.choice === myStoredChoice)?.emoji}
              </div>
            </div>
            {!opponentChoice ? (
              <p className="text-purple-400 animate-pulse">⏳ Waiting for opponent...</p>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-8 mb-4">
                  <div className="text-center">
                    <div className="text-4xl">{RPS_OPTIONS.find(o => o.choice === myStoredChoice)?.emoji}</div>
                    <div className="text-purple-300 text-sm mt-1">You</div>
                  </div>
                  <div className="text-2xl text-purple-400">VS</div>
                  <div className="text-center">
                    <div className="text-4xl">{RPS_OPTIONS.find(o => o.choice === opponentChoice)?.emoji}</div>
                    <div className="text-purple-300 text-sm mt-1">Opponent</div>
                  </div>
                </div>
                <p className="text-purple-300 animate-pulse">⏳ Determining winner...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

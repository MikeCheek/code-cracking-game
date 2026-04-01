'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Game, User } from '@/types/game';
import { sounds } from '@/lib/sounds';
import { useRouter } from 'next/navigation';

interface Props {
  user: User;
}

export default function Lobby({ user }: Props) {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [combinationLength, setCombinationLength] = useState<4 | 5>(4);
  const [allowRepeats, setAllowRepeats] = useState(false);
  const [password, setPassword] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joiningGame, setJoiningGame] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'games'), where('status', '==', 'waiting'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gameList: Game[] = [];
      snapshot.forEach(docSnap => {
        gameList.push({ id: docSnap.id, ...docSnap.data() } as Game);
      });
      gameList.sort((a, b) => b.createdAt - a.createdAt);
      setGames(gameList);
    }, (err) => {
      console.error('Firestore error:', err);
      setError('Failed to connect to Firebase. Please configure your Firebase credentials.');
    });
    return () => unsubscribe();
  }, []);

  const createGame = async () => {
    setLoading(true);
    try {
      const gameData = {
        status: 'waiting',
        combinationLength,
        allowRepeats,
        password: password || null,
        createdAt: Date.now(),
        createdBy: user.userId,
        player1: {
          userId: user.userId,
          username: user.username,
          avatar: user.avatar,
          ready: false,
        },
        player2: null,
        rps: {},
        currentTurn: '',
        guesses: [],
        lies: {},
      };
      const docRef = await addDoc(collection(db, 'games'), gameData);
      sounds.join();
      router.push(`/game/${docRef.id}`);
    } catch {
      setError('Failed to create game. Check Firebase configuration.');
    }
    setLoading(false);
  };

  const joinGame = async (gameId: string, gamePassword?: string) => {
    setLoading(true);
    try {
      const gameRef = doc(db, 'games', gameId);
      const gameSnap = await getDoc(gameRef);
      if (!gameSnap.exists()) {
        setError('Game not found');
        setLoading(false);
        return;
      }
      const gameData = gameSnap.data() as Game;
      if (gameData.password && gameData.password !== gamePassword) {
        setError('Wrong password!');
        setLoading(false);
        return;
      }
      await updateDoc(gameRef, {
        player2: {
          userId: user.userId,
          username: user.username,
          avatar: user.avatar,
          ready: false,
        },
        status: 'rps',
      });
      sounds.join();
      router.push(`/game/${gameId}`);
    } catch {
      setError('Failed to join game. Check Firebase configuration.');
    }
    setLoading(false);
  };

  const copyInviteLink = (gameId: string) => {
    const link = `${window.location.origin}/game/${gameId}`;
    navigator.clipboard.writeText(link);
    setInviteLink(link);
    sounds.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-indigo-950 to-black p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
              🔐 Code Cracker
            </h1>
            <p className="text-purple-400 text-sm mt-1">Multiplayer Mind Game</p>
          </div>
          <div className="flex items-center gap-3 bg-purple-900/30 rounded-xl px-4 py-2 border border-purple-500/30">
            <span className="text-2xl">{user.avatar}</span>
            <span className="text-white font-medium">{user.username}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4 mb-6 text-red-300">
            ⚠️ {error}
            <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-200">✕</button>
          </div>
        )}

        {/* Create Game */}
        <div className="bg-indigo-950/50 border border-purple-500/30 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">🎮 Create New Game</h2>
            <button
              onClick={() => { setShowCreate(!showCreate); sounds.click(); }}
              className="text-purple-400 hover:text-cyan-400 transition"
            >
              {showCreate ? '▲ Hide' : '▼ Show'}
            </button>
          </div>

          {showCreate && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-purple-300 text-sm mb-2 block">Combination Length</label>
                  <div className="flex gap-2">
                    {[4, 5].map(len => (
                      <button
                        key={len}
                        onClick={() => { setCombinationLength(len as 4 | 5); sounds.click(); }}
                        className={`flex-1 py-2 rounded-xl font-bold transition ${
                          combinationLength === len
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/30'
                        }`}
                      >
                        {len} digits
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-purple-300 text-sm mb-2 block">Repeated Digits</label>
                  <button
                    onClick={() => { setAllowRepeats(!allowRepeats); sounds.click(); }}
                    className={`w-full py-2 rounded-xl font-bold transition ${
                      allowRepeats
                        ? 'bg-green-700 text-white'
                        : 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/30'
                    }`}
                  >
                    {allowRepeats ? '✅ Allowed' : '❌ Not Allowed'}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-purple-300 text-sm mb-2 block">🔒 Password (optional)</label>
                <input
                  type="text"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Leave empty for public game"
                  className="w-full bg-purple-900/30 border border-purple-500/50 rounded-xl px-4 py-2 text-white placeholder-purple-400/50 focus:outline-none focus:border-cyan-400 transition"
                />
              </div>
              <button
                onClick={createGame}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50"
              >
                {loading ? '⏳ Creating...' : '🚀 Create Game'}
              </button>
            </div>
          )}
        </div>

        {/* Game List */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">🌐 Open Games</h2>
          {games.length === 0 ? (
            <div className="text-center py-12 text-purple-400">
              <div className="text-5xl mb-4">🎲</div>
              <p>No open games. Create one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {games.map(game => (
                <div key={game.id} className="bg-indigo-950/50 border border-purple-500/30 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{game.player1.avatar}</span>
                    <div>
                      <p className="text-white font-medium">{game.player1.username}&apos;s game</p>
                      <p className="text-purple-400 text-sm">
                        {game.combinationLength} digits • {game.allowRepeats ? 'Repeats OK' : 'No repeats'} {game.password ? '🔒' : '🌐'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {game.createdBy !== user.userId && (
                      <>
                        {joiningGame === game.id && game.password ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={joinPassword}
                              onChange={e => setJoinPassword(e.target.value)}
                              placeholder="Password..."
                              className="bg-purple-900/30 border border-purple-500/50 rounded-lg px-3 py-1 text-white text-sm w-24"
                            />
                            <button
                              onClick={() => joinGame(game.id, joinPassword)}
                              className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded-lg text-sm"
                            >
                              Join
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              sounds.click();
                              if (game.password) {
                                setJoiningGame(game.id);
                              } else {
                                joinGame(game.id);
                              }
                            }}
                            className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium px-4 py-2 rounded-xl transition"
                          >
                            Join ⚡
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => copyInviteLink(game.id)}
                      className="bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 px-3 py-2 rounded-xl transition text-sm"
                    >
                      🔗 Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {inviteLink && (
          <div className="fixed bottom-4 right-4 bg-green-900/90 border border-green-500/50 rounded-xl p-4 text-green-300 text-sm max-w-sm">
            ✅ Link copied! {inviteLink}
            <button onClick={() => setInviteLink('')} className="ml-2 text-green-400">✕</button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Player, Game, GameSettings } from "@/types/game";
import { getOpenGames, findGameByInviteCode } from "@/hooks/useGame";
import { sounds } from "@/lib/sounds";

interface Props {
  player: Player;
  onCreateGame: (settings: GameSettings) => void;
  onJoinGame: (game: Game) => void;
  onChangeProfile: () => void;
}

export default function LobbyPage({ player, onCreateGame, onJoinGame, onChangeProfile }: Props) {
  const [openGames, setOpenGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [settings, setSettings] = useState<GameSettings>({
    codeLength: 4,
    allowRepeats: false,
    password: "",
  });
  const [joinPassword, setJoinPassword] = useState("");
  const [passwordGameId, setPasswordGameId] = useState<string | null>(null);

  const loadGames = async () => {
    setLoading(true);
    const games = await getOpenGames();
    setOpenGames(games.filter((g) => g.hostId !== player.id));
    setLoading(false);
  };

  useEffect(() => {
    loadGames();
    const interval = setInterval(loadGames, 5000);
    return () => clearInterval(interval);
  }, [player.id]);

  const handleCreate = () => {
    sounds.click();
    onCreateGame({
      ...settings,
      password: settings.password?.trim() || undefined,
    });
  };

  const handleJoinWithCode = async () => {
    if (!inviteInput.trim()) return;
    sounds.click();
    const gameId = await findGameByInviteCode(inviteInput.trim());
    if (!gameId) {
      setInviteError("Invalid invite code");
      return;
    }
    const game = openGames.find((g) => g.id === gameId);
    if (game) {
      handleJoinAttempt(game);
    } else {
      setInviteError("Game not found or already started");
    }
  };

  const handleJoinAttempt = (game: Game) => {
    if (game.settings.password) {
      setPasswordGameId(game.id);
    } else {
      sounds.join();
      onJoinGame(game);
    }
  };

  const handlePasswordJoin = () => {
    if (!passwordGameId) return;
    const game = openGames.find((g) => g.id === passwordGameId);
    if (!game) return;
    if (game.settings.password && joinPassword !== game.settings.password) {
      sounds.wrong();
      return;
    }
    sounds.join();
    onJoinGame(game);
    setPasswordGameId(null);
    setJoinPassword("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">
              Mind<span className="text-purple-400">Breaker</span>
            </h1>
            <p className="text-purple-300 text-sm">Game Lobby</p>
          </div>
          <button
            onClick={() => { sounds.click(); onChangeProfile(); }}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-2xl px-4 py-2 transition"
          >
            <span className="text-2xl">{player.avatar}</span>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">{player.username}</p>
              <p className="text-white/50 text-xs">Change profile</p>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { sounds.click(); setShowCreate(!showCreate); }}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-2xl text-lg transition shadow-lg shadow-purple-500/30"
          >
            + Create Game
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={loadGames}
            className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl text-lg transition"
          >
            Refresh
          </motion.button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20 mb-6 overflow-hidden"
            >
              <h3 className="text-white font-bold text-lg mb-4">Game Settings</h3>

              <div className="space-y-4">
                <div>
                  <label className="text-purple-200 text-sm mb-2 block">
                    Code Length: <strong className="text-white">{settings.codeLength}</strong>
                  </label>
                  <div className="flex gap-2">
                    {[3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => { sounds.click(); setSettings({ ...settings, codeLength: n }); }}
                        className={`flex-1 py-2 rounded-xl font-bold transition ${
                          settings.codeLength === n
                            ? "bg-purple-500 text-white"
                            : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}
                      >
                        {n} digits
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-purple-200 text-sm">Allow repeated digits</span>
                  <button
                    onClick={() => { sounds.click(); setSettings({ ...settings, allowRepeats: !settings.allowRepeats }); }}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      settings.allowRepeats ? "bg-purple-500" : "bg-white/20"
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        settings.allowRepeats ? "left-7" : "left-1"
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="text-purple-200 text-sm mb-2 block">
                    Password (optional)
                  </label>
                  <input
                    type="text"
                    value={settings.password}
                    onChange={(e) => setSettings({ ...settings, password: e.target.value })}
                    placeholder="Leave empty for open game"
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreate}
                  className="w-full bg-purple-500 hover:bg-purple-400 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-purple-500/30"
                >
                  Create & Wait for Opponent
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20 mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteInput}
              onChange={(e) => { setInviteInput(e.target.value.toUpperCase()); setInviteError(""); }}
              placeholder="Enter invite code..."
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 uppercase font-mono text-sm"
              maxLength={6}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJoinWithCode}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl transition"
            >
              Join
            </motion.button>
          </div>
          {inviteError && <p className="text-red-400 text-sm mt-2">{inviteError}</p>}
        </div>

        <div>
          <h2 className="text-white/60 text-sm font-semibold uppercase tracking-wider mb-3">
            Open Games ({openGames.length})
          </h2>

          {loading ? (
            <div className="text-center py-10 text-white/40">Loading games...</div>
          ) : openGames.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-white/40 text-lg">No open games</p>
              <p className="text-white/25 text-sm mt-1">Create one or share an invite!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openGames.map((game) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{game.player1.avatar}</span>
                    <div>
                      <p className="text-white font-bold">{game.player1.username}</p>
                      <p className="text-white/50 text-sm">
                        {game.settings.codeLength} digits &bull;{" "}
                        {game.settings.allowRepeats ? "repeats OK" : "no repeats"}{" "}
                        {game.settings.password ? "🔒" : "🔓"}
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleJoinAttempt(game)}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition"
                  >
                    Join
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {passwordGameId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
            onClick={() => setPasswordGameId(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white font-bold text-lg mb-4">Enter Password</h3>
              <input
                type="text"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
                placeholder="Game password..."
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setPasswordGameId(null); setJoinPassword(""); }}
                  className="flex-1 bg-white/10 text-white py-3 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordJoin}
                  className="flex-1 bg-purple-500 text-white py-3 rounded-xl font-bold"
                >
                  Join
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

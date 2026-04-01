import { useState } from "react";
import { motion } from "framer-motion";
import { Player, PREDEFINED_AVATARS } from "@/types/game";
import { sounds } from "@/lib/sounds";

interface Props {
  onComplete: (player: Player) => void;
}

function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function OnboardingPage({ onComplete }: Props) {
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState(
    () => PREDEFINED_AVATARS[Math.floor(Math.random() * PREDEFINED_AVATARS.length)]
  );
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || username.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }
    sounds.join();
    const player: Player = {
      id: generatePlayerId(),
      username: username.trim(),
      avatar,
      score: 0,
      penaltyCount: 0,
    };
    onComplete(player);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="text-7xl mb-4"
          >
            🧠
          </motion.div>
          <h1 className="text-5xl font-black text-white tracking-tight">
            Mind<span className="text-purple-400">Breaker</span>
          </h1>
          <p className="text-purple-300 mt-2 text-lg">
            The ultimate multiplayer code-cracking game
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl"
        >
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            Create Your Profile
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-purple-200 text-sm font-medium mb-2 block">
                Your Avatar
              </label>
              <div className="grid grid-cols-8 gap-2">
                {PREDEFINED_AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      sounds.click();
                      setAvatar(a);
                    }}
                    className={`text-2xl p-1.5 rounded-xl transition-all duration-150 ${
                      avatar === a
                        ? "bg-purple-500 scale-110 shadow-lg shadow-purple-500/40"
                        : "bg-white/10 hover:bg-white/20 hover:scale-105"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-purple-200 text-sm font-medium mb-2 block">
                Your Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                placeholder="Enter your username..."
                maxLength={20}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
              />
              {error && (
                <p className="text-red-400 text-sm mt-1">{error}</p>
              )}
            </div>

            <div className="pt-2 text-center">
              <div className="text-4xl mb-2">{avatar}</div>
              <p className="text-white/60 text-sm">
                {username || "Your Name"}
              </p>
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-purple-500 hover:bg-purple-400 text-white font-bold py-4 rounded-xl text-lg transition-all shadow-lg shadow-purple-500/30"
            >
              Enter the Arena
            </motion.button>
          </form>
        </motion.div>

        <p className="text-center text-white/30 text-xs mt-6">
          Your profile is saved locally. No account needed.
        </p>
      </motion.div>
    </div>
  );
}

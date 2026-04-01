import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Game, Player } from "@/types/game";
import { sounds } from "@/lib/sounds";

interface Props {
  game: Game;
  player: Player;
  onCancel: () => void;
}

export default function WaitingPage({ game, player, onCancel }: Props) {
  const [copied, setCopied] = useState(false);
  const inviteLink = `${window.location.origin}?invite=${game.inviteCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      sounds.click();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(game.inviteCode).then(() => {
      sounds.click();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-7xl mb-6"
        >
          ⏳
        </motion.div>

        <h2 className="text-3xl font-black text-white mb-2">Waiting for Opponent</h2>
        <p className="text-purple-300 mb-8">Share your invite so someone can join!</p>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20 mb-6">
          <p className="text-white/50 text-sm mb-2">Invite Code</p>
          <div className="text-5xl font-black text-purple-300 font-mono tracking-widest mb-4">
            {game.inviteCode}
          </div>
          <button
            onClick={copyCode}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-2 rounded-xl text-sm transition mr-2"
          >
            Copy Code
          </button>
          <button
            onClick={copyLink}
            className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2 rounded-xl text-sm transition"
          >
            Copy Link
          </button>
          {copied && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-green-400 text-sm mt-3"
            >
              Copied!
            </motion.p>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20 mb-6 text-left">
          <h3 className="text-white/60 text-xs uppercase tracking-wider mb-3">Game Settings</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">Code Length</span>
              <span className="text-white font-bold">{game.settings.codeLength} digits</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">Repeated Digits</span>
              <span className="text-white font-bold">{game.settings.allowRepeats ? "Allowed" : "Not Allowed"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60 text-sm">Password</span>
              <span className="text-white font-bold">{game.settings.password ? "Yes 🔒" : "None"}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

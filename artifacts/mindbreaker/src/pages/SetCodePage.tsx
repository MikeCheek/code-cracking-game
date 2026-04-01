import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Game, Player } from "@/types/game";
import { useGame } from "@/hooks/useGame";
import { sounds } from "@/lib/sounds";

interface Props {
  game: Game;
  player: Player;
}

export default function SetCodePage({ game, player }: Props) {
  const { submitCode, amPlayer1 } = useGame(game.id, player.id);
  const [code, setCode] = useState<(number | null)[]>(
    Array(game.settings.codeLength).fill(null)
  );
  const [submitted, setSubmitted] = useState(false);

  const isGoingFirst = game.currentTurn === player.id;
  const myCodeSet = amPlayer1 ? game.player1CodeSet : game.player2CodeSet;
  const opponentCodeSet = amPlayer1 ? game.player2CodeSet : game.player1CodeSet;

  const handleDigit = (digit: number) => {
    if (submitted) return;
    sounds.digitPress();

    const nextEmpty = code.findIndex((d) => d === null);
    if (nextEmpty === -1) return;

    if (!game.settings.allowRepeats && code.includes(digit)) {
      sounds.wrong();
      return;
    }

    const newCode = [...code];
    newCode[nextEmpty] = digit;
    setCode(newCode);
  };

  const handleDelete = () => {
    if (submitted) return;
    const lastFilled = [...code].reverse().findIndex((d) => d !== null);
    if (lastFilled === -1) return;
    sounds.click();
    const idx = code.length - 1 - lastFilled;
    const newCode = [...code];
    newCode[idx] = null;
    setCode(newCode);
  };

  const handleSubmit = async () => {
    if (code.some((d) => d === null)) return;
    sounds.submit();
    setSubmitted(true);
    await submitCode(code as number[]);
  };

  if (myCodeSet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="text-7xl mb-4">🔒</div>
          <h2 className="text-3xl font-black text-white mb-2">Code Locked!</h2>
          <p className="text-purple-300 mb-4">Your code is set and secret.</p>
          {!opponentCodeSet ? (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-white/50"
            >
              Waiting for opponent to set their code...
            </motion.div>
          ) : (
            <p className="text-green-400">Both codes set! Starting game...</p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🔐</div>
          <h2 className="text-3xl font-black text-white mb-1">Set Your Code</h2>
          <p className="text-purple-300 text-sm">
            {game.settings.codeLength} digit{game.settings.codeLength > 1 ? "s" : ""},{" "}
            {game.settings.allowRepeats ? "repeats allowed" : "no repeats"}.{" "}
            Keep it secret!
          </p>
          {isGoingFirst && (
            <div className="mt-2 inline-block bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-xs px-3 py-1 rounded-full">
              You go first after this!
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-center mb-8">
          {code.map((digit, i) => (
            <motion.div
              key={i}
              animate={digit !== null ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.15 }}
              className={`w-14 h-16 rounded-2xl flex items-center justify-center text-3xl font-black border-2 transition-all ${
                digit !== null
                  ? "border-purple-500 bg-purple-500/20 text-white"
                  : "border-white/20 bg-white/5 text-white/20"
              }`}
            >
              {digit !== null ? digit : "?"}
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <motion.button
              key={d}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleDigit(d)}
              className="bg-white/10 hover:bg-white/20 text-white text-2xl font-bold py-4 rounded-2xl transition"
            >
              {d}
            </motion.button>
          ))}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDelete}
            className="bg-white/10 hover:bg-red-500/20 text-white text-xl font-bold py-4 rounded-2xl transition"
          >
            ⌫
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleDigit(0)}
            className="bg-white/10 hover:bg-white/20 text-white text-2xl font-bold py-4 rounded-2xl transition"
          >
            0
          </motion.button>
          <div />
        </div>

        <motion.button
          whileHover={code.every((d) => d !== null) ? { scale: 1.02 } : {}}
          whileTap={code.every((d) => d !== null) ? { scale: 0.98 } : {}}
          onClick={handleSubmit}
          disabled={code.some((d) => d === null) || submitted}
          className={`w-full font-bold py-4 rounded-2xl text-lg transition ${
            code.every((d) => d !== null) && !submitted
              ? "bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/30"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          {submitted ? "Locking..." : "Lock My Code"}
        </motion.button>
      </div>
    </div>
  );
}

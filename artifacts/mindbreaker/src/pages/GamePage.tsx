import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Game, Player, GuessEntry } from "@/types/game";
import { useGame } from "@/hooks/useGame";
import { sounds } from "@/lib/sounds";

interface Props {
  game: Game;
  player: Player;
}

function DigitDot({ value, type }: { value: number; type: "exact" | "misplaced" | "none" }) {
  return (
    <div
      className={`w-2.5 h-2.5 rounded-full ${
        type === "exact"
          ? "bg-green-400"
          : type === "misplaced"
          ? "bg-yellow-400"
          : "bg-white/20"
      }`}
    />
  );
}

function GuessRow({ entry, myPlayerId, onChallenge, codeLength }: {
  entry: GuessEntry;
  myPlayerId: string;
  onChallenge?: (index: number) => void;
  codeLength: number;
  index: number;
}) {
  const isMyGuess = entry.playerId === myPlayerId;

  return (
    <motion.div
      initial={{ opacity: 0, x: isMyGuess ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-2xl ${
        isMyGuess ? "bg-purple-500/20 border border-purple-500/30" : "bg-white/5 border border-white/10"
      }`}
    >
      <div className="flex gap-1.5">
        {entry.guess.map((d, i) => (
          <div
            key={i}
            className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white font-bold text-base"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="flex-1 flex gap-2 justify-center flex-wrap">
        <span className="text-green-400 text-sm font-bold">
          {entry.response.exact} ✓
        </span>
        <span className="text-yellow-400 text-sm font-bold">
          {entry.response.misplaced} ~
        </span>
      </div>
      {!isMyGuess && onChallenge && (
        <button
          onClick={onChallenge as any}
          className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded-lg px-2 py-1 hover:bg-red-500/10 transition"
        >
          🚨
        </button>
      )}
    </motion.div>
  );
}

export default function GamePage({ game, player }: Props) {
  const { submitGuess, challengeLie, isMyTurn, amPlayer1, opponent, me, mySecret } = useGame(game.id, player.id);
  const [guess, setGuess] = useState<(number | null)[]>(
    Array(game.settings.codeLength).fill(null)
  );
  const [submitting, setSubmitting] = useState(false);
  const [challengeResult, setChallengeResult] = useState<{ idx: number; caught: boolean } | null>(null);

  const myGuesses = game.guesses?.filter((g) => g.playerId === player.id) ?? [];
  const opponentGuesses = game.guesses?.filter((g) => g.playerId !== player.id) ?? [];

  const prevTurn = (game as any)._prevTurn;
  useEffect(() => {
    if (isMyTurn && !submitting) {
      sounds.notification();
    }
  }, [isMyTurn]);

  const handleDigit = (digit: number) => {
    if (!isMyTurn || submitting) return;
    sounds.digitPress();
    const nextEmpty = guess.findIndex((d) => d === null);
    if (nextEmpty === -1) return;
    if (!game.settings.allowRepeats && guess.includes(digit)) {
      sounds.wrong();
      return;
    }
    const newGuess = [...guess];
    newGuess[nextEmpty] = digit;
    setGuess(newGuess);
  };

  const handleDelete = () => {
    if (!isMyTurn || submitting) return;
    const lastFilled = [...guess].reverse().findIndex((d) => d !== null);
    if (lastFilled === -1) return;
    sounds.click();
    const idx = guess.length - 1 - lastFilled;
    const newGuess = [...guess];
    newGuess[idx] = null;
    setGuess(newGuess);
  };

  const handleSubmit = async () => {
    if (guess.some((d) => d === null) || !isMyTurn || submitting) return;
    sounds.submit();
    setSubmitting(true);
    await submitGuess(guess as number[]);
    setGuess(Array(game.settings.codeLength).fill(null));
    setSubmitting(false);
  };

  const handleChallenge = async (guessIndex: number) => {
    sounds.click();
    const caught = await challengeLie(guessIndex);
    setChallengeResult({ idx: guessIndex, caught });
    if (caught) {
      sounds.penalize();
    } else {
      sounds.wrong();
    }
    setTimeout(() => setChallengeResult(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{player.avatar}</span>
            <div>
              <p className="text-white font-bold text-sm">{player.username}</p>
              {(me?.penaltyCount ?? 0) > 0 && (
                <p className="text-red-400 text-xs">⚠️ {me?.penaltyCount} penalt{(me?.penaltyCount ?? 0) === 1 ? "y" : "ies"}</p>
              )}
            </div>
          </div>

          <div className="text-center">
            <div
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                isMyTurn
                  ? "bg-green-500/20 border border-green-500/40 text-green-300"
                  : "bg-white/10 border border-white/20 text-white/50"
              }`}
            >
              {isMyTurn ? "YOUR TURN" : "WAITING..."}
            </div>
          </div>

          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="text-white font-bold text-sm">{opponent?.username}</p>
              {(opponent?.penaltyCount ?? 0) > 0 && (
                <p className="text-red-400 text-xs">{opponent?.penaltyCount} penalt{(opponent?.penaltyCount ?? 0) === 1 ? "y" : "ies"} ⚠️</p>
              )}
            </div>
            <span className="text-2xl">{opponent?.avatar}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Your guesses</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {myGuesses.length === 0 ? (
                <p className="text-white/20 text-sm">No guesses yet</p>
              ) : (
                myGuesses.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-2"
                  >
                    <div className="flex gap-1 mb-1">
                      {entry.guess.map((d, j) => (
                        <div key={j} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-green-400 text-xs">{entry.response.exact} ✓</span>
                      <span className="text-yellow-400 text-xs">{entry.response.misplaced} ~</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Their guesses</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {opponentGuesses.length === 0 ? (
                <p className="text-white/20 text-sm">No guesses yet</p>
              ) : (
                opponentGuesses.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-2"
                  >
                    <div className="flex gap-1 mb-1">
                      {entry.guess.map((d, j) => (
                        <div key={j} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white font-bold text-sm">
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex gap-2">
                        <span className="text-green-400 text-xs">{entry.response.exact} ✓</span>
                        <span className="text-yellow-400 text-xs">{entry.response.misplaced} ~</span>
                      </div>
                      {mySecret && (
                        <button
                          onClick={() => handleChallenge(game.guesses.indexOf(entry))}
                          className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded px-1.5 py-0.5 hover:bg-red-500/10 transition"
                          title="Challenge this response as a lie"
                        >
                          🚨
                        </button>
                      )}
                    </div>
                    {challengeResult?.idx === game.guesses.indexOf(entry) && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`text-xs mt-1 font-bold ${challengeResult.caught ? "text-green-400" : "text-red-400"}`}
                      >
                        {challengeResult.caught ? "Caught lying! +1 penalty to them!" : "Not a lie! +1 penalty to you!"}
                      </motion.p>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {isMyTurn && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20"
          >
            <p className="text-white/60 text-xs text-center mb-3">Guess their code</p>

            <div className="flex gap-2 justify-center mb-4">
              {guess.map((digit, i) => (
                <motion.div
                  key={i}
                  animate={digit !== null ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.12 }}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black border-2 transition-all ${
                    digit !== null
                      ? "border-purple-500 bg-purple-500/20 text-white"
                      : "border-white/20 bg-white/5 text-white/20"
                  }`}
                >
                  {digit !== null ? digit : "_"}
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-5 gap-2 mb-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => (
                <motion.button
                  key={d}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDigit(d)}
                  className="bg-white/10 hover:bg-white/20 text-white text-lg font-bold py-3 rounded-xl transition"
                >
                  {d}
                </motion.button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="flex-1 bg-white/10 hover:bg-red-500/20 text-white font-bold py-3 rounded-xl transition"
              >
                ⌫ Delete
              </button>
              <motion.button
                whileHover={guess.every((d) => d !== null) ? { scale: 1.02 } : {}}
                whileTap={guess.every((d) => d !== null) ? { scale: 0.98 } : {}}
                onClick={handleSubmit}
                disabled={guess.some((d) => d === null) || submitting}
                className={`flex-1 font-bold py-3 rounded-xl transition ${
                  guess.every((d) => d !== null) && !submitting
                    ? "bg-purple-500 hover:bg-purple-400 text-white"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                }`}
              >
                {submitting ? "..." : "Guess!"}
              </motion.button>
            </div>
          </motion.div>
        )}

        {!isMyTurn && (
          <div className="text-center py-4">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-white/50 text-lg"
            >
              {opponent?.username} is thinking...
            </motion.div>
          </div>
        )}

        <div className="mt-4 text-center">
          <p className="text-white/30 text-xs">
            Tap 🚨 on opponent's guess to challenge if you think they lied (3 penalties = game over)
          </p>
        </div>
      </div>
    </div>
  );
}

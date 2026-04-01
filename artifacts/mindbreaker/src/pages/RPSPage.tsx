import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Game, Player, RPSChoice } from "@/types/game";
import { useGame } from "@/hooks/useGame";
import { sounds } from "@/lib/sounds";
import { update, ref } from "firebase/database";
import { db } from "@/lib/firebase";

const RPS_EMOJIS: Record<RPSChoice, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

const BEATS: Record<RPSChoice, RPSChoice> = {
  rock: "scissors",
  scissors: "paper",
  paper: "rock",
};

interface Props {
  game: Game;
  player: Player;
}

export default function RPSPage({ game, player }: Props) {
  const { submitRPS, amPlayer1 } = useGame(game.id, player.id);
  const [selected, setSelected] = useState<RPSChoice | null>(null);
  const [resolving, setResolving] = useState(false);

  const myChoice = amPlayer1 ? game.rps?.player1Choice : game.rps?.player2Choice;
  const opponentChoice = amPlayer1 ? game.rps?.player2Choice : game.rps?.player1Choice;

  useEffect(() => {
    if (game.rps?.player1Choice && game.rps?.player2Choice && !resolving) {
      setResolving(true);
      sounds.rps();

      const p1 = game.rps.player1Choice;
      const p2 = game.rps.player2Choice;

      const winner =
        p1 === p2 ? null : BEATS[p1] === p2 ? game.player1.id : game.player2!.id;

      setTimeout(async () => {
        if (!winner) {
          await update(ref(db, `games/${game.id}`), {
            "rps/player1Choice": null,
            "rps/player2Choice": null,
            "rps/ties": (game.rps?.ties ?? 0) + 1,
            updatedAt: Date.now(),
          });
          setSelected(null);
          setResolving(false);
        } else {
          await update(ref(db, `games/${game.id}`), {
            "rps/winner": winner,
            currentTurn: winner,
            phase: "set_code",
            updatedAt: Date.now(),
          });
        }
      }, 1500);
    }
  }, [game.rps?.player1Choice, game.rps?.player2Choice]);

  const handleSelect = async (choice: RPSChoice) => {
    if (myChoice || selected) return;
    sounds.rps();
    setSelected(choice);
    await submitRPS(choice);
  };

  const opponent = amPlayer1 ? game.player2 : game.player1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <h2 className="text-3xl font-black text-white mb-2">Rock Paper Scissors</h2>
        <p className="text-purple-300 mb-2">Winner goes first!</p>
        {(game.rps?.ties ?? 0) > 0 && (
          <p className="text-yellow-400 text-sm mb-4">
            {game.rps?.ties} tie{(game.rps?.ties ?? 0) > 1 ? "s" : ""} — keep going!
          </p>
        )}

        <div className="flex items-center justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-3xl mb-1">{player.avatar}</div>
            <div className="text-white/60 text-xs">{player.username}</div>
            <div className="text-4xl mt-2">
              {myChoice ? RPS_EMOJIS[myChoice] : selected ? "🤔" : "?"}
            </div>
          </div>
          <div className="text-white/30 text-2xl font-black">VS</div>
          <div className="text-center">
            <div className="text-3xl mb-1">{opponent?.avatar}</div>
            <div className="text-white/60 text-xs">{opponent?.username}</div>
            <div className="text-4xl mt-2">
              {opponentChoice ? RPS_EMOJIS[opponentChoice] : "?"}
            </div>
          </div>
        </div>

        {!myChoice && (
          <div className="space-y-3">
            <p className="text-white/60 text-sm mb-4">Choose your move</p>
            <div className="flex gap-4 justify-center">
              {(["rock", "paper", "scissors"] as RPSChoice[]).map((choice) => (
                <motion.button
                  key={choice}
                  whileHover={{ scale: 1.1, y: -4 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSelect(choice)}
                  disabled={!!selected}
                  className={`bg-white/10 hover:bg-white/20 rounded-2xl p-5 transition ${
                    selected === choice ? "bg-purple-500 scale-110" : ""
                  }`}
                >
                  <div className="text-5xl">{RPS_EMOJIS[choice]}</div>
                  <div className="text-white/60 text-xs mt-1 capitalize">{choice}</div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {myChoice && !opponentChoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-white/50 text-lg"
            >
              Waiting for {opponent?.username}...
            </motion.div>
          </motion.div>
        )}

        {resolving && myChoice && opponentChoice && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            {myChoice === opponentChoice ? (
              <p className="text-yellow-400 text-2xl font-bold">Tie! Play again!</p>
            ) : (
              <p className="text-white text-xl">Deciding...</p>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

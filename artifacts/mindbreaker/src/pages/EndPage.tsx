import { useEffect } from "react";
import { motion } from "framer-motion";
import { Game, Player } from "@/types/game";
import { sounds } from "@/lib/sounds";

interface Props {
  game: Game;
  player: Player;
  onPlayAgain: () => void;
  onGoLobby: () => void;
}

export default function EndPage({ game, player, onPlayAgain, onGoLobby }: Props) {
  const won = game.winner === player.id;

  useEffect(() => {
    if (won) {
      sounds.win();
    } else {
      sounds.lose();
    }
  }, []);

  const opponent = game.hostId === player.id ? game.player2 : game.player1;
  const endReason = (game as any).endReason;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-full max-w-md text-center"
      >
        <motion.div
          animate={won ? {
            rotate: [0, -10, 10, -10, 10, 0],
            scale: [1, 1.2, 1.2, 1.2, 1.2, 1],
          } : { scale: [1, 0.9, 1] }}
          transition={{ duration: 0.8 }}
          className="text-8xl mb-6"
        >
          {won ? "🏆" : "💔"}
        </motion.div>

        <h1 className={`text-5xl font-black mb-2 ${won ? "text-yellow-400" : "text-red-400"}`}>
          {won ? "You Win!" : "You Lose!"}
        </h1>

        {endReason === "lie_penalty" && (
          <p className="text-orange-400 text-lg mb-3">
            {won ? `${opponent?.username} got caught lying 3 times!` : "You got caught lying 3 times!"}
          </p>
        )}

        <div className="bg-white/10 backdrop-blur rounded-2xl p-5 border border-white/20 mb-6 mt-4">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-3xl mb-1">{player.avatar}</div>
              <p className="text-white font-bold text-sm">{player.username}</p>
              <p className="text-white/50 text-xs">
                {game.guesses?.filter((g) => g.playerId === player.id).length ?? 0} guesses
              </p>
              <p className="text-white/50 text-xs">
                {(game.hostId === player.id ? game.player1 : game.player2)?.penaltyCount ?? 0} penalties
              </p>
            </div>
            <div className="text-white/30 text-2xl font-black">VS</div>
            <div className="text-center">
              <div className="text-3xl mb-1">{opponent?.avatar}</div>
              <p className="text-white font-bold text-sm">{opponent?.username}</p>
              <p className="text-white/50 text-xs">
                {game.guesses?.filter((g) => g.playerId !== player.id).length ?? 0} guesses
              </p>
              <p className="text-white/50 text-xs">
                {opponent?.penaltyCount ?? 0} penalties
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onGoLobby}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl transition"
          >
            Lobby
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onPlayAgain}
            className="flex-1 bg-purple-500 hover:bg-purple-400 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-purple-500/30"
          >
            Play Again
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Player, Game, GameSettings } from "@/types/game";
import { useGame, findGameByInviteCode, getOpenGames } from "@/hooks/useGame";
import { ref, onValue, get } from "firebase/database";
import { db } from "@/lib/firebase";
import OnboardingPage from "@/pages/OnboardingPage";
import LobbyPage from "@/pages/LobbyPage";
import WaitingPage from "@/pages/WaitingPage";
import RPSPage from "@/pages/RPSPage";
import SetCodePage from "@/pages/SetCodePage";
import GamePage from "@/pages/GamePage";
import EndPage from "@/pages/EndPage";
import { sounds } from "@/lib/sounds";

const queryClient = new QueryClient();

const PLAYER_KEY = "codecracker_player";
const GAME_KEY = "codecracker_current_game";

function AppContent() {
  const [player, setPlayer] = useState<Player | null>(() => {
    try {
      const stored = localStorage.getItem(PLAYER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [gameId, setGameId] = useState<string | null>(() => {
    return localStorage.getItem(GAME_KEY);
  });

  const { game, createGame, joinGame } = useGame(gameId, player?.id ?? null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get("invite");
    if (invite && player) {
      handleInviteJoin(invite);
    }
  }, [player]);

  const handleInviteJoin = async (code: string) => {
    const id = await findGameByInviteCode(code);
    if (!id) return;
    const snap = await get(ref(db, `games/${id}`));
    if (!snap.exists()) return;
    const foundGame = snap.val() as Game;
    if (foundGame.phase !== "setup" || foundGame.guestId) return;
    await handleJoinGame(foundGame);
    window.history.replaceState({}, "", window.location.pathname);
  };

  const savePlayer = (p: Player) => {
    setPlayer(p);
    localStorage.setItem(PLAYER_KEY, JSON.stringify(p));
  };

  const saveGameId = (id: string | null) => {
    setGameId(id);
    if (id) {
      localStorage.setItem(GAME_KEY, id);
    } else {
      localStorage.removeItem(GAME_KEY);
    }
  };

  const handleCreateGame = async (settings: GameSettings) => {
    if (!player) return;
    const id = await createGame(player, settings);
    saveGameId(id);
  };

  const handleJoinGame = async (gameToJoin: Game) => {
    if (!player) return;
    await joinGame(gameToJoin, player);
    saveGameId(gameToJoin.id);
  };

  const handleLeaveGame = () => {
    saveGameId(null);
  };

  const handlePlayAgain = () => {
    saveGameId(null);
  };

  const handleChangeProfile = () => {
    savePlayer(null as any);
    localStorage.removeItem(PLAYER_KEY);
    setPlayer(null);
  };

  if (!player) {
    return (
      <OnboardingPage
        onComplete={(p) => {
          savePlayer(p);
        }}
      />
    );
  }

  if (!gameId || !game) {
    return (
      <LobbyPage
        player={player}
        onCreateGame={handleCreateGame}
        onJoinGame={handleJoinGame}
        onChangeProfile={handleChangeProfile}
      />
    );
  }

  if (game.phase === "setup" && !game.guestId) {
    return (
      <WaitingPage
        game={game}
        player={player}
        onCancel={handleLeaveGame}
      />
    );
  }

  if (game.phase === "rps") {
    return <RPSPage game={game} player={player} />;
  }

  if (game.phase === "set_code") {
    return <SetCodePage game={game} player={player} />;
  }

  if (game.phase === "playing") {
    return <GamePage game={game} player={player} />;
  }

  if (game.phase === "ended") {
    return (
      <EndPage
        game={game}
        player={player}
        onPlayAgain={handlePlayAgain}
        onGoLobby={handleLeaveGame}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
      Loading...
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

import { useState, useEffect, useCallback } from "react";
import { ref, set, get, onValue, update, push, serverTimestamp } from "firebase/database";
import { db } from "@/lib/firebase";
import { Game, GameSettings, Player, GuessEntry, RPSChoice } from "@/types/game";
import { evaluateGuess, detectLie } from "@/lib/gameLogic";

function generateInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function useGame(gameId: string | null, playerId: string | null) {
  const [game, setGame] = useState<Game | null>(null);
  const [mySecret, setMySecret] = useState<number[] | null>(() => {
    if (!gameId) return null;
    try {
      const stored = localStorage.getItem(`secret_${gameId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!gameId) return;
    const gameRef = ref(db, `games/${gameId}`);
    const unsub = onValue(gameRef, (snap) => {
      if (snap.exists()) {
        setGame(snap.val() as Game);
      } else {
        setGame(null);
      }
    });
    return () => unsub();
  }, [gameId]);

  const saveMySecret = useCallback((secret: number[]) => {
    if (!gameId) return;
    setMySecret(secret);
    localStorage.setItem(`secret_${gameId}`, JSON.stringify(secret));
  }, [gameId]);

  const createGame = useCallback(async (host: Player, settings: GameSettings): Promise<string> => {
    const id = push(ref(db, "games")).key!;
    const inviteCode = generateInviteCode();
    const newGame: Game = {
      id,
      hostId: host.id,
      player1: host,
      phase: "setup",
      settings,
      guesses: [],
      player1CodeSet: false,
      player2CodeSet: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      inviteCode,
    };
    await set(ref(db, `games/${id}`), newGame);
    await set(ref(db, `inviteCodes/${inviteCode}`), id);
    return id;
  }, []);

  const joinGame = useCallback(async (game: Game, guest: Player): Promise<void> => {
    await update(ref(db, `games/${game.id}`), {
      guestId: guest.id,
      player2: guest,
      phase: "rps",
      updatedAt: Date.now(),
    });
  }, []);

  const submitRPS = useCallback(async (choice: RPSChoice): Promise<void> => {
    if (!game || !playerId) return;
    const isPlayer1 = game.hostId === playerId;
    const field = isPlayer1 ? "rps/player1Choice" : "rps/player2Choice";
    await update(ref(db, `games/${game.id}`), {
      [field]: choice,
      updatedAt: Date.now(),
    });
  }, [game, playerId]);

  const resolveRPS = useCallback(async (): Promise<void> => {
    if (!game?.rps?.player1Choice || !game?.rps?.player2Choice) return;

    const p1 = game.rps.player1Choice;
    const p2 = game.rps.player2Choice;

    const beats: Record<RPSChoice, RPSChoice> = {
      rock: "scissors",
      scissors: "paper",
      paper: "rock",
    };

    let winner: string | undefined;
    let ties = (game.rps.ties ?? 0);

    if (p1 === p2) {
      ties++;
      await update(ref(db, `games/${game.id}`), {
        "rps/player1Choice": null,
        "rps/player2Choice": null,
        "rps/ties": ties,
        updatedAt: Date.now(),
      });
    } else {
      winner = beats[p1] === p2 ? game.player1.id : game.player2!.id;
      await update(ref(db, `games/${game.id}`), {
        "rps/winner": winner,
        currentTurn: winner,
        phase: "set_code",
        updatedAt: Date.now(),
      });
    }
  }, [game]);

  const submitCode = useCallback(async (code: number[]): Promise<void> => {
    if (!game || !playerId) return;
    saveMySecret(code);
    const isPlayer1 = game.hostId === playerId;
    const field = isPlayer1 ? "player1CodeSet" : "player2CodeSet";
    const updates: Record<string, any> = {
      [field]: true,
      updatedAt: Date.now(),
    };
    const otherField = isPlayer1 ? "player2CodeSet" : "player1CodeSet";
    if (game[otherField as keyof Game]) {
      updates.phase = "playing";
    }
    await update(ref(db, `games/${game.id}`), updates);
  }, [game, playerId, saveMySecret]);

  const submitGuess = useCallback(async (guess: number[]): Promise<void> => {
    if (!game || !playerId) return;

    const opponentId = game.hostId === playerId ? game.guestId! : game.hostId;
    const isPlayer1 = game.hostId === opponentId;

    const secretKey = `secret_${game.id}`;
    const opponentSecretStr = localStorage.getItem(secretKey);

    const opponentSecret: number[] = opponentSecretStr
      ? JSON.parse(opponentSecretStr)
      : [];

    const response = opponentSecret.length
      ? evaluateGuess(opponentSecret, guess)
      : { exact: 0, misplaced: 0 };

    const entry: GuessEntry = {
      guess,
      response,
      timestamp: Date.now(),
      playerId,
    };

    const currentGuesses: GuessEntry[] = game.guesses || [];
    const updatedGuesses = [...currentGuesses, entry];

    const updates: Record<string, any> = {
      guesses: updatedGuesses,
      currentTurn: opponentId,
      updatedAt: Date.now(),
    };

    if (response.exact === game.settings.codeLength) {
      updates.winner = playerId;
      updates.phase = "ended";
    }

    await update(ref(db, `games/${game.id}`), updates);
  }, [game, playerId]);

  const challengeLie = useCallback(async (guessIndex: number): Promise<boolean> => {
    if (!game || !playerId || !mySecret) return false;

    const entry = game.guesses[guessIndex];
    if (!entry) return false;

    const isLiar = detectLie(entry.guess, entry.response, mySecret);

    if (isLiar) {
      const opponentId = entry.playerId;
      const isOpponentPlayer1 = game.hostId === opponentId;
      const penaltyField = isOpponentPlayer1 ? "player1/penaltyCount" : "player2/penaltyCount";
      const currentPenalties = isOpponentPlayer1
        ? (game.player1?.penaltyCount ?? 0)
        : (game.player2?.penaltyCount ?? 0);

      const updates: Record<string, any> = {
        [penaltyField]: currentPenalties + 1,
        updatedAt: Date.now(),
      };

      if (currentPenalties + 1 >= 3) {
        updates.winner = playerId;
        updates.phase = "ended";
        updates.endReason = "lie_penalty";
      }

      await update(ref(db, `games/${game.id}`), updates);
      return true;
    }

    const myPenaltyField = game.hostId === playerId ? "player1/penaltyCount" : "player2/penaltyCount";
    const myPenalties = game.hostId === playerId
      ? (game.player1?.penaltyCount ?? 0)
      : (game.player2?.penaltyCount ?? 0);

    await update(ref(db, `games/${game.id}`), {
      [myPenaltyField]: myPenalties + 1,
      updatedAt: Date.now(),
    });

    return false;
  }, [game, playerId, mySecret]);

  const isMyTurn = game?.currentTurn === playerId;
  const amPlayer1 = game?.hostId === playerId;
  const opponent = amPlayer1 ? game?.player2 : game?.player1;
  const me = amPlayer1 ? game?.player1 : game?.player2;

  return {
    game,
    mySecret,
    saveMySecret,
    createGame,
    joinGame,
    submitRPS,
    resolveRPS,
    submitCode,
    submitGuess,
    challengeLie,
    isMyTurn,
    amPlayer1,
    opponent,
    me,
  };
}

export async function findGameByInviteCode(code: string): Promise<string | null> {
  const snap = await get(ref(db, `inviteCodes/${code.toUpperCase()}`));
  return snap.exists() ? snap.val() : null;
}

export async function getOpenGames(): Promise<Game[]> {
  const snap = await get(ref(db, "games"));
  if (!snap.exists()) return [];
  const all = Object.values(snap.val() as Record<string, Game>);
  return all
    .filter((g) => g.phase === "setup" && !g.guestId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);
}

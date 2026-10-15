import { useEffect, useMemo, useRef, useState } from "react";
import { GameShell as PlatformShell, GameThemeToggle, GameTopbar, GameAuth, Leaderboard, useLeaderboard } from "@freegamestore/games";
import { Board } from "./components/Board";
import { COMMON_URL, VALIDATION_URL, loadWordlist } from "./words/wordlist";
import { PACKS, dailyLevel, packLevel, utcDateKey } from "./game/crossword/levels";
import { isSolved, restoreSession, toRecord, type Session } from "./game/session";
import { loadProgress, nextProgress, saveProgress, type Progress } from "./game/progress";
import { dailyScore, loadSaves, saveSaves, type SavedLevels } from "./game/saves";

/** The game's id on the leaderboard service. */
const LEADERBOARD_GAME = "crossweave";

interface Dictionaries {
  common: Set<string>;
  validation: Set<string>;
}

function formatTime(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * The game's frame: the platform shell, the topbar, and the current level. There are two
 * modes: the levels in order, and today's daily puzzle, which is timed and submitted to the
 * leaderboard. Each level's progress is saved as the player goes.
 */
export default function GameShell() {
  const [mode, setMode] = useState<"levels" | "daily">("levels");
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [saves, setSaves] = useState<SavedLevels>(loadSaves);
  const [dictionaries, setDictionaries] = useState<Dictionaries | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { topScores, recentScores, loading, submitScore } = useLeaderboard(LEADERBOARD_GAME);
  // The daily puzzle is fixed for the UTC day the page was opened on.
  const [today] = useState(() => utcDateKey(new Date()));
  const submitting = useRef(false);

  useEffect(() => {
    Promise.all([loadWordlist(COMMON_URL), loadWordlist(VALIDATION_URL)])
      .then(([common, validation]) => setDictionaries({ common, validation }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load words"));
  }, []);

  useEffect(() => saveProgress(progress), [progress]);
  useEffect(() => saveSaves(saves), [saves]);

  const common = dictionaries?.common;
  const level = useMemo(() => {
    if (!common) return null;
    if (mode === "daily") return dailyLevel(new Date(`${today}T00:00:00Z`), common);
    return packLevel(progress.pack, progress.level, common);
  }, [common, mode, progress, today]);
  const session = level ? restoreSession(level, saves.levels[level.id]) : null;
  const daily = level && mode === "daily" ? saves.daily[level.id] : undefined;

  // A daily time is submitted once. If the service rejects it, the time stays saved, and the
  // next visit tries again. A rejection is not shown to the player.
  useEffect(() => {
    if (!level || mode !== "daily" || daily?.solvedMs === undefined || daily.submitted) return;
    if (submitting.current) return;
    submitting.current = true;
    const id = level.id;
    const solvedMs = daily.solvedMs;
    void submitScore(dailyScore(solvedMs))
      .then((result) => {
        if (result.ok) {
          setSaves((s) => ({ ...s, daily: { ...s.daily, [id]: { ...s.daily[id]!, submitted: true } } }));
        }
      })
      .finally(() => {
        submitting.current = false;
      });
    // Depends on the callback, not the hook's object, which is new on every render.
  }, [level, mode, daily, submitScore]);

  const onSession = (next: Session) => {
    if (!level || !session) return;
    const solved = isSolved(next);
    let dailySaves = saves.daily;
    if (mode === "daily" && solved && daily?.solvedMs === undefined) {
      const startedAt = daily?.startedAt ?? Date.now();
      dailySaves = { ...saves.daily, [level.id]: { startedAt, solvedMs: Date.now() - startedAt, submitted: false } };
    }
    setSaves({
      levels: { ...saves.levels, [level.id]: { ...toRecord(next), solved } },
      daily: dailySaves,
    });
  };

  const chooseMode = (next: "levels" | "daily") => {
    if (next === "daily" && level) {
      const dailyId = `daily:${today}`;
      if (!saves.daily[dailyId]) {
        setSaves((s) => ({ ...s, daily: { ...s.daily, [dailyId]: { startedAt: Date.now() } } }));
      }
    }
    setMode(next);
  };

  const next = mode === "levels" ? nextProgress(progress) : null;
  const pack = PACKS[progress.pack]!;

  const topbar = (
    <GameTopbar
      title="Crossweave"
      actions={<GameThemeToggle />}
      stats={
        session && level
          ? [
              { label: mode === "daily" ? "Daily" : "Level", value: mode === "daily" ? today : `${pack.name} ${progress.level + 1}` },
              { label: "Found", value: `${session.found.size}/${level.placements.length}`, accent: true },
            ]
          : undefined
      }
    />
  );

  return (
    <PlatformShell topbar={topbar}>
      <GameAuth />
      <div className="play-area">
        <div className="mode-bar" role="group" aria-label="Game mode">
          <button type="button" aria-pressed={mode === "levels"} onClick={() => chooseMode("levels")}>
            Levels
          </button>
          <button type="button" aria-pressed={mode === "daily"} onClick={() => chooseMode("daily")}>
            Daily
          </button>
        </div>
        {error && <p className="notice">Could not load words: {error}</p>}
        {!error && !level && <p className="notice">Loading words…</p>}
        {level && dictionaries && session && (
          <Board
            key={level.id}
            level={level}
            session={session}
            validWords={dictionaries.validation}
            onSession={onSession}
            onNext={next ? () => setProgress(next) : null}
            footer={
              mode === "daily" && daily?.solvedMs !== undefined ? (
                <div className="daily-result">
                  <p>Daily time {formatTime(daily.solvedMs)}</p>
                  <Leaderboard
                    topScores={topScores.slice(0, 5)}
                    recentScores={recentScores}
                    loading={loading}
                  />
                </div>
              ) : undefined
            }
          />
        )}
        <footer className="credits">
          <span>
            Words: <a href="/wordlists/LICENSE" target="_blank" rel="noopener">SCOWL / ESDB</a> by Kevin Atkinson
          </span>
          <a href="https://freegamestore.online" target="_blank" rel="noopener">
            Built for freegamestore.online
          </a>
        </footer>
      </div>
    </PlatformShell>
  );
}

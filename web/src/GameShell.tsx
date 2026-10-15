import { useEffect, useMemo, useState } from "react";
import { GameShell as PlatformShell, GameThemeToggle, GameTopbar, GameAuth } from "@freegamestore/games";
import { Board } from "./components/Board";
import { COMMON_URL, VALIDATION_URL, loadWordlist } from "./words/wordlist";
import { PACKS, packLevel } from "./game/crossword/levels";
import { newSession, type Session } from "./game/session";
import { loadProgress, nextProgress, saveProgress, type Progress } from "./game/progress";

interface Dictionaries {
  common: Set<string>;
  validation: Set<string>;
}

/**
 * The game's frame: the platform shell, the topbar, and the current level. The level is
 * built from the common words, and any valid word is accepted from the validation list.
 * Progress is saved, and each level's session is kept while the page is open.
 */
export default function GameShell() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [dictionaries, setDictionaries] = useState<Dictionaries | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Record<string, Session>>({});

  useEffect(() => {
    Promise.all([loadWordlist(COMMON_URL), loadWordlist(VALIDATION_URL)])
      .then(([common, validation]) => setDictionaries({ common, validation }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load words"));
  }, []);

  useEffect(() => saveProgress(progress), [progress]);

  const level = useMemo(
    () => (dictionaries ? packLevel(progress.pack, progress.level, dictionaries.common) : null),
    [dictionaries, progress],
  );
  const next = nextProgress(progress);
  const pack = PACKS[progress.pack]!;
  const session = level ? (sessions[level.id] ?? newSession(level)) : null;

  const topbar = (
    <GameTopbar
      title="Crossweave"
      actions={<GameThemeToggle />}
      stats={
        session && level
          ? [
              { label: "Level", value: `${pack.name} ${progress.level + 1}` },
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
        {error && <p className="notice">Could not load words: {error}</p>}
        {!error && !level && <p className="notice">Loading words…</p>}
        {level && dictionaries && session && (
          <Board
            key={level.id}
            level={level}
            session={session}
            validWords={dictionaries.validation}
            onSession={(s) => setSessions((all) => ({ ...all, [level.id]: s }))}
            onNext={next ? () => setProgress(next) : null}
          />
        )}
      </div>
    </PlatformShell>
  );
}

import { GameShell as PlatformShell, GameThemeToggle, GameTopbar, GameAuth } from "@freegamestore/games";
import { ParticleLayer } from "./feel";

/**
 * The game's frame: the platform shell with its theme toggle, and the board area.
 * The board is a placeholder until the game lands.
 */
export default function GameShell() {
  return (
    <PlatformShell topbar={<GameTopbar title="Crossweave" score={0} actions={<GameThemeToggle />} />}>
      <GameAuth />
      <div className="relative flex flex-col items-center justify-center h-full min-h-0 gap-4 p-3 overflow-hidden">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
          Crossweave
        </h1>
        <p style={{ color: "var(--muted)" }}>Your game will appear here once it&rsquo;s built.</p>
        <ParticleLayer />
      </div>
    </PlatformShell>
  );
}

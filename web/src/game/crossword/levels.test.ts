import { describe, expect, it } from "vitest";
import { dailyLevel, utcDateKey } from "./levels";
import { loadCommon } from "./helpers";

const dictionary = loadCommon();

describe("daily puzzle", () => {
  it("keys the date in UTC", () => {
    expect(utcDateKey(new Date("2026-10-16T00:00:00Z"))).toBe("2026-10-16");
    expect(utcDateKey(new Date("2026-10-16T23:59:59.999Z"))).toBe("2026-10-16");
    expect(utcDateKey(new Date("2026-10-17T00:00:00Z"))).toBe("2026-10-17");
  });

  it("is stable for a given UTC date", () => {
    const morning = dailyLevel(new Date("2026-10-16T00:00:00Z"), dictionary);
    const night = dailyLevel(new Date("2026-10-16T23:59:59.999Z"), dictionary);
    expect(night).toEqual(morning);
  });

  it("changes from one UTC date to the next", () => {
    const today = dailyLevel(new Date("2026-10-16T12:00:00Z"), dictionary);
    const tomorrow = dailyLevel(new Date("2026-10-17T12:00:00Z"), dictionary);
    expect(tomorrow.id).not.toBe(today.id);
    expect(tomorrow.letters + JSON.stringify(tomorrow.placements)).not.toBe(
      today.letters + JSON.stringify(today.placements),
    );
  });
});

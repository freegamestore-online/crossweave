import { describe, expect, it } from "vitest";
import { isFormable, solve } from "./solver";

describe("isFormable", () => {
  it("uses each letter at most once", () => {
    expect(isFormable("tea", "tale")).toBe(true);
    expect(isFormable("tee", "tale")).toBe(false);
  });
});

describe("solve", () => {
  const dictionary = ["tea", "late", "teal", "ate", "tall", "cat", "zebra"];

  it("finds every dictionary word that the letters spell, shortest first", () => {
    expect(solve("tale", dictionary)).toEqual(["ate", "tea", "late", "teal"]);
  });

  it("ignores words shorter than three letters or longer than the wheel", () => {
    expect(solve("tea", ["at", "tea", "teal"])).toEqual(["tea"]);
  });
});

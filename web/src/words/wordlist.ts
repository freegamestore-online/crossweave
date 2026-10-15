import blocklist from "./offensive.txt?raw";

/** Public URLs of the shipped lists, built by scripts/build-wordlists.mjs. */
export const VALIDATION_URL = "/wordlists/validation.txt";
export const COMMON_URL = "/wordlists/common.txt";

/** A playable word: lowercase letters only, at least three long. */
export const WORD_PATTERN = /^[a-z]{3,}$/;

/**
 * Reads a list file: one word per line, with "#" comment lines. Case is kept, so a
 * proper noun such as "Aaron" is not turned into a playable word by WORD_PATTERN.
 */
export function parseWordlist(text: string): Set<string> {
  const words = new Set<string>();
  for (const line of text.split("\n")) {
    const word = line.trim();
    if (word === "" || word.startsWith("#")) continue;
    words.add(word);
  }
  return words;
}

/** Every blocklisted word, lowercase. */
export const OFFENSIVE_WORDS: ReadonlySet<string> = parseWordlist(blocklist);

export function isOffensive(word: string): boolean {
  return OFFENSIVE_WORDS.has(word.toLowerCase());
}

/** Keeps the playable words and drops the offensive ones. */
export function buildWordlist(text: string): Set<string> {
  const words = new Set<string>();
  for (const word of parseWordlist(text)) {
    if (WORD_PATTERN.test(word) && !isOffensive(word)) words.add(word);
  }
  return words;
}

export async function loadWordlist(url: string): Promise<Set<string>> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url}: HTTP ${res.status}`);
  return buildWordlist(await res.text());
}

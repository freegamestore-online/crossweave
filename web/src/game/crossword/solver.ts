/** Shortest word the game accepts. */
export const MIN_WORD_LENGTH = 3;

/** True when the word can be spelled from the letters, each letter used at most once. */
export function isFormable(word: string, letters: string): boolean {
  const spare = [...letters];
  for (const ch of word) {
    const i = spare.indexOf(ch);
    if (i < 0) return false;
    spare.splice(i, 1);
  }
  return true;
}

/** Every dictionary word that can be spelled from the letters, shortest first. */
export function solve(letters: string, dictionary: Iterable<string>): string[] {
  const found: string[] = [];
  for (const word of dictionary) {
    if (word.length >= MIN_WORD_LENGTH && word.length <= letters.length && isFormable(word, letters)) {
      found.push(word);
    }
  }
  return found.sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
}

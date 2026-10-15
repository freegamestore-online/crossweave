// Builds public/wordlists/ from SCOWL (https://github.com/en-wl/wordlist).
//
//   node scripts/build-wordlists.mjs <dir> <Copyright>
//
// <dir> holds the output of `./mk-list en 35 > en-35.txt` and `./mk-list en 50 > en-50.txt`,
// run in a built SCOWL checkout. <Copyright> is that checkout's Copyright file, copied
// verbatim into the shipped LICENSE. The filter rules match src/words/wordlist.ts.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WORD_PATTERN = /^[a-z]{3,}$/;
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "wordlists");
const [sourceDir, copyrightPath] = process.argv.slice(2);
if (!sourceDir || !copyrightPath) {
  console.error("usage: node scripts/build-wordlists.mjs <dir with en-35.txt and en-50.txt> <Copyright>");
  process.exit(1);
}

function words(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
}

const offensive = new Set(
  words(readFileSync(join(here, "..", "src", "words", "offensive.txt"), "utf8")),
);
const keep = (word) => WORD_PATTERN.test(word) && !offensive.has(word);

// SCOWL size 50 is the full validation list. Size 35 is its most common tier, which
// becomes the common-words subset. Both are filtered the same way, and the common
// tier is intersected with the validation list so it is always a subset of it.
const validation = [...new Set(words(readFileSync(join(sourceDir, "en-50.txt"), "utf8")).filter(keep))].sort();
const validSet = new Set(validation);
const common = [...new Set(words(readFileSync(join(sourceDir, "en-35.txt"), "utf8")).filter(keep))]
  .filter((word) => validSet.has(word))
  .sort();

const license = `The word lists in this directory are derived from SCOWL / ESDB, the
English Speller Database by Kevin Atkinson (https://github.com/en-wl/wordlist),
built from commit 1e5b7d3a72f47a71da5d28686c1dd4b397178485 with mk-list:

  mk-list en 50  ->  validation.txt   (before filtering)
  mk-list en 35  ->  common.txt       (before filtering)

Filtering applied: lowercase letters only (proper nouns dropped), at least three letters, and no
word in src/words/offensive.txt. Otherwise the words are unchanged.

The licence is the ESDB Copyright notice, reproduced verbatim below. It is
permissive (MIT-like): copy, modify and distribute, with the notices kept.
Sections are included in full because the permission depends on which parts
of the data a list uses. The UKACD notice applies to lists larger than 80,
and these lists are sizes 35 and 50; the AU notice covers Australian content.

Outcome of licence review (platform issue #273): accepted for use in this game,
with the notices kept here. One point is open: ESDB's Copyright says some data
comes from COCA under a licence that limits its use. Size tiers are influenced by
that data, so this should be reviewed by the maintainer before the list is
used in any other project.

================================================================================

`;
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "validation.txt"), `${validation.join("\n")}\n`);
writeFileSync(join(outDir, "common.txt"), `${common.join("\n")}\n`);
writeFileSync(join(outDir, "LICENSE"), license + readFileSync(copyrightPath, "utf8"));
console.log(`validation: ${validation.length} words, common: ${common.length} words`);

# Vocabulary data sources

`../bulk-vocab.json` (the file the seed script actually loads) is generated from the two CSVs
in this folder by `build-bulk-vocab.py`. The 160 hand-curated "story chapter" words (with
definitions, examples and Vietnamese translations) live directly in `../../seed.ts` and are
excluded here via `curated_headwords.txt` so the two sets never collide.

## Sources

- **`cefrj-vocabulary-profile-1.5.csv`** — [CEFR-J Vocabulary Profile v1.5](https://github.com/openlanguageprofiles/olp-en-cefrj/blob/master/cefrj-vocabulary-profile-1.5.csv),
  compiled by Yukio Tono, Tokyo University of Foreign Studies. Used for the B1 and B2 word
  lists, including its `CoreInventory 1` topic column (used to name chapters). Free for
  research and commercial use with attribution.
- **`octanove-vocabulary-profile-c1c2-1.0.csv`** — [Octanove Vocabulary Profile C1/C2 v1.0](https://github.com/openlanguageprofiles/olp-en-cefrj/blob/master/octanove-vocabulary-profile-c1c2-1.0.csv),
  Octanove Labs. Used for the C1 and C2 word lists (no topic column, so those chapters are
  alphabetical "Set N" chunks instead). Licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Only `cefr-j.org`/Octanove's own words and CEFR levels are used — definitions, examples and IPA
are *not* bundled upfront for these bulk words (the source datasets don't include them); the
app fetches a definition from a free dictionary API the first time a learner opens that word's
flashcard, then caches it (see `VocabService.enrichWord`).

## Regenerating `bulk-vocab.json`

```bash
# 1. Refresh the curated-word exclusion list from the current seed.ts:
grep -oP '(?<=headword: ")[^"]+' ../../seed.ts | sort -u > curated_headwords.txt

# 2. Re-run the generator (stdlib-only, no dependencies):
python3 build-bulk-vocab.py

# 3. Move the result back into place:
mv bulk-vocab.json ../bulk-vocab.json
```

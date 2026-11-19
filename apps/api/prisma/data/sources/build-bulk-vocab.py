import csv
import json
import re
from collections import defaultdict

CURATED = set()
with open("curated_headwords.txt") as f:
    for line in f:
        CURATED.add(line.strip().lower())

VALID_RE = re.compile(r"^[a-zA-Z][a-zA-Z' -]*$")


def load_level(level, infile, level_col="CEFR", with_category=True):
    seen = {}
    with open(infile) as f:
        r = csv.DictReader(f)
        for row in r:
            if row[level_col] != level:
                continue
            hw = row["headword"]
            if "/" in hw or not VALID_RE.match(hw):
                continue
            key = hw.lower()
            if key in CURATED:
                continue
            if key in seen:
                # Prefer the entry that carries a topic category, if any.
                if with_category and row.get("CoreInventory 1") and not seen[key]["category"]:
                    seen[key] = {"headword": hw, "pos": row["pos"], "category": row.get("CoreInventory 1", "")}
                continue
            seen[key] = {
                "headword": hw,
                "pos": row["pos"],
                "category": row.get("CoreInventory 1", "") if with_category else "",
            }
    return list(seen.values())


def chunk(items, size):
    return [items[i : i + size] for i in range(0, len(items), size)]


def build_chapters(words, chunk_size=50):
    """Group by category (if any words carry one), chunk every bucket to <= chunk_size,
    and return an ordered list of (chapter_name, [word, ...])."""
    # The source dataset has a couple of inconsistently-cased category labels
    # (e.g. "Work and Jobs" vs "Work and jobs") — fold those together.
    canonical_category = {}
    by_category = defaultdict(list)
    uncategorized = []
    for w in words:
        if w["category"]:
            key = w["category"].strip().lower()
            canonical_category.setdefault(key, w["category"].strip())
            by_category[canonical_category[key]].append(w)
        else:
            uncategorized.append(w)

    chapters = []
    # Named categories first, biggest first (stable, deterministic order).
    for category, cat_words in sorted(by_category.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        cat_words.sort(key=lambda w: w["headword"].lower())
        parts = chunk(cat_words, chunk_size)
        for i, part in enumerate(parts):
            name = category if len(parts) == 1 else f"{category} (Part {i + 1})"
            chapters.append((name, part))

    # Then the uncategorized pool (or everything, for C1/C2 which has no categories at all).
    uncategorized.sort(key=lambda w: w["headword"].lower())
    label = "Advanced Vocabulary" if not by_category else "General Vocabulary"
    for i, part in enumerate(chunk(uncategorized, chunk_size)):
        chapters.append((f"{label} — Set {i + 1}", part))

    return chapters


LEVELS = [
    ("b1", "cefrj.csv", "B1", True),
    ("b2", "cefrj.csv", "B2", True),
    ("c1", "octanove_c1c2.csv", "C1", False),
    ("c2", "octanove_c1c2.csv", "C2", False),
]

output = {}
summary = []
for level_id, infile, cefr_level, with_category in LEVELS:
    words = load_level(cefr_level, infile, with_category=with_category)
    chapters = build_chapters(words)
    level_items = []
    chapter_order = 4  # 0-3 are the hand-curated story chapters already in seed.ts
    for chapter_name, chapter_words in chapters:
        for word_order, w in enumerate(chapter_words):
            level_items.append(
                {
                    "headword": w["headword"],
                    "partOfSpeech": w["pos"],
                    "chapter": chapter_name,
                    "chapterOrder": chapter_order,
                    "wordOrder": word_order,
                }
            )
        chapter_order += 1
    output[level_id] = level_items
    summary.append((level_id, len(words), len(chapters)))

with open("bulk-vocab.json", "w") as f:
    json.dump(output, f, ensure_ascii=False, indent=0)

for level_id, word_count, chapter_count in summary:
    print(f"{level_id}: {word_count} words in {chapter_count} chapters")

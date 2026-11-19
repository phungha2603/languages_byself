import { Injectable, Logger } from "@nestjs/common";
import type { DictionaryLookupResult, VocabItem } from "@app/shared-types";
import { PrismaService } from "../../prisma/prisma.service";

interface DictionaryApiEntry {
  word: string;
  phonetic?: string;
  phonetics?: { text?: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string }[];
  }[];
}

export interface ProviderWordInfo {
  definitions: string[];
  examples: string[];
  ipa?: string;
  partOfSpeech?: string;
}

/**
 * Free, keyless dictionary lookup backed by dictionaryapi.dev, with a
 * Postgres cache (VocabItem) in front so repeat lookups and curated IELTS
 * word lists don't hit the network at all.
 */
@Injectable()
export class DictionaryService {
  private readonly logger = new Logger(DictionaryService.name);
  private static readonly API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";

  constructor(private readonly prisma: PrismaService) {}

  async lookup(word: string): Promise<DictionaryLookupResult> {
    const normalized = word.trim().toLowerCase();

    const cached = await this.prisma.vocabItem.findMany({
      where: { headword: { equals: normalized, mode: "insensitive" } },
    });
    if (cached.length > 0) {
      return { query: word, found: true, entries: cached.map((c) => this.toVocabItem(c)), source: "cache" };
    }

    const info = await this.fetchFromProvider(normalized);
    if (!info) {
      return { query: word, found: false, entries: [], source: "provider" };
    }

    const row = await this.prisma.vocabItem.create({
      data: {
        headword: normalized,
        ipa: info.ipa,
        partOfSpeech: info.partOfSpeech,
        definitions: info.definitions,
        translations: {},
        examples: info.examples,
      },
    });
    return { query: word, found: true, entries: [this.toVocabItem(row)], source: "provider" };
  }

  /**
   * Raw provider lookup with no caching/persistence — used both by `lookup()` above and by
   * VocabService.enrichWord to fill in a bulk-seeded word's definition the first time someone
   * studies it, without creating a second VocabItem row for the same word.
   */
  async fetchFromProvider(word: string): Promise<ProviderWordInfo | null> {
    const normalized = word.trim().toLowerCase();
    try {
      const response = await fetch(`${DictionaryService.API_BASE}/${encodeURIComponent(normalized)}`);
      if (!response.ok) return null;

      const entries = (await response.json()) as DictionaryApiEntry[];
      if (entries.length === 0) return null;

      const definitions = entries.flatMap((e) => e.meanings.flatMap((m) => m.definitions.map((d) => d.definition)));
      const examples = entries.flatMap((e) =>
        e.meanings.flatMap((m) => m.definitions.map((d) => d.example).filter((ex): ex is string => !!ex)),
      );
      const ipa = entries[0]?.phonetic ?? entries[0]?.phonetics?.find((p) => p.text)?.text;
      const partOfSpeech = entries[0]?.meanings[0]?.partOfSpeech;

      if (definitions.length === 0) return null;
      return { definitions, examples, ipa, partOfSpeech };
    } catch (err) {
      this.logger.warn(`Dictionary lookup failed for "${word}": ${(err as Error).message}`);
      return null;
    }
  }

  private toVocabItem(row: {
    id: string;
    headword: string;
    ipa: string | null;
    partOfSpeech: string | null;
    definitions: unknown;
    translations: unknown;
    examples: unknown;
    cefrLevel: string | null;
    audioUrl: string | null;
    chapter: string | null;
    chapterOrder: number;
    wordOrder: number;
    vocabLevelId: string | null;
  }): VocabItem {
    return {
      id: row.id,
      headword: row.headword,
      ipa: row.ipa ?? undefined,
      partOfSpeech: row.partOfSpeech ?? undefined,
      definitions: row.definitions as string[],
      translations: row.translations as Record<string, string>,
      examples: row.examples as string[],
      cefrLevel: (row.cefrLevel ?? undefined) as VocabItem["cefrLevel"],
      audioUrl: row.audioUrl ?? undefined,
      chapter: row.chapter ?? undefined,
      chapterOrder: row.chapterOrder,
      wordOrder: row.wordOrder,
      vocabLevelId: row.vocabLevelId ?? undefined,
    };
  }
}

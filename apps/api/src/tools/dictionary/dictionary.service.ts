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

    try {
      const response = await fetch(`${DictionaryService.API_BASE}/${encodeURIComponent(normalized)}`);
      if (!response.ok) {
        return { query: word, found: false, entries: [], source: "provider" };
      }

      const entries = (await response.json()) as DictionaryApiEntry[];
      const vocabItems = await Promise.all(entries.map((entry) => this.persistFromProvider(entry)));
      return { query: word, found: vocabItems.length > 0, entries: vocabItems, source: "provider" };
    } catch (err) {
      this.logger.warn(`Dictionary lookup failed for "${word}": ${(err as Error).message}`);
      return { query: word, found: false, entries: [], source: "provider" };
    }
  }

  private async persistFromProvider(entry: DictionaryApiEntry): Promise<VocabItem> {
    const definitions = entry.meanings.flatMap((m) => m.definitions.map((d) => d.definition));
    const examples = entry.meanings.flatMap((m) => m.definitions.map((d) => d.example).filter((e): e is string => !!e));
    const ipa = entry.phonetic ?? entry.phonetics?.find((p) => p.text)?.text;
    const partOfSpeech = entry.meanings[0]?.partOfSpeech;

    const row = await this.prisma.vocabItem.create({
      data: {
        headword: entry.word,
        ipa,
        partOfSpeech,
        definitions,
        translations: {},
        examples,
      },
    });

    return this.toVocabItem(row);
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

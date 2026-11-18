import { Injectable, Logger } from "@nestjs/common";
import type { GrammarCheckResult, GrammarIssue, GrammarIssueCategory } from "@app/shared-types";

interface LanguageToolMatch {
  offset: number;
  length: number;
  message: string;
  replacements: { value: string }[];
  rule: { id: string; category: { id: string } };
}

interface LanguageToolResponse {
  matches: LanguageToolMatch[];
}

/**
 * Grammar checking via the free public LanguageTool API (no API key required
 * at low volume). Self-host LanguageTool and point `apiBase` at it if you
 * outgrow the public rate limit — the mapping logic below is unaffected.
 */
@Injectable()
export class GrammarService {
  private readonly logger = new Logger(GrammarService.name);
  private readonly apiBase = process.env.LANGUAGETOOL_API_BASE ?? "https://api.languagetool.org/v2";

  async check(text: string): Promise<GrammarCheckResult> {
    try {
      const response = await fetch(`${this.apiBase}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ text, language: "en-US" }),
      });

      if (!response.ok) {
        this.logger.warn(`LanguageTool returned ${response.status}`);
        return { text, issues: [], provider: "languagetool" };
      }

      const data = (await response.json()) as LanguageToolResponse;
      const issues: GrammarIssue[] = data.matches.map((match) => ({
        offset: match.offset,
        length: match.length,
        category: this.mapCategory(match.rule.id, match.rule.category.id),
        message: match.message,
        suggestions: match.replacements.map((r) => r.value).slice(0, 5),
      }));

      return { text, issues, provider: "languagetool" };
    } catch (err) {
      this.logger.warn(`Grammar check failed: ${(err as Error).message}`);
      return { text, issues: [], provider: "languagetool" };
    }
  }

  private mapCategory(ruleId: string, categoryId: string): GrammarIssueCategory {
    const id = `${ruleId}_${categoryId}`.toUpperCase();
    if (id.includes("VERB") || id.includes("TENSE")) return "verb_tense";
    if (id.includes("AGREEMENT")) return "subject_verb_agreement";
    if (id.includes("_A_VS_AN") || id.includes("ARTICLE")) return "article_usage";
    if (id.includes("PREPOSITION")) return "preposition";
    if (id.includes("WORD_ORDER")) return "word_order";
    if (categoryId === "PUNCTUATION" || categoryId === "CASING") return "punctuation";
    if (categoryId === "TYPOS") return "spelling";
    return "other";
  }
}

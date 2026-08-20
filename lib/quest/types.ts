export type QuestLocale = "en" | "nb";
export type LocalizedText = Readonly<Record<QuestLocale, string>>;
export type QuestChoiceId = "A" | "B" | "C" | "D" | "E";

export interface QuestChoice {
  id: QuestChoiceId;
  score: 0 | 1 | 2 | 3 | 4;
  text: LocalizedText;
}

export interface QuestQuestion {
  id: `Q${number}`;
  order: number;
  prompt: LocalizedText;
  /**
   * Plain-language "What this means" line, shown under the prompt while
   * answering. Clarifies the concept for a novice WITHOUT hinting which
   * answer scores higher. Required on any question using a technical term.
   */
  context?: LocalizedText;
  /**
   * Expandable "Why this matters" deep-dive. Hidden behind a disclosure on
   * the results screen so a curious/expert respondent can inspect the
   * reasoning under the question. Never shown before answering — it would
   * telegraph the scoring ladder.
   */
  why?: LocalizedText;
  /** What the question is actually assessing, shown in results. */
  assesses?: LocalizedText;
  choices: readonly QuestChoice[];
}

export interface QuestSection {
  id: `section-${number}`;
  order: number;
  title: LocalizedText;
  description: LocalizedText;
  questions: readonly QuestQuestion[];
}


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
  context?: LocalizedText;
  choices: readonly QuestChoice[];
}

export interface QuestSection {
  id: `section-${number}`;
  order: number;
  title: LocalizedText;
  description: LocalizedText;
  questions: readonly QuestQuestion[];
}


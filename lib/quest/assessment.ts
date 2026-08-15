import {
  NUTRITION_ASSESSMENT_MAX_SCORE,
  NUTRITION_ASSESSMENT_TOTAL_QUESTIONS,
  NUTRITION_ASSESSMENT_VERSION,
  nutritionAssessmentQuestions,
  nutritionAssessmentSections,
} from "./content";

export type {
  LocalizedText,
  QuestChoice,
  QuestChoiceId,
  QuestLocale,
  QuestQuestion,
  QuestSection,
} from "./types";

/** Stable, config-driven entry point for participant and admin experiences. */
export const QUEST_ASSESSMENT = {
  id: "nutrition-fitness-assessment",
  version: NUTRITION_ASSESSMENT_VERSION,
  sectionCount: 5,
  questionCount: NUTRITION_ASSESSMENT_TOTAL_QUESTIONS,
  maxScore: NUTRITION_ASSESSMENT_MAX_SCORE,
  sections: nutritionAssessmentSections,
  questions: nutritionAssessmentQuestions,
} as const;


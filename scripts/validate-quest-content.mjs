#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const EXPECTED_KEYS = ["A", "B", "C", "D", "E"];
const EXPECTED_SCORES = [0, 1, 2, 3, 4];
const DEFAULT_CANDIDATES = [
  "content/quest/questions.json",
  "content/quest/questions.ts",
  "lib/quest/questions.ts",
  "lib/quest/content.ts",
  "lib/quest/assessment.ts",
  "lib/quest/data.ts",
];

function loadTypeScript(file) {
  const source = fs.readFileSync(file, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = output.diagnostics?.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.equal(errors?.length ?? 0, 0, `TypeScript could not be transpiled: ${file}`);

  const module = { exports: {} };
  const context = vm.createContext({ module, exports: module.exports });
  new vm.Script(output.outputText, { filename: file }).runInContext(context);
  return module.exports;
}

async function loadData(file) {
  if (path.extname(file) === ".json") {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  }
  if (path.extname(file) === ".ts" || path.extname(file) === ".tsx") {
    return loadTypeScript(file);
  }
  return import(`${pathToFileURL(file).href}?validation=${Date.now()}`);
}

function findSections(loaded) {
  const candidates = [
    loaded,
    loaded?.default,
    loaded?.assessment,
    loaded?.assessmentContent,
    loaded?.nutritionAssessment,
    loaded?.nutritionFitnessAssessment,
    loaded?.QUEST_ASSESSMENT,
    loaded?.nutritionAssessmentSections,
    loaded?.sections,
    loaded?.default?.sections,
  ];
  const value = candidates.find(
    (candidate) => Array.isArray(candidate) || Array.isArray(candidate?.sections),
  );
  assert.ok(value, "Could not find a sections array in the questionnaire export");
  // Normalize values loaded from the isolated TypeScript VM into this realm.
  return JSON.parse(JSON.stringify(Array.isArray(value) ? value : value.sections));
}

function answerKey(answer) {
  return answer.key ?? answer.id ?? answer.value;
}

export function calculateScores(sections, selections) {
  const sectionScores = sections.map((section) =>
    section.questions.reduce((sum, question) => {
      const answers = question.answers ?? question.choices;
      const selected = answers.find(
        (answer) => answerKey(answer) === selections[question.id],
      );
      assert.ok(selected, `Missing or invalid selection for ${question.id}`);
      return sum + selected.score;
    }, 0),
  );
  return {
    sectionScores,
    total: sectionScores.reduce((sum, score) => sum + score, 0),
  };
}

export function validateAssessment(sections) {
  assert.equal(sections.length, 5, "Assessment must contain exactly 5 sections");

  const sectionIds = sections.map((section) => section.id);
  assert.equal(new Set(sectionIds).size, 5, "Section IDs must be unique");

  const questions = sections.flatMap((section) => {
    assert.equal(section.questions.length, 5, `${section.id} must contain 5 questions`);
    return section.questions;
  });
  assert.equal(questions.length, 25, "Assessment must contain exactly 25 questions");
  assert.equal(new Set(questions.map((question) => question.id)).size, 25, "Question IDs must be unique");

  for (const question of questions) {
    const answers = question.answers ?? question.choices;
    assert.equal(answers.length, 5, `${question.id} must contain 5 answers`);
    assert.deepEqual(
      answers.map(answerKey),
      EXPECTED_KEYS,
      `${question.id} answer keys must be A-E in order`,
    );
    assert.deepEqual(
      answers.map((answer) => answer.score),
      EXPECTED_SCORES,
      `${question.id} scores must be 0-4 in order`,
    );
  }
  assert.equal(questions.reduce((sum, question) => sum + (question.answers ?? question.choices).length, 0), 125);

  const choose = (key) => Object.fromEntries(questions.map((question) => [question.id, key]));
  assert.deepEqual(calculateScores(sections, choose("A")), {
    sectionScores: [0, 0, 0, 0, 0],
    total: 0,
  });
  assert.deepEqual(calculateScores(sections, choose("E")), {
    sectionScores: [20, 20, 20, 20, 20],
    total: 100,
  });

  const mixed = Object.fromEntries(
    questions.map((question, index) => [question.id, EXPECTED_KEYS[index % 5]]),
  );
  assert.deepEqual(calculateScores(sections, mixed), {
    sectionScores: [10, 10, 10, 10, 10],
    total: 50,
  });
}

async function main() {
  const requested = process.argv[2];
  const relativeFile = requested ?? DEFAULT_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  assert.ok(
    relativeFile,
    `Questionnaire data not found. Pass its path, for example: npm run test:quest-content -- content/quest/questions.json`,
  );
  const file = path.resolve(relativeFile);
  assert.ok(fs.existsSync(file), `Questionnaire data does not exist: ${file}`);
  const loaded = await loadData(file);
  const sections = findSections(loaded);
  validateAssessment(sections);
  console.log(`Quest content valid: 5 sections, 25 questions, 125 choices, scoring 0-100 (${relativeFile})`);
}

main().catch((error) => {
  console.error(`Quest content validation failed: ${error.message}`);
  process.exitCode = 1;
});

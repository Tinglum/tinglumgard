#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_FILES = [
  'content/copy.no.ts',
  'lib/email/lifecycle.ts',
  'lib/email/render.ts',
  'lib/chickens/notifications.ts',
  'app/admin/page.tsx',
  'app/api/admin/customers/email/route.ts',
  'app/api/admin/email/setup/route.ts',
  'components/admin/EmailControlCenter.tsx',
  'components/admin/CustomerDatabase.tsx',
  'components/admin/ChickenOrdersManager.tsx',
  'components/admin/UnifiedEggChickenOrdersManager.tsx',
];

const MARKER_RE = /[\u00c3\u00c2\u00e2\uFFFD]/g;

function decodeLatin1AsUtf8(value) {
  return Buffer.from(value, 'latin1').toString('utf8');
}

function score(value) {
  return (value.match(MARKER_RE) || []).length;
}

function normalizeFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { filePath, changed: false, skipped: true, reason: 'missing' };
  }

  const original = fs.readFileSync(filePath, 'utf8');
  let best = original;
  let bestScore = score(original);

  for (let i = 0; i < 4; i += 1) {
    const candidate = decodeLatin1AsUtf8(best);
    const candidateScore = score(candidate);
    if (candidateScore < bestScore) {
      best = candidate;
      bestScore = candidateScore;
      continue;
    }
    break;
  }

  if (best !== original) {
    fs.writeFileSync(filePath, best, 'utf8');
    return { filePath, changed: true, scoreBefore: score(original), scoreAfter: bestScore };
  }

  return { filePath, changed: false, scoreBefore: bestScore, scoreAfter: bestScore };
}

const files = process.argv.slice(2);
const targets = files.length > 0 ? files : DEFAULT_FILES;

const results = targets.map((target) => normalizeFile(path.normalize(target)));
const changed = results.filter((entry) => entry.changed);
const skipped = results.filter((entry) => entry.skipped);

for (const entry of changed) {
  console.log(`fixed: ${entry.filePath} (${entry.scoreBefore} -> ${entry.scoreAfter})`);
}
for (const entry of skipped) {
  console.log(`skip: ${entry.filePath} (${entry.reason})`);
}

if (changed.length === 0) {
  console.log('No encoding fixes applied.');
}


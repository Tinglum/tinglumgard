#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const INCLUDE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.md']);
const EXCLUDE_DIRS = new Set([
  '.git',
  '.next',
  '.netlify',
  'node_modules',
  'supabase/migrations',
]);
const EXCLUDE_FILES = new Set([
  'lib/utils/text.ts',
  'lib/email/template-lint.ts',
  'scripts/check-encoding.mjs',
  'scripts/repair-encoding.mjs',
]);

// Catch mojibake artifacts (UTF-8 interpreted as latin1/cp1252) and forbidden NO fallbacks.
const BAD_PATTERNS = [
  /(?:Ã¥|Ã¸|Ã¦|Ã…|Ã˜|Ã†|â€“|â€”|â€¢|â€|Â)/u,
  /\uFFFD/u,
  /\b(aapne|apne|ga til|paminnelse|honer|belop|gjenstar|fullfort|forhands|forhaands)\b/i,
  /\b(pa min side|se detaljer pa|se bestillingen pa|se ordren pa)\b/i,
];

function hasBadEncoding(line) {
  return BAD_PATTERNS.some((pattern) => pattern.test(line));
}

function walk(dir, all = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(process.cwd(), full).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(rel) || EXCLUDE_DIRS.has(entry.name)) continue;
      walk(full, all);
      continue;
    }

    if (!INCLUDE_EXTENSIONS.has(path.extname(entry.name))) continue;
    if (EXCLUDE_FILES.has(rel)) continue;
    all.push(rel);
  }
  return all;
}

const files = walk(process.cwd());
const offenders = [];

for (const rel of files) {
  const content = fs.readFileSync(rel, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (hasBadEncoding(line)) {
      offenders.push(`${rel}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (offenders.length > 0) {
  console.error('Encoding guard failed: mojibake/ASCII fallback detected');
  offenders.slice(0, 200).forEach((entry) => console.error(entry));
  if (offenders.length > 200) {
    console.error(`... and ${offenders.length - 200} more`);
  }
  process.exit(1);
}

console.log(`Encoding guard passed. Scanned ${files.length} files.`);

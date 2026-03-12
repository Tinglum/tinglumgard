#!/usr/bin/env node
import fs from 'node:fs';

const file = 'lib/email/lifecycle.ts';
const source = fs.readFileSync(file, 'utf8');

const requiredFlowKeys = [
  'pig.remainder.explainer',
  'pig.remainder.reminder',
  'egg.remainder.reminder',
  'egg.delivery.day_before',
  'egg.hatch.followup',
  'egg.order.forfeited',
  'chicken.ready_for_pickup',
  'chicken.pickup.reminder',
  'chicken.remainder.collected',
];

const requiredTemplateKeys = [
  'pig.remainder.explainer.full',
  'pig.remainder.explainer.reduced',
  'pig.remainder.reminder',
  'egg.remainder.reminder',
  'egg.delivery.day_before',
  'egg.order.shipped.customer',
  'egg.hatch.followup',
  'egg.order.forfeited',
  'chicken.ready_for_pickup',
  'chicken.pickup.reminder',
  'chicken.remainder.collected',
];

const requiredMatrixKeys = [...requiredFlowKeys];

const BAD_ENCODING_PATTERN =
  /(?:ÃƒÂ¥|ÃƒÂ¸|ÃƒÂ¦|Ãƒâ€¦|ÃƒËœ|Ãƒâ€ |Ã¥|Ã¸|Ã¦|Ã…|Ã˜|Ã†|Ã¢â‚¬|Ã¯Â¿Â½|ï¿½)/u;
const ASCII_FALLBACK_PATTERN =
  /\b(aapne|apne|ga til|paminnelse|honer|belop|gjenstar|fullfort|pa min side|se detaljer pa|se bestillingen pa|se ordren pa)\b/i;

function extractQuotedValues(block, fieldName) {
  const regex = new RegExp(`${fieldName}:\\s*'([^']+)'`, 'g');
  const values = new Set();
  let match = regex.exec(block);
  while (match) {
    values.add(match[1]);
    match = regex.exec(block);
  }
  return values;
}

function extractBlock(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Could not locate block: ${startMarker}`);
  }
  return source.slice(start, end);
}

const templateBlock = extractBlock(
  'const LIFECYCLE_TEMPLATE_SEEDS: LifecycleTemplateSeed[] = [',
  'const LIFECYCLE_FLOW_SEEDS: LifecycleFlowSeed[] = ['
);
const flowBlock = extractBlock(
  'const LIFECYCLE_FLOW_SEEDS: LifecycleFlowSeed[] = [',
  'const LIFECYCLE_FLOW_MATRIX: FlowMatrixRow[] = ['
);
const matrixBlock = extractBlock('const LIFECYCLE_FLOW_MATRIX: FlowMatrixRow[] = [', 'function asRecord');

const templateKeys = extractQuotedValues(templateBlock, 'templateKey');
const flowKeys = extractQuotedValues(flowBlock, 'flowKey');
const matrixKeys = extractQuotedValues(matrixBlock, 'flowKey');

const missingFlows = requiredFlowKeys.filter((key) => !flowKeys.has(key));
const missingTemplates = requiredTemplateKeys.filter((key) => !templateKeys.has(key));
const missingMatrixRows = requiredMatrixKeys.filter((key) => !matrixKeys.has(key));

const hasNoNextStep = templateBlock.includes('Hva skjer nå?');
const hasEnNextStep = templateBlock.includes('What happens next?');
const hasBadEncoding = BAD_ENCODING_PATTERN.test(templateBlock) || BAD_ENCODING_PATTERN.test(matrixBlock);
const hasAsciiFallback = ASCII_FALLBACK_PATTERN.test(templateBlock);

if (
  missingFlows.length > 0 ||
  missingTemplates.length > 0 ||
  missingMatrixRows.length > 0 ||
  !hasNoNextStep ||
  !hasEnNextStep ||
  hasBadEncoding ||
  hasAsciiFallback
) {
  console.error('Post-order flow regression check failed.');
  if (missingFlows.length > 0) console.error(`Missing flow keys: ${missingFlows.join(', ')}`);
  if (missingTemplates.length > 0) console.error(`Missing template keys: ${missingTemplates.join(', ')}`);
  if (missingMatrixRows.length > 0) console.error(`Missing flow matrix rows: ${missingMatrixRows.join(', ')}`);
  if (!hasNoNextStep) console.error('NO copy marker "Hva skjer nå?" not found in lifecycle template seeds.');
  if (!hasEnNextStep) console.error('EN copy marker "What happens next?" not found in lifecycle template seeds.');
  if (hasBadEncoding) console.error('Encoding artifacts detected in lifecycle seeds or matrix.');
  if (hasAsciiFallback) console.error('ASCII fallback words detected in lifecycle template seeds.');
  process.exit(1);
}

console.log('Post-order flow regression check passed.');

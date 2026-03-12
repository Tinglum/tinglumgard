const MOJIBAKE_PATTERN =
  /(?:ÃƒÂ¥|ÃƒÂ¸|ÃƒÂ¦|Ãƒâ€¦|ÃƒËœ|Ãƒâ€ |Ã¥|Ã¸|Ã¦|Ã…|Ã˜|Ã†|Ã¢â‚¬â€œ|Ã¢â‚¬â€|Ã¢â‚¬Â¢|Ã¢â‚¬|Ã‚|Ã¯Â¿Â½|ï¿½|Ã¥|Ã¸|Ã¦|Ã…|Ã˜|Ã†)/;
const FORBIDDEN_FALLBACK_NO_PATTERN =
  /\b(aapne|apne|ga til|paminnelse|honer|belop|gjenstar|fullfort|pa min side|se detaljer pa|se bestillingen pa|se ordren pa)\b/i;
const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export type TemplateLintInput = {
  subjectNo: string;
  subjectEn: string;
  bodyNo: string;
  bodyEn: string;
  variables?: unknown;
  classification?: string;
  templateKey?: string;
};

export type TemplateLintResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  normalizedVariables: string[];
  placeholdersNo: string[];
  placeholdersEn: string[];
};

function isPostOrderTemplate(classification: string, templateKey: string): boolean {
  if (classification !== 'transactional') return false;
  if (!templateKey) return false;
  if (templateKey.startsWith('egg.waitlist.')) return false;
  return /^(pig|egg|chicken)\./.test(templateKey);
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function extractPlaceholders(value: string): string[] {
  const keys: string[] = [];
  const pattern = new RegExp(PLACEHOLDER_PATTERN.source, 'g');
  let match = pattern.exec(value);
  while (match) {
    const key = String(match[1] || '').trim();
    if (key) keys.push(key);
    match = pattern.exec(value);
  }
  return uniqueSorted(keys);
}

function hasMismatchedBraces(value: string): boolean {
  const open = (value.match(/\{\{/g) || []).length;
  const close = (value.match(/\}\}/g) || []).length;
  return open !== close;
}

function normalizeVariables(
  variables: unknown
): { list: string[]; invalid: boolean; provided: boolean } {
  if (variables === undefined) {
    return { list: [], invalid: false, provided: false };
  }

  if (!Array.isArray(variables)) {
    return { list: [], invalid: true, provided: true };
  }

  const mapped = variables.map((entry) => String(entry || '').trim());
  const invalid = mapped.some((entry) => !entry || /\s/.test(entry));
  return {
    list: uniqueSorted(mapped.filter(Boolean)),
    invalid,
    provided: true,
  };
}

export function lintManagedTemplate(input: TemplateLintInput): TemplateLintResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const subjectNo = String(input.subjectNo || '').trim();
  const subjectEn = String(input.subjectEn || '').trim();
  const bodyNo = String(input.bodyNo || '').trim();
  const bodyEn = String(input.bodyEn || '').trim();
  const normalized = normalizeVariables(input.variables);
  const classification = String(input.classification || '').trim().toLowerCase();
  const templateKey = String(input.templateKey || '').trim();

  if (!subjectNo) errors.push('subjectNo is required');
  if (!subjectEn) errors.push('subjectEn is required');
  if (!bodyNo) errors.push('bodyNo is required');
  if (!bodyEn) errors.push('bodyEn is required');

  if (normalized.invalid) {
    errors.push('variables must be an array of non-empty placeholder keys without spaces');
  }

  const texts = [
    ['subjectNo', subjectNo],
    ['subjectEn', subjectEn],
    ['bodyNo', bodyNo],
    ['bodyEn', bodyEn],
  ] as const;

  for (const [label, value] of texts) {
    if (!value) continue;
    if (hasMismatchedBraces(value)) {
      errors.push(`${label} contains unbalanced template braces`);
    }
    if (MOJIBAKE_PATTERN.test(value)) {
      errors.push(`${label} contains mojibake/encoding artifacts`);
    }
    if ((label === 'subjectNo' || label === 'bodyNo') && FORBIDDEN_FALLBACK_NO_PATTERN.test(value)) {
      errors.push(`${label} contains ASCII fallback instead of æ/ø/å`);
    }
  }

  const placeholdersNo = extractPlaceholders(`${subjectNo}\n${bodyNo}`);
  const placeholdersEn = extractPlaceholders(`${subjectEn}\n${bodyEn}`);

  const noSet = new Set(placeholdersNo);
  const enSet = new Set(placeholdersEn);

  const missingInEn = placeholdersNo.filter((entry) => !enSet.has(entry));
  const missingInNo = placeholdersEn.filter((entry) => !noSet.has(entry));

  if (missingInEn.length > 0) {
    errors.push(`Placeholders missing in EN copy: ${missingInEn.join(', ')}`);
  }
  if (missingInNo.length > 0) {
    errors.push(`Placeholders missing in NO copy: ${missingInNo.join(', ')}`);
  }

  const required = uniqueSorted([...placeholdersNo, ...placeholdersEn]);
  const normalizedVariables = normalized.provided ? normalized.list : required;

  if (normalized.provided) {
    const varsSet = new Set(normalizedVariables);
    const missingInVariables = required.filter((entry) => !varsSet.has(entry));
    const unusedVariables = normalizedVariables.filter((entry) => !required.includes(entry));

    if (missingInVariables.length > 0) {
      errors.push(`variables is missing placeholders used in template: ${missingInVariables.join(', ')}`);
    }
    if (unusedVariables.length > 0) {
      warnings.push(`variables contains unused placeholders: ${unusedVariables.join(', ')}`);
    }
  }

  if (isPostOrderTemplate(classification, templateKey)) {
    if (!/hva skjer nå\?/i.test(bodyNo)) {
      errors.push('Post-order NO copy must include a "Hva skjer nå?" block');
    }
    if (!/what happens next\?/i.test(bodyEn)) {
      errors.push('Post-order EN copy must include a "What happens next?" block');
    }

    const hasOrderOrMessageLinkNo =
      /\{\{\s*order_url\s*\}\}/i.test(bodyNo) || /\{\{\s*message_url\s*\}\}/i.test(bodyNo);
    const hasOrderOrMessageLinkEn =
      /\{\{\s*order_url\s*\}\}/i.test(bodyEn) || /\{\{\s*message_url\s*\}\}/i.test(bodyEn);
    if (!hasOrderOrMessageLinkNo || !hasOrderOrMessageLinkEn) {
      warnings.push(
        'Post-order templates should include deep-link placeholders (order_url or message_url) in both locales'
      );
    }

    if (!/\bmin side\b/i.test(bodyNo)) {
      warnings.push('Post-order NO copy should mention "Min side"');
    }
    if (!/\bmy page\b/i.test(bodyEn)) {
      warnings.push('Post-order EN copy should mention "My Page"');
    }

    if (!/\b(forskudd|restbetaling|henting|utsending)\b/i.test(bodyNo)) {
      warnings.push(
        'Post-order NO copy should use standardized terminology (forskudd/restbetaling/henting/utsending)'
      );
    }
    if (!/\b(deposit|remainder|pickup|shipping)\b/i.test(bodyEn)) {
      warnings.push(
        'Post-order EN copy should use standardized terminology (deposit/remainder/pickup/shipping)'
      );
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalizedVariables,
    placeholdersNo,
    placeholdersEn,
  };
}

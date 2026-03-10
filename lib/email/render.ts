import { supabaseAdmin } from '@/lib/supabase/server';
import type { EmailLocale } from '@/lib/email/types';

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

export function interpolateTemplate(input: string, variables: Record<string, unknown>): string {
  let output = input;
  for (const [key, value] of Object.entries(variables)) {
    const normalizedValue = toStringValue(value);
    const upperKey = key.toUpperCase();
    output = output
      .replaceAll(`{{${key}}}`, normalizedValue)
      .replaceAll(`{{ ${key} }}`, normalizedValue)
      .replaceAll(`{${upperKey}}`, normalizedValue);
  }
  return output;
}

function normalizeNorwegianCopy(text: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/Aapne/g, 'Åpne'],
    [/Ga til/g, 'Gå til'],
    [/Paminnelse/g, 'Påminnelse'],
    [/Hentepaminnelse/g, 'Hentepåminnelse'],
    [/Honer/g, 'Høner'],
    [/Belop/g, 'Beløp'],
    [/gjenstar/g, 'gjenstår'],
    [/fullfort/g, 'fullført'],
    [/Tinglum Gard/g, 'Tinglum Gård'],
    [/Se detaljer pa Min side/g, 'Se detaljer på Min side'],
    [/Se bestillingen pa Min side/g, 'Se bestillingen på Min side'],
    [/Se ordren pa Min side/g, 'Se ordren på Min side'],
    [/Apne bestillingen pa Min side/g, 'Åpne bestillingen på Min side'],
    [/ na klar /g, ' nå klar '],
    [/ na låst /g, ' nå låst '],
    [/ na last /g, ' nå låst '],
    [/ na /g, ' nå '],
    [/ na\./g, ' nå.'],
    [/ na,/g, ' nå,'],
    [/naer/g, 'når'],
    [/gjores/g, 'gjøres'],
    [/fatt/g, 'fått'],
    [/Leveringsmate/g, 'Leveringsmåte'],
    [/Forhandsvisning/g, 'Forhåndsvisning'],
    [/bestillinga/g, 'bestillingen'],
    [/GÃ¥/g, 'Gå'],
    [/GÃ¥rd/g, 'Gård'],
    [/pÃ¥/g, 'på'],
    [/fÃ¥/g, 'få'],
    [/Ã¦/g, 'æ'],
    [/Ã¸/g, 'ø'],
    [/Ã¥/g, 'å'],
  ];

  return replacements.reduce((value, [pattern, next]) => value.replace(pattern, next), text);
}

export function ensureHtmlDocument(html: string, locale: EmailLocale = 'no'): string {
  if (html.trim().toLowerCase().includes('<html')) {
    return html;
  }

  const brand = 'Tinglum Gård';
  const greeting = locale === 'en' ? 'Best regards' : 'Vennlig hilsen';
  const supportLabel = locale === 'en' ? 'Need help?' : 'Trenger du hjelp?';
  const supportText =
    locale === 'en' ? 'Reply to this email and we will help you.' : 'Svar på denne e-posten, så hjelper vi deg.';

  return `<!DOCTYPE html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${brand}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:20px 24px;background:#0f172a;color:#ffffff;font-family:Arial,sans-serif;font-size:18px;font-weight:700;">
                ${brand}
              </td>
            </tr>
            <tr>
              <td style="padding:24px;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#111827;">
                ${html}
                <p style="margin:20px 0 0;">${greeting}<br><strong>${brand}</strong></p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;border-top:1px solid #e4e4e7;background:#fafafa;font-family:Arial,sans-serif;">
                <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111827;">${supportLabel}</p>
                <p style="margin:0;font-size:13px;color:#52525b;">${supportText}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function renderManagedTemplate(options: {
  templateKey: string;
  locale?: EmailLocale;
  variables?: Record<string, unknown>;
}): Promise<{ subject: string; html: string; classification: string; templateKey: string } | null> {
  const locale = options.locale || 'no';
  const vars = options.variables || {};

  const { data, error } = await supabaseAdmin
    .from('email_templates')
    .select('template_key, classification, subject_no, subject_en, body_no, body_en')
    .eq('template_key', options.templateKey)
    .eq('active', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const subjectRaw = locale === 'en' ? String(data.subject_en || '') : normalizeNorwegianCopy(String(data.subject_no || ''));
  const bodyRaw = locale === 'en' ? String(data.body_en || '') : normalizeNorwegianCopy(String(data.body_no || ''));

  return {
    subject: interpolateTemplate(subjectRaw, vars),
    html: ensureHtmlDocument(interpolateTemplate(bodyRaw, vars), locale),
    classification: String(data.classification || 'transactional'),
    templateKey: String(data.template_key || options.templateKey),
  };
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

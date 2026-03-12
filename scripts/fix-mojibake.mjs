import fs from 'node:fs';

const files = [
  'lib/email/lifecycle.ts',
  'content/copy.no.ts',
  'components/admin/EmailControlCenter.tsx',
  'components/admin/CustomerDatabase.tsx',
  'app/api/admin/customers/email/route.ts',
  'lib/chickens/notifications.ts',
  'app/api/webhooks/vipps/route.ts',
];

const replacements = [
  ['Ã…', 'Å'],
  ['Ã˜', 'Ø'],
  ['Ã†', 'Æ'],
  ['Ã¥', 'å'],
  ['Ã¸', 'ø'],
  ['Ã¦', 'æ'],
  ['â€“', '–'],
  ['â€”', '—'],
  ['â€¢', '•'],
  ['Â·', '·'],
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) {
    text = text.split(from).join(to);
  }
  fs.writeFileSync(file, text, 'utf8');
}

console.log('Mojibake replacements applied.');

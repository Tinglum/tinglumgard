// Text helpers shared across server/client components.

const MOJIBAKE_RE = /Ã.|Â.|â€|â€™|â€œ|â€�|â€¢/;

function decodeLatin1AsUtf8(value: string): string {
  // Interpret each code unit as a raw byte and decode as UTF-8.
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    bytes[i] = value.charCodeAt(i) & 0xff;
  }

  // TextDecoder exists in modern browsers and Node (Next runtime).
  if (typeof TextDecoder !== 'undefined') {
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    } catch {
      // Fall through to Buffer when available.
    }
  }

  // Buffer is available on the server and in some bundlers; guarded for safety.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('utf8');
  }

  return value;
}

function mojibakeScore(value: string): number {
  const matches = value.match(/Ã.|Â.|â€/g);
  return matches ? matches.length : 0;
}

/**
 * Fix common mojibake caused by UTF-8 text being read as latin1/cp1252.
 * Example: "fÃ¥r" -> "får", "sprÃ¸" -> "sprø", "â€¢" -> "•".
 *
 * Safe by default: only attempts conversion when the string looks corrupted,
 * and only accepts the conversion if it reduces mojibake markers.
 */
export function fixMojibake(value: string): string {
  if (!value || typeof value !== 'string') return value;
  if (!MOJIBAKE_RE.test(value)) return value;

  const decoded = decodeLatin1AsUtf8(value);
  if (!decoded || decoded === value) return value;

  return mojibakeScore(decoded) < mojibakeScore(value) ? decoded : value;
}


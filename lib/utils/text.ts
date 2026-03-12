// Text helpers shared across server/client components.

const MOJIBAKE_MARKERS = [
  'Ã¥',
  'Ã¸',
  'Ã¦',
  'Ã…',
  'Ã˜',
  'Ã†',
  'â€“',
  'â€”',
  'â€¢',
  'â€',
  'ï¿½',
  '\uFFFD',
];

function decodeLatin1AsUtf8(value: string): string {
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i += 1) {
    bytes[i] = value.charCodeAt(i) & 0xff;
  }

  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(bytes).toString('utf8');
    }
    return value;
  }
}

function mojibakeScore(value: string): number {
  if (!value) return 0;
  return MOJIBAKE_MARKERS.reduce((sum, marker) => {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = value.match(new RegExp(escaped, 'g'));
    return sum + (matches ? matches.length : 0);
  }, 0);
}

function looksCorrupted(value: string): boolean {
  if (!value) return false;
  return MOJIBAKE_MARKERS.some((marker) => value.includes(marker));
}

/**
 * Fix common mojibake caused by UTF-8 text being interpreted as latin1/cp1252.
 * Safe by default: conversion is only accepted when corruption score improves.
 */
export function fixMojibake(value: string): string {
  if (!value || typeof value !== 'string') return value;
  if (!looksCorrupted(value)) return value;

  const decoded = decodeLatin1AsUtf8(value);
  if (!decoded || decoded === value) return value;

  return mojibakeScore(decoded) < mojibakeScore(value) ? decoded : value;
}

const PHONE_SPLIT = /[/|;,]+|\band\b/gi;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function isPhoneQuery(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!/^[\d\s+\-()./]+$/.test(trimmed)) return false;
  return digitsOnly(trimmed).length >= 7;
}

export function phoneKeyFromDigits(digits: string): string | null {
  if (digits.length < 7) return null;
  return digits.slice(-9);
}

export function normalizePhoneKeys(raw: string): string[] {
  const pieces = raw
    .split(PHONE_SPLIT)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  const source = pieces.length > 0 ? pieces : [raw];
  const keys: string[] = [];
  for (const piece of source) {
    const key = phoneKeyFromDigits(digitsOnly(piece));
    if (key && !keys.includes(key)) keys.push(key);
  }
  return keys;
}

function nationalMobile(digits: string): string | null {
  let national = digits;
  if (national.startsWith("00971")) national = national.slice(5);
  else if (national.startsWith("971") && national.length > 9) national = national.slice(3);
  else if (national.startsWith("0") && national.length >= 10) national = national.slice(1);
  if (national.length === 9 && national.startsWith("5")) return national;
  return null;
}

export function formatPhone(raw: string): string {
  const national = nationalMobile(digitsOnly(raw));
  if (!national) return raw.trim();
  return `+971 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
}

export function whatsappHref(raw: string): string | null {
  const digits = digitsOnly(raw);
  const national = nationalMobile(digits);
  if (national) return `https://wa.me/971${national}`;
  const international = digits.replace(/^00/, "");
  if (international.length >= 8 && international.length <= 15) {
    return `https://wa.me/${international}`;
  }
  return null;
}

export function splitPhoneValues(raw: string): string[] {
  const pieces = raw
    .split(PHONE_SPLIT)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (pieces.length > 0) return pieces;
  const trimmed = raw.trim();
  return trimmed ? [trimmed] : [];
}

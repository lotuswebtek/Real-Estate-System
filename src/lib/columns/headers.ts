export function normalizeHeader(raw: string): string {
  const splitCamel = raw
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return splitCamel
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[:.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

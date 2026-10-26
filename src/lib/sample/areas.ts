const AREA_STYLES = [
  "bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-100",
  "bg-amber-50 text-amber-950 dark:bg-amber-950 dark:text-amber-100",
  "bg-stone-200/80 text-stone-800 dark:bg-stone-800 dark:text-stone-100",
  "bg-sky-50 text-sky-950 dark:bg-sky-950 dark:text-sky-100",
  "bg-rose-50 text-rose-950 dark:bg-rose-950 dark:text-rose-100",
  "bg-emerald-50 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100",
  "bg-orange-50 text-orange-950 dark:bg-orange-950 dark:text-orange-100",
  "bg-slate-200/80 text-slate-800 dark:bg-slate-800 dark:text-slate-100",
];

export function areaClass(area: string): string {
  let hash = 0;
  for (const char of area) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AREA_STYLES[hash % AREA_STYLES.length] ?? AREA_STYLES[0];
}

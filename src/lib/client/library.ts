export type SavedSearch = { name: string; rules: string; query: string };

export type Bookmark = { id: string; name: string; detail: string };

const SAVED_KEY = "lf.saved";
const BOOKMARK_KEY = "lf.bookmarks";
const NOTES_KEY = "lf.notes";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "") as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function readSavedSearches(): SavedSearch[] {
  const parsed = readJson<unknown>(SAVED_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is SavedSearch => {
      if (!item || typeof item !== "object") return false;
      const row = item as SavedSearch;
      return typeof row.name === "string" && typeof row.query === "string" && typeof row.rules === "string";
    })
    .slice(0, 20);
}

export function writeSavedSearches(items: SavedSearch[]) {
  window.localStorage.setItem(SAVED_KEY, JSON.stringify(items.slice(0, 20)));
  window.dispatchEvent(new Event(SAVED_KEY));
}

export function readBookmarks(): Bookmark[] {
  const parsed = readJson<unknown>(BOOKMARK_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is Bookmark => {
      if (!item || typeof item !== "object") return false;
      const row = item as Bookmark;
      return typeof row.id === "string" && typeof row.name === "string" && typeof row.detail === "string";
    })
    .slice(0, 50);
}

export function writeBookmarks(items: Bookmark[]) {
  window.localStorage.setItem(BOOKMARK_KEY, JSON.stringify(items.slice(0, 50)));
  window.dispatchEvent(new Event(BOOKMARK_KEY));
}

export function readNote(id: string): string {
  const notes = readJson<Record<string, string>>(NOTES_KEY, {});
  return typeof notes[id] === "string" ? notes[id] : "";
}

export function writeNote(id: string, note: string) {
  const notes = readJson<Record<string, string>>(NOTES_KEY, {});
  if (note.trim()) notes[id] = note.slice(0, 2000);
  else delete notes[id];
  window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export function subscribeLibrary(key: "saved" | "bookmarks", listener: () => void) {
  const name = key === "saved" ? SAVED_KEY : BOOKMARK_KEY;
  window.addEventListener(name, listener);
  return () => window.removeEventListener(name, listener);
}

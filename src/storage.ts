// localStorage backed persistence helpers.
//
// JSON-only. Use this for primitives / plain objects / arrays only.
// (Sets, Dates, Maps need custom replacer/reviver — keep app-level state plain.)

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private mode — silently ignore
  }
}

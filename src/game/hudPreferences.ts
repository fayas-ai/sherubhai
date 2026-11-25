export const MINIMAP_PREF_STORAGE_KEY = 'kerala_town_show_minimap';

export function getInitialMinimapVisibility(
  viewportWidth: number,
  storedValue?: string | null,
): boolean {
  if (storedValue === 'true') return true;
  if (storedValue === 'false') return false;
  return viewportWidth >= 640;
}

export function toggleMinimapVisibility(current: boolean): boolean {
  return !current;
}

export function readMinimapPreference(
  storage?: Pick<Storage, 'getItem'> | null,
  viewportWidth = 1024,
): boolean {
  let stored: string | null = null;
  if (storage) {
    try {
      stored = storage.getItem(MINIMAP_PREF_STORAGE_KEY);
    } catch {
      stored = null;
    }
  }
  return getInitialMinimapVisibility(viewportWidth, stored);
}

export function writeMinimapPreference(
  visible: boolean,
  storage?: Pick<Storage, 'setItem'> | null,
): void {
  if (!storage) return;
  try {
    storage.setItem(MINIMAP_PREF_STORAGE_KEY, visible ? 'true' : 'false');
  } catch {
    // Ignore storage quota or private-mode errors
  }
}

export function toggleHudMenu(currentOpen: boolean): boolean {
  return !currentOpen;
}

export function formatCompactObjective(text: string, maxLength = 42): string {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}


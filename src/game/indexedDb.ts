import { GameProgressState, PlayableRole, SheruOutfit } from '../types/game';

const DB_NAME = 'SheruBhaiGhopWorldDB';
const DB_VERSION = 1;
const STORE_NAME = 'game_state';
const PROGRESS_KEY = 'sheru_progress_main';
const PROFILE_KEY = 'sheru_character_profile';

export interface IndexedDbCharacterProfile {
  outfit: SheruOutfit;
  playableRole: PlayableRole;
  updatedAt: number;
}

function hasIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!hasIndexedDb()) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveProgressToIndexedDb(progress: GameProgressState): Promise<boolean> {
  const db = await openDatabase();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(progress, PROGRESS_KEY);
      const profile: IndexedDbCharacterProfile = {
        outfit: progress.sheruOutfit ?? 'black',
        playableRole: progress.playableRole ?? 'sheru',
        updatedAt: Date.now(),
      };
      store.put(profile, PROFILE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

export async function saveCharacterProfileToIndexedDb(
  outfit: SheruOutfit,
  playableRole: PlayableRole,
): Promise<boolean> {
  const db = await openDatabase();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const profile: IndexedDbCharacterProfile = {
        outfit,
        playableRole,
        updatedAt: Date.now(),
      };
      store.put(profile, PROFILE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

export async function loadProgressFromIndexedDb(): Promise<{
  progress: GameProgressState | null;
  profile: IndexedDbCharacterProfile | null;
}> {
  const db = await openDatabase();
  if (!db) return { progress: null, profile: null };
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const progReq = store.get(PROGRESS_KEY);
      const profReq = store.get(PROFILE_KEY);

      tx.oncomplete = () => {
        db.close();
        resolve({
          progress: (progReq.result as GameProgressState | undefined) ?? null,
          profile: (profReq.result as IndexedDbCharacterProfile | undefined) ?? null,
        });
      };
      tx.onerror = () => {
        db.close();
        resolve({ progress: null, profile: null });
      };
    } catch {
      db.close();
      resolve({ progress: null, profile: null });
    }
  });
}

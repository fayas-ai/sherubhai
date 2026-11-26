import { GameScreenState } from '../types/game';

export interface PhotoModeState {
  active: boolean;
  controlsVisible: boolean;
  snapshotCount: number;
  lastSnapshotName: string | null;
}

export function createInitialPhotoModeState(): PhotoModeState {
  return {
    active: false,
    controlsVisible: true,
    snapshotCount: 0,
    lastSnapshotName: null,
  };
}

export function canTogglePhotoMode(
  screen: GameScreenState,
  anyModalOpen: boolean,
): boolean {
  return screen === 'playing' && !anyModalOpen;
}

export function togglePhotoModeState(current: PhotoModeState): PhotoModeState {
  const nextActive = !current.active;
  return {
    ...current,
    active: nextActive,
    controlsVisible: true,
  };
}

export function exitPhotoModeState(current: PhotoModeState): PhotoModeState {
  if (!current.active) return current;
  return {
    ...current,
    active: false,
    controlsVisible: true,
  };
}

export function togglePhotoModeControls(current: PhotoModeState): PhotoModeState {
  if (!current.active) return current;
  return {
    ...current,
    controlsVisible: !current.controlsVisible,
  };
}

export function formatSnapshotFilename(
  district: string,
  date: Date = new Date(),
): string {
  const slug = district
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'kerala-world';
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
  return `kerala-sheru-${slug}-${stamp}.png`;
}

export function recordSnapshotTaken(
  current: PhotoModeState,
  filename: string,
): PhotoModeState {
  return {
    ...current,
    snapshotCount: current.snapshotCount + 1,
    lastSnapshotName: filename,
  };
}

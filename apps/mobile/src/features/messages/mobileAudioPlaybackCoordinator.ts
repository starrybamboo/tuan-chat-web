export type MobileAudioPlaybackHandle = {
  id: string;
  pause: () => void;
};

let activeHandle: MobileAudioPlaybackHandle | null = null;

export function activateMobileAudioPlayback(handle: MobileAudioPlaybackHandle): void {
  if (activeHandle && activeHandle.id !== handle.id) {
    activeHandle.pause();
  }
  activeHandle = handle;
}

export function deactivateMobileAudioPlayback(id: string): void {
  if (activeHandle?.id === id) {
    activeHandle = null;
  }
}

export function getActiveMobileAudioPlaybackId(): string | null {
  return activeHandle?.id ?? null;
}


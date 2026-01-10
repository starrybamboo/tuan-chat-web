type BgmPlayOptions = {
  loop?: boolean;
  /** 0-100 */
  volume?: number;
};

let audio: HTMLAudioElement | null = null;
let currentSrc: string | null = null;

function ensureAudio(): HTMLAudioElement {
  if (audio)
    return audio;

  audio = new Audio();
  audio.preload = "auto";
  // 一般 BGM 都需要循环；具体是否循环由 play() 决定。
  audio.loop = true;
  return audio;
}

export function getBgmAudioElement(): HTMLAudioElement {
  return ensureAudio();
}

export async function playBgm(src: string, options: BgmPlayOptions = {}): Promise<void> {
  const a = ensureAudio();
  const nextLoop = options.loop ?? true;
  const nextVolume = options.volume;

  a.loop = nextLoop;

  if (typeof nextVolume === "number" && Number.isFinite(nextVolume)) {
    const clamped = Math.max(0, Math.min(100, nextVolume));
    a.volume = clamped / 100;
  }

  if (currentSrc !== src) {
    currentSrc = src;
    a.src = src;
    // 某些浏览器在 src 变化后需要显式 load
    a.load();
  }

  // autoplay 可能被浏览器策略拦截；让调用方决定如何处理失败。
  await a.play();
}

export function stopBgm(): void {
  if (!audio)
    return;

  try {
    audio.pause();
    audio.currentTime = 0;
  }
  catch {
    // ignore
  }
}

export function pauseBgm(): void {
  if (!audio)
    return;

  try {
    audio.pause();
  }
  catch {
    // ignore
  }
}

export function isBgmPlaying(): boolean {
  if (!audio)
    return false;
  return !audio.paused;
}

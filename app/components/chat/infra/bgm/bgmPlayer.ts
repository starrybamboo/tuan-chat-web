// BGM 播放器封装，维护单例 Audio 与 WebAudio 增益控制。
// 使用 metadata 预加载策略以支持边播边加载。
type BgmPlayOptions = {
  loop?: boolean;
  /**
   * 最终音量增益（0~n）
   */
  volume?: number;
};

let audio: HTMLAudioElement | null = null;
let currentSrc: string | null = null;

let lastPausedTimeSec: number | null = null;

// WebAudio nodes
let audioCtx: AudioContext | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
let gainNode: GainNode | null = null;

// 有些环境下 WebAudio Graph 会导致静音；允许回退到原生播放
let disableWebAudio = false;

const MAX_SAFE_GAIN = 2.0;

function ensureAudio(): HTMLAudioElement {
  if (audio)
    return audio;

  audio = new Audio();
  audio.preload = "metadata";
  audio.loop = true;

  // 允许跨域资源接入 WebAudio（否则 createMediaElementSource + 外链可能导致问题）
  audio.crossOrigin = "anonymous";

  return audio;
}

function destroyWebAudioGraph() {
  try {
    sourceNode?.disconnect();
  }
  catch {
    // ignore
  }
  try {
    gainNode?.disconnect();
  }
  catch {
    // ignore
  }
  sourceNode = null;
  gainNode = null;

  // audioCtx 不强制 close（close 后无法复用，且会触发额外异常）
}

function ensureWebAudioGraph(a: HTMLAudioElement) {
  if (disableWebAudio)
    return;

  // 已经有 graph 则直接复用
  if (audioCtx && sourceNode && gainNode)
    return;

  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = audioCtx ?? new Ctx();

    // 关键点：同一个 media element 只能 create 一次 source node；
    // 若之前异常导致节点不可用，则先清理再重建。
    if (!sourceNode) {
      sourceNode = audioCtx.createMediaElementSource(a);
    }
    if (!gainNode) {
      gainNode = audioCtx.createGain();
    }

    // 重连一次（防止某些浏览器热更新/路由切换后连接丢失）
    try {
      sourceNode.disconnect();
    }
    catch {
      // ignore
    }
    try {
      gainNode.disconnect();
    }
    catch {
      // ignore
    }

    sourceNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
  }
  catch {
    // WebAudio 初始化失败就回退到原生
    disableWebAudio = true;
    destroyWebAudioGraph();
  }
}

function getBgmAudioElement(): HTMLAudioElement {
  return ensureAudio();
}

export async function playBgm(src: string, options: BgmPlayOptions = {}): Promise<void> {
  const a = ensureAudio();
  const nextLoop = options.loop ?? true;
  const nextGain = options.volume;

  a.loop = nextLoop;

  // 避免原生 volume 与 GainNode 叠乘导致不可控；基准保持 1
  a.volume = 1;

  if (typeof window !== "undefined") {
    ensureWebAudioGraph(a);
  }

  if (typeof nextGain === "number" && Number.isFinite(nextGain)) {
    const clamped = Math.max(0, Math.min(MAX_SAFE_GAIN, nextGain));
    if (!disableWebAudio && gainNode) {
      gainNode.gain.value = clamped;
    }
    else {
      // fallback：原生 volume 最大只能到 1
      a.volume = Math.max(0, Math.min(1, clamped));
    }
  }

  const isSameSrc = currentSrc === src;

  if (!isSameSrc) {
    currentSrc = src;
    a.src = src;
    a.load();
    // 换曲不续播
    lastPausedTimeSec = null;
  }

  // 同一首曲子：若上次 pause 过则恢复进度
  if (isSameSrc && typeof lastPausedTimeSec === "number" && Number.isFinite(lastPausedTimeSec)) {
    try {
      a.currentTime = Math.max(0, lastPausedTimeSec);
    }
    catch {
      // ignore
    }
  }

  // 尝试恢复 audio context（若失败则回退）
  if (!disableWebAudio && audioCtx && audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    }
    catch {
      disableWebAudio = true;
      destroyWebAudioGraph();
    }
  }

  try {
    await a.play();
  }
  catch (e) {
    // 某些情况下 WebAudio 连接导致 play 失败/无声，强制回退一次再试
    if (!disableWebAudio) {
      disableWebAudio = true;
      destroyWebAudioGraph();
      try {
        await a.play();
      }
      catch {
        throw e;
      }
    }
    else {
      throw e;
    }
  }
}

export function stopBgm(): void {
  if (!audio)
    return;

  try {
    audio.pause();
    audio.currentTime = 0;
    // stop：从头开始，清理续播进度
    lastPausedTimeSec = null;
  }
  catch {
    // ignore
  }
}

export function pauseBgm(): void {
  if (!audio)
    return;

  try {
    // pause：记录进度以便续播
    lastPausedTimeSec = Number.isFinite(audio.currentTime) ? audio.currentTime : null;
    audio.pause();
  }
  catch {
    // ignore
  }
}

function isBgmPlaying(): boolean {
  if (!audio)
    return false;
  return !audio.paused;
}


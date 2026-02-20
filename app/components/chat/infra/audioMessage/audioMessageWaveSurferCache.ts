import { mediaDebug } from "@/components/chat/infra/media/mediaDebug";

type WaveSurferInstance = any;

type CacheEntry = {
  ws: WaveSurferInstance;
  refs: number;
  url: string;
  root: HTMLDivElement;
};

const cacheByKey = new Map<string, CacheEntry>();

function ensureHiddenHost(): HTMLElement {
  if (typeof document === "undefined")
    throw new Error("document is not available");

  const id = "tc-audio-message-hidden-wavesurfer-host";
  let el = document.getElementById(id) as HTMLDivElement | null;
  if (el)
    return el;

  el = document.createElement("div");
  el.id = id;
  el.setAttribute("aria-hidden", "true");
  el.style.position = "fixed";
  el.style.left = "-99999px";
  el.style.top = "0";
  el.style.width = "1px";
  el.style.height = "1px";
  el.style.overflow = "hidden";
  el.style.opacity = "0";
  el.style.pointerEvents = "none";
  document.body.appendChild(el);
  mediaDebug("audio-cache", "create-hidden-host", { id });
  return el;
}

async function createWaveSurfer(url: string, container: HTMLElement): Promise<WaveSurferInstance> {
  const mod: any = await import("wavesurfer.js");
  const WaveSurfer = mod?.default ?? mod;

  return WaveSurfer.create({
    container,
    waveColor: "rgba(148, 163, 184, 0.55)",
    progressColor: "#3b82f6",
    cursorColor: "rgba(59, 130, 246, 0.9)",
    barWidth: 2,
    barGap: 1,
    barRadius: 2,
    height: 28,
    normalize: true,
    interact: true,
    url,
    crossOrigin: "anonymous",
  });
}

export function hasAudioMessageWaveSurfer(cacheKey: string): boolean {
  return cacheByKey.has(cacheKey);
}

function releaseKey(cacheKey: string, opts?: { keepPlaying?: boolean }) {
  const entry = cacheByKey.get(cacheKey);
  if (!entry)
    return;

  const prevRefs = entry.refs;
  entry.refs = Math.max(0, entry.refs - 1);
  mediaDebug("audio-cache", "release", {
    cacheKey,
    prevRefs,
    nextRefs: entry.refs,
    url: entry.url,
    keepPlaying: Boolean(opts?.keepPlaying),
    isPlaying: Boolean(entry.ws?.isPlaying?.()),
  });
  if (entry.refs > 0)
    return;

  try {
    if (!opts?.keepPlaying) {
      try {
        entry.ws?.stop?.();
      }
      catch {
        try {
          entry.ws?.pause?.();
        }
        catch {
          // ignore
        }
      }
    }
    // 为了满足“滚动再远也不重载媒体”的体验要求，离屏后统一保留在 hidden host。
    ensureHiddenHost().appendChild(entry.root);
    mediaDebug("audio-cache", "move-to-hidden-host", {
      cacheKey,
      url: entry.url,
      currentTime: entry.ws?.getCurrentTime?.(),
      isPlaying: Boolean(entry.ws?.isPlaying?.()),
      keepPlaying: Boolean(opts?.keepPlaying),
    });
  }
  catch {
    // ignore
  }
}

export async function acquireAudioMessageWaveSurfer(params: { cacheKey: string; url: string; container: HTMLElement }) {
  const { cacheKey, url, container } = params;
  if (!url)
    throw new Error("url is required");
  if (!cacheKey)
    throw new Error("cacheKey is required");

  const existing = cacheByKey.get(cacheKey);
  if (existing) {
    mediaDebug("audio-cache", "acquire-hit", {
      cacheKey,
      url,
      cachedUrl: existing.url,
      refs: existing.refs,
      currentTime: existing.ws?.getCurrentTime?.(),
      isPlaying: Boolean(existing.ws?.isPlaying?.()),
    });
    existing.refs = Math.max(0, existing.refs) + 1;

    if (existing.url !== url) {
      mediaDebug("audio-cache", "acquire-hit-url-changed", {
        cacheKey,
        prevUrl: existing.url,
        nextUrl: url,
      });
      existing.url = url;
      try {
        existing.ws?.destroy?.();
      }
      catch {
        // ignore
      }
      existing.root.innerHTML = "";
      existing.ws = await createWaveSurfer(url, existing.root);
    }

    // Move the DOM node instead of calling ws.setOptions, to avoid playback interruptions.
    container.appendChild(existing.root);
    mediaDebug("audio-cache", "attach-to-container", {
      cacheKey,
      url: existing.url,
      refs: existing.refs,
      currentTime: existing.ws?.getCurrentTime?.(),
      isPlaying: Boolean(existing.ws?.isPlaying?.()),
    });
    return {
      ws: existing.ws,
      release: (opts?: { keepPlaying?: boolean }) => releaseKey(cacheKey, opts),
    };
  }

  // Create a stable DOM root for the waveform; it will be moved between mount points.
  const root = document.createElement("div");
  root.style.width = "100%";
  container.appendChild(root);

  const ws = await createWaveSurfer(url, root);
  const entry: CacheEntry = { ws, refs: 1, url, root };
  cacheByKey.set(cacheKey, entry);
  mediaDebug("audio-cache", "acquire-miss-create", { cacheKey, url });

  return {
    ws,
    release: (opts?: { keepPlaying?: boolean }) => releaseKey(cacheKey, opts),
  };
}

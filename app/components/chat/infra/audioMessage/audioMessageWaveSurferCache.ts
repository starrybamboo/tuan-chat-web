type WaveSurferInstance = any;

type CacheEntry = {
  ws: WaveSurferInstance;
  refs: number;
  hiddenContainer: HTMLElement;
};

const cacheByUrl = new Map<string, CacheEntry>();

function ensureHiddenContainer(): HTMLElement {
  if (typeof document === "undefined")
    throw new Error("document is not available");

  const id = "tc-audio-message-hidden-wavesurfer-container";
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

export function hasAudioMessageWaveSurfer(url: string): boolean {
  return cacheByUrl.has(url);
}

function releaseUrl(url: string, keepPlaying?: boolean) {
  const entry = cacheByUrl.get(url);
  if (!entry)
    return;

  entry.refs = Math.max(0, entry.refs - 1);
  if (entry.refs > 0)
    return;

  const isPlaying = Boolean(entry.ws?.isPlaying?.());
  const shouldKeep = Boolean(keepPlaying) || isPlaying;
  if (shouldKeep) {
    try {
      entry.ws?.setOptions?.({ container: entry.hiddenContainer });
    }
    catch {
      // ignore
    }
    return;
  }

  try {
    entry.ws?.destroy?.();
  }
  catch {
    // ignore
  }
  cacheByUrl.delete(url);
}

export async function acquireAudioMessageWaveSurfer(params: { url: string; container: HTMLElement }) {
  const { url, container } = params;
  if (!url)
    throw new Error("url is required");

  const existing = cacheByUrl.get(url);
  if (existing) {
    existing.refs++;
    try {
      existing.ws?.setOptions?.({ container });
    }
    catch {
      // ignore
    }
    return {
      ws: existing.ws,
      release: (opts?: { keepPlaying?: boolean }) => releaseUrl(url, opts?.keepPlaying),
    };
  }

  const hidden = ensureHiddenContainer();
  const ws = await createWaveSurfer(url, container);
  const entry: CacheEntry = { ws, refs: 1, hiddenContainer: hidden };
  cacheByUrl.set(url, entry);

  ws.on?.("finish", () => {
    const current = cacheByUrl.get(url);
    if (!current)
      return;
    if (current.refs > 0)
      return;

    try {
      current.ws?.destroy?.();
    }
    catch {
      // ignore
    }
    cacheByUrl.delete(url);
  });

  ws.on?.("error", () => {
    const current = cacheByUrl.get(url);
    if (!current)
      return;
    if (current.refs > 0)
      return;

    try {
      current.ws?.destroy?.();
    }
    catch {
      // ignore
    }
    cacheByUrl.delete(url);
  });

  return {
    ws,
    release: (opts?: { keepPlaying?: boolean }) => releaseUrl(url, opts?.keepPlaying),
  };
}

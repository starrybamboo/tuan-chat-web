import { mediaDebug } from "@/components/chat/infra/media/mediaDebug";

type VideoCacheEntry = {
  video: HTMLVideoElement;
  refs: number;
  url: string;
};

const cacheByKey = new Map<string, VideoCacheEntry>();

function ensureHiddenHost(): HTMLElement {
  if (typeof document === "undefined")
    throw new Error("document is not available");

  const id = "tc-video-message-hidden-video-host";
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
  mediaDebug("video-cache", "create-hidden-host", { id });
  return el;
}

function createVideoElement(url: string): HTMLVideoElement {
  const video = document.createElement("video");
  video.controls = true;
  // 尽量在缓存实例中提前缓冲，减少滚动回看时出现加载动画。
  video.preload = "auto";
  // Mobile Safari needs both the property and the attribute.
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.src = url;
  mediaDebug("video-cache", "create-video-element", { url });
  return video;
}

function updateVideoSource(video: HTMLVideoElement, url: string): void {
  const current = video.getAttribute("src") ?? "";
  if (current === url)
    return;

  try {
    video.pause();
  }
  catch {
    // ignore
  }

  video.src = url;
  try {
    video.load();
  }
  catch {
    // ignore
  }
  mediaDebug("video-cache", "update-video-source", { url });
}

function releaseCachedVideo(cacheKey: string): void {
  const entry = cacheByKey.get(cacheKey);
  if (!entry)
    return;

  const prevRefs = entry.refs;
  entry.refs = Math.max(0, entry.refs - 1);
  mediaDebug("video-cache", "release", {
    cacheKey,
    prevRefs,
    nextRefs: entry.refs,
    currentTime: entry.video.currentTime,
    paused: entry.video.paused,
    readyState: entry.video.readyState,
  });
  if (entry.refs > 0)
    return;

  try {
    ensureHiddenHost().appendChild(entry.video);
    mediaDebug("video-cache", "move-to-hidden-host", {
      cacheKey,
      currentTime: entry.video.currentTime,
      paused: entry.video.paused,
      readyState: entry.video.readyState,
    });
  }
  catch {
    // ignore
  }
}

export function acquireCachedVideoElement(params: {
  cacheKey: string;
  url: string;
  container: HTMLElement;
  className?: string;
  stopClickPropagation?: boolean;
}) {
  const { cacheKey, url, container, className, stopClickPropagation } = params;
  if (!cacheKey)
    throw new Error("cacheKey is required");
  if (!url)
    throw new Error("url is required");

  let entry = cacheByKey.get(cacheKey);
  if (!entry) {
    const video = createVideoElement(url);
    entry = { video, refs: 0, url };
    cacheByKey.set(cacheKey, entry);
    mediaDebug("video-cache", "acquire-miss-create", { cacheKey, url });
  }
  else if (entry.url !== url) {
    mediaDebug("video-cache", "acquire-hit-url-changed", {
      cacheKey,
      prevUrl: entry.url,
      nextUrl: url,
    });
    entry.url = url;
    updateVideoSource(entry.video, url);
  }
  else {
    mediaDebug("video-cache", "acquire-hit", {
      cacheKey,
      url,
      currentTime: entry.video.currentTime,
      paused: entry.video.paused,
      readyState: entry.video.readyState,
    });
  }

  const prevRefs = entry.refs;
  entry.refs += 1;
  mediaDebug("video-cache", "acquire-ref-inc", { cacheKey, prevRefs, nextRefs: entry.refs });

  if (typeof className === "string") {
    entry.video.className = className;
  }

  if (stopClickPropagation) {
    entry.video.onclick = (event) => {
      event.stopPropagation();
    };
  }

  container.appendChild(entry.video);
  mediaDebug("video-cache", "attach-to-container", {
    cacheKey,
    currentTime: entry.video.currentTime,
    paused: entry.video.paused,
    readyState: entry.video.readyState,
  });

  return {
    video: entry.video,
    release: () => releaseCachedVideo(cacheKey),
  };
}

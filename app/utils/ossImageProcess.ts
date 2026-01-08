export function withOssProcess(url: string, process: string): string {
  // Avoid touching non-http(s) URLs.
  if (!url || url.startsWith("blob:") || url.startsWith("data:"))
    return url;

  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.href : undefined);
    if (!parsed.searchParams.has("x-oss-process")) {
      parsed.searchParams.set("x-oss-process", process);
    }
    return parsed.toString();
  }
  catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}x-oss-process=${encodeURIComponent(process)}`;
  }
}

export function withOssResizeProcess(url: string, width: number): string {
  const safeWidth = Math.max(1, Math.floor(width));
  return withOssProcess(url, `image/resize,w_${safeWidth}`);
}

export function hasFileExtension(fileName: string): boolean {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 && dotIndex < fileName.length - 1;
}

export function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function getSafeExtensionFromUrl(url: string, defaultExt: string): string {
  try {
    const urlWithoutParams = String(url ?? "").split("?")[0].split("#")[0];
    const lastSegment = urlWithoutParams.substring(urlWithoutParams.lastIndexOf("/") + 1);
    const dotIndex = lastSegment.lastIndexOf(".");
    if (dotIndex > 0 && dotIndex < lastSegment.length - 1) {
      const ext = lastSegment.substring(dotIndex + 1).toLowerCase();
      if (/^[a-z0-9]{1,8}$/.test(ext)) {
        return ext;
      }
    }
    return defaultExt;
  }
  catch {
    return defaultExt;
  }
}

export function buildImageFileName(url: string, fileName: string | undefined, prefix: string): string {
  const extension = getSafeExtensionFromUrl(url, "webp");
  const trimmed = fileName?.trim();
  if (trimmed) {
    return hasFileExtension(trimmed) ? trimmed : `${trimmed}.${extension}`;
  }
  return `${prefix}_${hashString(url)}.${extension}`;
}

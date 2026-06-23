export function resolveAvatarUploadName(fileName: string): string | undefined {
  const normalizedFileName = fileName.trim().split(/[\\/]/).pop()?.trim() ?? "";
  if (!normalizedFileName) {
    return undefined;
  }

  const dotIndex = normalizedFileName.lastIndexOf(".");
  const nameWithoutExtension = dotIndex > 0
    ? normalizedFileName.slice(0, dotIndex).trim()
    : normalizedFileName;

  return nameWithoutExtension || undefined;
}

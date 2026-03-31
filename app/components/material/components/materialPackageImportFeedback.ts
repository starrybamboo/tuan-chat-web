export function getMaterialPackageDisplayName(name?: string | null): string {
  const normalized = typeof name === "string" ? name.trim() : "";
  return normalized || "未命名素材包";
}

export function buildMaterialPackageImportSuccessMessage(name?: string | null): string {
  return `已将「${getMaterialPackageDisplayName(name)}」导入到当前空间`;
}

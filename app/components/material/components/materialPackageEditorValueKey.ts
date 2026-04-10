type GlobalMaterialPackageLike = {
  packageId?: number | null;
  updateTime?: string | null;
};

type SpaceMaterialPackageLike = {
  spacePackageId?: number | null;
  updateTime?: string | null;
};

function normalizeEditorEntityId(id?: number | null): string {
  return typeof id === "number" && Number.isFinite(id) && id > 0 ? String(id) : "unknown";
}

export function buildGlobalMaterialPackageEditorValueKey(
  tab: "public" | "mine",
  materialPackage?: GlobalMaterialPackageLike | null,
): string {
  // 自动保存会刷新 updateTime。这里必须只跟“正在编辑哪个包”绑定，避免同包刷新时重置到封面页。
  return `${tab}-${normalizeEditorEntityId(materialPackage?.packageId)}`;
}

export function buildSpaceMaterialPackageEditorValueKey(
  materialPackage?: SpaceMaterialPackageLike | null,
  scope: "detail" | "sub-window" = "detail",
): string {
  const prefix = scope === "sub-window" ? "sub-window-space" : "space";
  return `${prefix}-${normalizeEditorEntityId(materialPackage?.spacePackageId)}`;
}

import type { MaterialPackageResponse } from "@tuanchat/openapi-client/models/MaterialPackageResponse";
import type { SpaceMaterialPackageResponse } from "@tuanchat/openapi-client/models/SpaceMaterialPackageResponse";

import { imageMediumUrl } from "@/utils/mediaUrl";

export type MaterialPackageLibraryPlaceholderIcon = "house" | "package";

export type MaterialPackageLibraryCardModel = {
  key: string;
  name: string;
  subtitle: string;
  description: string;
  coverUrl?: string;
  badgeLabel: string;
  placeholderSeed: string;
  placeholderIcon: MaterialPackageLibraryPlaceholderIcon;
  materialCount: number;
  folderCount: number;
  messageCount: number;
  createTime?: string;
  updateTime?: string;
};

function normalizeName(name: string | undefined, fallback: string) {
  const normalized = name?.trim();
  return normalized || fallback;
}

function normalizeCount(value: number | undefined) {
  return value ?? 0;
}

export function buildGlobalMaterialPackageCardModel(
  item: MaterialPackageResponse,
  activeTab: "mine" | "public",
): MaterialPackageLibraryCardModel {
  const name = normalizeName(item.name, "未命名素材包");

  return {
    key: String(item.packageId ?? `global-${name}`),
    name,
    subtitle: activeTab === "mine"
      ? `已被导入 ${normalizeCount(item.importCount)} 次`
      : `贡献人 · ${normalizeName(item.username, "未知")}`,
    description: item.description?.trim() ?? "",
    coverUrl: imageMediumUrl(item.coverFileId),
    badgeLabel: activeTab === "mine" ? "我的素材" : "公开素材",
    placeholderSeed: `${name}${item.packageId ?? ""}`,
    placeholderIcon: "package",
    materialCount: normalizeCount(item.materialCount),
    folderCount: normalizeCount(item.folderCount),
    messageCount: normalizeCount(item.messageCount),
    createTime: item.createTime,
    updateTime: item.updateTime,
  };
}

export function buildSpaceMaterialPackageCardModel(
  item: SpaceMaterialPackageResponse,
): MaterialPackageLibraryCardModel {
  const name = normalizeName(item.name, "未命名局内素材包");

  return {
    key: String(item.spacePackageId ?? `space-${name}`),
    name,
    subtitle: item.sourcePackageId
      ? `来源局外素材包 #${item.sourcePackageId}`
      : "当前空间的本地素材包",
    description: item.description?.trim() ?? "",
    coverUrl: imageMediumUrl(item.coverFileId),
    badgeLabel: item.sourcePackageId ? "导入副本" : "局内素材",
    placeholderSeed: `${name}${item.spacePackageId ?? ""}`,
    placeholderIcon: "house",
    materialCount: normalizeCount(item.materialCount),
    folderCount: normalizeCount(item.folderCount),
    messageCount: normalizeCount(item.messageCount),
    createTime: item.createTime,
    updateTime: item.updateTime,
  };
}

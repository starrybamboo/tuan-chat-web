import type { RglImportCompileContext, RglMaterialResolveResult, RglRoleResolveResult } from "@/components/chat/utils/importRglText";

import { normalizeSpeakerName } from "@/components/chat/utils/importChatText";
import { ANNOTATION_IDS } from "@/types/messageAnnotations";

import type { MaterialNode, MessageDraft, RoleAvatar, SpaceMaterialPackageResponse, UserRole } from "../../../../api";

type AvatarSource = Record<number, RoleAvatar[]> | Map<number, RoleAvatar[]>;

export type RglImportResolverSources = {
  roles: Array<Pick<UserRole, "roleId" | "roleName">>;
  avatarsByRoleId: AvatarSource;
  materialPackages: SpaceMaterialPackageResponse[];
};

type IndexedMaterial = {
  name: string;
  path: string;
  pathParts: string[];
  messages: MessageDraft[];
  spacePackageId?: number;
};

const MATERIAL_GROUPS_BY_ANNOTATION: Record<string, string[]> = {
  [ANNOTATION_IDS.BACKGROUND]: ["背景"],
  [ANNOTATION_IDS.BGM]: ["BGM"],
  [ANNOTATION_IDS.SE]: ["SE"],
  [ANNOTATION_IDS.CG]: ["CG"],
  [ANNOTATION_IDS.IMAGE_SHOW]: ["CG", "资料", "展示图"],
};

function getAvatarList(source: AvatarSource, roleId: number) {
  if (source instanceof Map) {
    return source.get(roleId) ?? [];
  }
  return source[roleId] ?? [];
}

function getAvatarTitleLabels(avatar: Pick<RoleAvatar, "avatarTitle">) {
  return Object.values(avatar.avatarTitle ?? {})
    .map(value => String(value ?? "").trim())
    .filter(Boolean);
}

function normalizeMaterialPath(value: string) {
  return value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function buildMaterialPathCandidates(normalizedName: string, allowedGroups: string[]) {
  if (!normalizedName.includes("/")) {
    return [];
  }

  const [firstPart] = normalizedName.split("/");
  if (firstPart && allowedGroups.includes(firstPart)) {
    return [normalizedName];
  }

  return allowedGroups.map(groupName => `${groupName}/${normalizedName}`);
}

function isFolderNode(node: MaterialNode | null | undefined) {
  return node?.type === "folder";
}

function isMaterialNode(node: MaterialNode | null | undefined) {
  return node?.type === "material";
}

function collectMaterialsFromNode(
  node: MaterialNode | null | undefined,
  parentPath: string[],
  spacePackageId: number | undefined,
  out: IndexedMaterial[],
) {
  const name = String(node?.name ?? "").trim();
  if (!node || !name) {
    return;
  }

  if (isFolderNode(node)) {
    for (const child of node.children ?? []) {
      collectMaterialsFromNode(child, [...parentPath, name], spacePackageId, out);
    }
    return;
  }

  if (!isMaterialNode(node)) {
    return;
  }

  const pathParts = [...parentPath, name];
  out.push({
    name,
    path: pathParts.join("/"),
    pathParts,
    messages: node.messages ?? [],
    spacePackageId,
  });
}

function collectMaterials(materialPackages: SpaceMaterialPackageResponse[]) {
  const materials: IndexedMaterial[] = [];
  for (const materialPackage of materialPackages) {
    for (const node of materialPackage.content?.root ?? []) {
      collectMaterialsFromNode(node, [], materialPackage.spacePackageId, materials);
    }
  }
  return materials;
}

function findUnique<T>(items: T[], describeMissing: () => string, describeDuplicate: () => string) {
  if (items.length === 0) {
    throw new Error(describeMissing());
  }
  if (items.length > 1) {
    throw new Error(describeDuplicate());
  }
  return items[0]!;
}

function buildRoleResolver(sources: RglImportResolverSources): RglImportCompileContext["resolveRoleAvatar"] {
  return ({ roleName, avatarName }): RglRoleResolveResult => {
    const normalizedRoleName = normalizeSpeakerName(roleName);
    const matchedRole = findUnique(
      sources.roles.filter(role => normalizeSpeakerName(role.roleName ?? "") === normalizedRoleName),
      () => `找不到角色：${roleName}`,
      () => `角色名重复：${roleName}`,
    );

    const matchedAvatar = findUnique(
      getAvatarList(sources.avatarsByRoleId, matchedRole.roleId)
        .filter(avatar => getAvatarTitleLabels(avatar).includes(avatarName.trim())),
      () => `找不到角色差分：${roleName}.${avatarName}`,
      () => `角色差分重名：${roleName}.${avatarName}`,
    );

    if (typeof matchedAvatar.avatarId !== "number" || matchedAvatar.avatarId <= 0) {
      throw new Error(`角色差分缺少 avatarId：${roleName}.${avatarName}`);
    }

    return {
      roleId: matchedRole.roleId,
      avatarId: matchedAvatar.avatarId,
      speakerName: matchedRole.roleName ?? roleName,
    };
  };
}

function getMaterialCandidates(
  materials: IndexedMaterial[],
  annotationId: string,
  materialName: string,
) {
  const normalizedName = normalizeMaterialPath(materialName);
  const allowedGroups = MATERIAL_GROUPS_BY_ANNOTATION[annotationId];
  if (!allowedGroups) {
    throw new Error(`annotation 不支持素材引用：${annotationId}`);
  }

  if (normalizedName.includes("/")) {
    const candidatePaths = buildMaterialPathCandidates(normalizedName, allowedGroups);
    return materials.filter(material => candidatePaths.includes(material.path));
  }

  return materials.filter((material) => {
    const groupName = material.pathParts[0];
    return material.name === normalizedName && groupName != null && allowedGroups.includes(groupName);
  });
}

function findMaterialMessage(material: IndexedMaterial, annotationId: string) {
  const messages = material.messages.filter(message => (message.annotations ?? []).includes(annotationId));
  return findUnique(
    messages,
    () => `素材缺少 ${annotationId} 消息：${material.path}`,
    () => `素材存在多个 ${annotationId} 消息：${material.path}`,
  );
}

function toMaterialResolveResult(message: MessageDraft): RglMaterialResolveResult {
  if (typeof message.messageType !== "number" || message.messageType <= 0) {
    throw new Error("素材消息缺少 messageType");
  }
  return {
    content: message.content ?? "",
    messageType: message.messageType,
    annotations: message.annotations,
    extra: message.extra as RglMaterialResolveResult["extra"],
    webgal: message.webgal as RglMaterialResolveResult["webgal"],
  };
}

function buildMaterialResolver(sources: RglImportResolverSources): RglImportCompileContext["resolveMaterial"] {
  const materials = collectMaterials(sources.materialPackages);
  return ({ annotationId, materialName }): RglMaterialResolveResult => {
    const matchedMaterial = findUnique(
      getMaterialCandidates(materials, annotationId, materialName),
      () => `找不到素材：${materialName}`,
      () => `素材名重复：${materialName}`,
    );
    return toMaterialResolveResult(findMaterialMessage(matchedMaterial, annotationId));
  };
}

export function createRglImportCompileContextFromSources(
  sources: RglImportResolverSources,
): RglImportCompileContext {
  return {
    resolveRoleAvatar: buildRoleResolver(sources),
    resolveMaterial: buildMaterialResolver(sources),
  };
}

import type { ReplayMaterialPackageImportApplyDeps, ReplayMaterialPackageImportApplyResult } from "@/components/chat/utils/importRglMaterialManifest";
import type {
  ReplayRoleAvatarImportApplyDeps,
  ReplayRoleAvatarImportApplyResult,
  ReplayRoleAvatarImportSources,
} from "@/components/chat/utils/importRglRoleManifest";

import { summarizeReplayAssetManifestSections } from "@/components/chat/utils/importRglAssetManifestUpload";
import {
  applyReplayMaterialPackageImport,
  buildReplayMaterialPackageFromAssetManifest,
} from "@/components/chat/utils/importRglMaterialManifest";
import {
  applyReplayRoleAvatarImportPlan,
  buildReplayRoleAvatarImportPlanFromAssetManifest,
} from "@/components/chat/utils/importRglRoleManifest";

export type UploadedReplayAssetManifestApplyDeps = {
  loadRoleSources: () => Promise<ReplayRoleAvatarImportSources> | ReplayRoleAvatarImportSources;
  materialDeps: ReplayMaterialPackageImportApplyDeps;
  roleDeps: ReplayRoleAvatarImportApplyDeps;
  spaceId: number;
};

export type UploadedReplayAssetManifestApplyResult = {
  material?: ReplayMaterialPackageImportApplyResult;
  role?: ReplayRoleAvatarImportApplyResult;
};

export async function applyUploadedReplayAssetManifest(
  uploadedManifest: unknown,
  deps: UploadedReplayAssetManifestApplyDeps,
): Promise<UploadedReplayAssetManifestApplyResult> {
  const sections = summarizeReplayAssetManifestSections(uploadedManifest);
  if (!sections.media && !sections.roles) {
    throw new Error("素材清单没有可导入的 media 或 roles");
  }

  const rolePlan = sections.roles
    ? buildReplayRoleAvatarImportPlanFromAssetManifest(uploadedManifest, await deps.loadRoleSources())
    : null;
  const replayPackage = sections.media
    ? buildReplayMaterialPackageFromAssetManifest(uploadedManifest)
    : null;
  const role = rolePlan
    ? await applyReplayRoleAvatarImportPlan(rolePlan, deps.roleDeps)
    : undefined;
  const material = replayPackage
    ? await applyReplayMaterialPackageImport(
        deps.spaceId,
        replayPackage,
        deps.materialDeps,
      )
    : undefined;

  return {
    ...(material ? { material } : {}),
    ...(role ? { role } : {}),
  };
}

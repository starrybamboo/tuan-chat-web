import type { RoleAvatarVariant } from "api";

import React, { useCallback, useMemo, useRef, useState } from "react";

import { appToast } from "@/components/common/appToast/appToast";
import { FileInput } from "@/components/common/FormField";
import { normalizeImageFileOrNull } from "@/utils/media/mediaMime";

import { VariantAssignmentDialog } from "../sprite/Tabs/VariantAssignmentDialog";
import { dispatchAvatarUploadTask } from "./avatarUploadDispatch";
import { resolvePendingAvatarUpload } from "./avatarUploadTargetDialog";

export type UploadVariantTarget =
  | { mode: "none" }
  | { mode: "existing"; variantId: number; variantGroup?: RoleAvatarVariant }
  | { mode: "new"; name: string };

export type AvatarUploadFilesContext = {
  target: UploadVariantTarget;
  batchKey: string;
}

type UploadVariantTargetDraft = {
  mode: "none" | "existing";
  variantId: string;
  name: string;
}

type CharacterCopperProps = {
  children: React.ReactNode;
  wrapperClassName?: string;
  triggerClassName?: string;
  externalFiles?: File[] | null;
  externalFilesBatchId?: number;
  onExternalFilesHandled?: () => void;
  lockedVariantGroup?: RoleAvatarVariant;
  availableVariants?: RoleAvatarVariant[];
  defaultVariantId?: number;
  onFilesSelected: (files: File[], context: AvatarUploadFilesContext) => void | Promise<void>;
}

function normalizeVariantId(value: unknown): number | undefined {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? Math.floor(id) : undefined;
}

function createUploadBatchKey() {
  return `avatar-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * 头像上传入口只负责选择文件与立绘组目标。
 * 具体裁剪统一交给 SpriteSettingsPopup 内的立绘校正 / 头像校正流程。
 */
export function CharacterCopper({
  children,
  triggerClassName,
  wrapperClassName,
  externalFiles,
  externalFilesBatchId,
  onExternalFilesHandled,
  lockedVariantGroup,
  availableVariants,
  defaultVariantId,
  onFilesSelected,
}: CharacterCopperProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const externalFilesHandledRef = useRef<number | null>(null);
  const variantGroups = useMemo(() => availableVariants ?? [], [availableVariants]);
  const variantGroupById = useMemo(() => {
    const map = new Map<number, RoleAvatarVariant>();
    variantGroups.forEach((variant) => {
      const id = normalizeVariantId(variant.variantId);
      if (id) {
        map.set(id, variant);
      }
    });
    const lockedId = normalizeVariantId(lockedVariantGroup?.variantId);
    if (lockedId && lockedVariantGroup) {
      map.set(lockedId, lockedVariantGroup);
    }
    return map;
  }, [lockedVariantGroup, variantGroups]);

  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[] | null>(null);
  const [variantTargetDialogOpen, setVariantTargetDialogOpen] = useState(false);
  const [variantTargetDialogMode, setVariantTargetDialogMode] = useState<"select" | "create">("select");
  const [variantTargetDraft, setVariantTargetDraft] = useState<UploadVariantTargetDraft>(() => ({
    mode: "none",
    variantId: "",
    name: "立绘组 1",
  }));

  const beginUploadFlow = useCallback((files: File[], target: UploadVariantTarget) => {
    if (files.length === 0) {
      return;
    }
    // 上传任务提交给父级乐观工作流后立即释放入口，允许用户继续追加图片。
    dispatchAvatarUploadTask(
      () => onFilesSelected(files, {
        target,
        batchKey: createUploadBatchKey(),
      }),
      (error) => {
        console.error("上传入口处理失败:", error);
        appToast.error(error instanceof Error ? error.message : "上传入口处理失败");
      },
    );
  }, [onFilesSelected]);

  const openVariantTargetDialog = useCallback((files: File[]) => {
    const defaultId = normalizeVariantId(defaultVariantId ?? lockedVariantGroup?.variantId);
    setPendingUploadFiles(files);
    setVariantTargetDraft({
      mode: defaultId ? "existing" : "none",
      variantId: defaultId ? String(defaultId) : "",
      name: `立绘组 ${variantGroups.length + 1}`,
    });
    setVariantTargetDialogMode("select");
    setVariantTargetDialogOpen(true);
  }, [defaultVariantId, lockedVariantGroup?.variantId, variantGroups.length]);

  const resolveVariantTargetDraft = useCallback((): UploadVariantTarget | null => {
    if (variantTargetDraft.mode === "none") {
      return { mode: "none" };
    }
    const variantId = normalizeVariantId(variantTargetDraft.variantId);
    if (!variantId) {
      appToast.error("请选择立绘组");
      return null;
    }
    return {
      mode: "existing",
      variantId,
      variantGroup: variantGroupById.get(variantId),
    };
  }, [variantGroupById, variantTargetDraft]);

  const handleFiles = useCallback(async (files: File[]) => {
    const imageFiles = (await Promise.all(files.map(async file => await normalizeImageFileOrNull(file))))
      .filter((file): file is File => Boolean(file));
    if (imageFiles.length === 0) {
      appToast.error("请选择图片文件");
      return;
    }
    if (availableVariants) {
      openVariantTargetDialog(imageFiles);
      return;
    }

    const lockedId = normalizeVariantId(lockedVariantGroup?.variantId);
    void beginUploadFlow(imageFiles, lockedId
      ? { mode: "existing", variantId: lockedId, variantGroup: lockedVariantGroup }
      : { mode: "none" });
  }, [availableVariants, beginUploadFlow, lockedVariantGroup, openVariantTargetDialog]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    if (files.length > 0) {
      void handleFiles(files);
    }
    event.currentTarget.value = "";
  }, [handleFiles]);

  React.useEffect(() => {
    if (!externalFiles?.length || !externalFilesBatchId) {
      return;
    }
    if (externalFilesHandledRef.current === externalFilesBatchId) {
      return;
    }
    externalFilesHandledRef.current = externalFilesBatchId;
    void (async () => {
      try {
        await handleFiles(externalFiles);
      }
      finally {
        onExternalFilesHandled?.();
      }
    }
    )();
  }, [externalFiles, externalFilesBatchId, handleFiles, onExternalFilesHandled]);

  const completePendingUpload = useCallback((target: UploadVariantTarget) => {
    const submission = resolvePendingAvatarUpload(pendingUploadFiles, target);
    if (!submission) {
      setVariantTargetDialogOpen(false);
      return;
    }
    setVariantTargetDialogOpen(false);
    setPendingUploadFiles(null);
    setVariantTargetDialogMode("select");
    void beginUploadFlow(submission.files, submission.target);
  }, [beginUploadFlow, pendingUploadFiles]);

  const handleConfirmVariantTarget = useCallback(() => {
    const target = resolveVariantTargetDraft();
    if (target) {
      completePendingUpload(target);
    }
  }, [completePendingUpload, resolveVariantTargetDraft]);

  const handleSkipVariantTarget = useCallback(() => {
    completePendingUpload({ mode: "none" });
  }, [completePendingUpload]);

  const handleCancelVariantTarget = useCallback(() => {
    setVariantTargetDialogOpen(false);
    setPendingUploadFiles(null);
    setVariantTargetDialogMode("select");
  }, []);

  const handleVariantTargetSelection = useCallback((variantId: number | null) => {
    setVariantTargetDraft(prev => (
      variantId == null
        ? { ...prev, mode: "none", variantId: "" }
        : { ...prev, mode: "existing", variantId: String(variantId) }
    ));
  }, []);

  const handleConfirmNewVariantTarget = useCallback((name: string) => {
    completePendingUpload({ mode: "new", name });
  }, [completePendingUpload]);

  return (
    <div className={wrapperClassName || ""}>
      <FileInput
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        multiple
      />
      <div
        className={triggerClassName || ""}
        role="button"
        tabIndex={0}
        aria-label="上传头像"
        onClick={() => {
          fileInputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        {children}
      </div>

      <VariantAssignmentDialog
        open={variantTargetDialogOpen}
        mode={variantTargetDialogMode}
        onClose={handleCancelVariantTarget}
        selectedCount={pendingUploadFiles?.length ?? 0}
        variants={variantGroups}
        selectedVariantId={variantTargetDraft.mode === "existing"
          ? normalizeVariantId(variantTargetDraft.variantId) ?? null
          : null}
        onSelectVariant={handleVariantTargetSelection}
        onConfirmSelection={handleConfirmVariantTarget}
        confirmSelectionLabel="继续校正"
        cancelSelectionLabel="暂不分组"
        onCancelSelection={handleSkipVariantTarget}
        onRequestCreate={() => setVariantTargetDialogMode("create")}
        onBackToSelection={() => setVariantTargetDialogMode("select")}
        initialVariantName={variantTargetDraft.name}
        onConfirmCreate={handleConfirmNewVariantTarget}
      />
    </div>
  );
}

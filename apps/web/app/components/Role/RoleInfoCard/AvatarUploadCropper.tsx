import React, { useCallback, useMemo, useRef, useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";

import type { RoleAvatarVariant } from "api";

import { useEscapeToClose } from "@/components/common/customHooks/useEscapeToClose";
import { normalizeImageFileOrNull } from "@/utils/media/mediaMime";

export type UploadVariantTarget =
  | { mode: "none" }
  | { mode: "existing"; variantId: number; variantGroup?: RoleAvatarVariant }
  | { mode: "new"; name: string };

export type AvatarUploadFilesContext = {
  target: UploadVariantTarget;
  batchKey: string;
}

type UploadVariantTargetDraft = {
  mode: "none" | "existing" | "new";
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

function getVariantDisplayName(variant: RoleAvatarVariant | undefined) {
  const id = normalizeVariantId(variant?.variantId);
  return String(variant?.name ?? "").trim() || `立绘组 ${id ?? ""}`;
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
  const variantTargetDialogRef = useRef<HTMLDivElement | null>(null);
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
  const [variantTargetDraft, setVariantTargetDraft] = useState<UploadVariantTargetDraft>(() => ({
    mode: "none",
    variantId: "",
    name: "立绘组 1",
  }));
  const [isSubmittingFiles, setIsSubmittingFiles] = useState(false);

  const beginUploadFlow = useCallback(async (files: File[], target: UploadVariantTarget) => {
    if (files.length === 0) {
      return;
    }
    setIsSubmittingFiles(true);
    try {
      await Promise.resolve(onFilesSelected(files, {
        target,
        batchKey: createUploadBatchKey(),
      }));
    }
    catch (error) {
      console.error("上传入口处理失败:", error);
      appToast.error(error instanceof Error ? error.message : "上传入口处理失败");
    }
    finally {
      setIsSubmittingFiles(false);
    }
  }, [onFilesSelected]);

  const openVariantTargetDialog = useCallback((files: File[]) => {
    const defaultId = normalizeVariantId(defaultVariantId ?? lockedVariantGroup?.variantId);
    setPendingUploadFiles(files);
    setVariantTargetDraft({
      mode: defaultId ? "existing" : "none",
      variantId: defaultId ? String(defaultId) : "",
      name: `立绘组 ${variantGroups.length + 1}`,
    });
    setVariantTargetDialogOpen(true);
  }, [defaultVariantId, lockedVariantGroup?.variantId, variantGroups.length]);

  const resolveVariantTargetDraft = useCallback((): UploadVariantTarget | null => {
    if (variantTargetDraft.mode === "none") {
      return { mode: "none" };
    }
    if (variantTargetDraft.mode === "new") {
      const name = variantTargetDraft.name.trim();
      if (!name) {
        appToast.error("请输入立绘组名称");
        return null;
      }
      return { mode: "new", name };
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

  const handleConfirmVariantTarget = useCallback(() => {
    const files = pendingUploadFiles;
    if (!files?.length) {
      setVariantTargetDialogOpen(false);
      return;
    }
    const target = resolveVariantTargetDraft();
    if (!target) {
      return;
    }
    setVariantTargetDialogOpen(false);
    setPendingUploadFiles(null);
    void beginUploadFlow(files, target);
  }, [beginUploadFlow, pendingUploadFiles, resolveVariantTargetDraft]);

  const handleCancelVariantTarget = useCallback(() => {
    setVariantTargetDialogOpen(false);
    setPendingUploadFiles(null);
  }, []);

  useEscapeToClose({
    enabled: variantTargetDialogOpen,
    onClose: handleCancelVariantTarget,
    containerRef: variantTargetDialogRef,
  });

  return (
    <div className={wrapperClassName || ""}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        multiple
      />
      <div
        className={triggerClassName || ""}
        role="button"
        tabIndex={isSubmittingFiles ? -1 : 0}
        aria-label="上传头像"
        aria-busy={isSubmittingFiles}
        onClick={() => {
          if (!isSubmittingFiles) {
            fileInputRef.current?.click();
          }
        }}
        onKeyDown={(event) => {
          if (isSubmittingFiles) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        {children}
      </div>

      {variantTargetDialogOpen && (
        <div
          ref={variantTargetDialogRef}
          data-modal-layer="true"
          role="dialog"
          aria-modal="true"
          aria-label="选择头像上传目标"
          className="modal modal-open"
        >
          <div className="modal-box w-[92vw] max-w-md rounded-md">
            <h3 className="text-lg font-bold">
              {pendingUploadFiles && pendingUploadFiles.length > 1 ? "批量上传头像" : "上传头像"}
            </h3>
            <p className="mt-2 text-sm text-base-content/70">
              选择本次上传的立绘组归属，确认后进入统一校正流程。
            </p>
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-base-300 px-3 py-2">
                <input
                  type="radio"
                  className="radio radio-sm"
                  checked={variantTargetDraft.mode === "none"}
                  onChange={() => setVariantTargetDraft(prev => ({ ...prev, mode: "none" }))}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">不绑定立绘组</span>
                  <span className="block text-xs text-base-content/60">只创建独立头像和立绘</span>
                </span>
              </label>

              <label className="block rounded-md border border-base-300 px-3 py-2">
                <span className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    className="radio radio-sm"
                    checked={variantTargetDraft.mode === "existing"}
                    onChange={() => setVariantTargetDraft(prev => ({
                      ...prev,
                      mode: "existing",
                      variantId: prev.variantId || String(normalizeVariantId(defaultVariantId) ?? ""),
                    }))}
                    disabled={variantGroups.length === 0}
                  />
                  <span className="text-sm font-medium">绑定到已有立绘组</span>
                </span>
                <select
                  className="select select-sm mt-2 w-full"
                  value={variantTargetDraft.variantId}
                  onChange={(event) => {
                    const variantId = event.currentTarget.value;
                    setVariantTargetDraft(prev => ({
                      ...prev,
                      mode: "existing",
                      variantId,
                    }));
                  }}
                  disabled={variantTargetDraft.mode !== "existing" || variantGroups.length === 0}
                >
                  <option value="">选择立绘组</option>
                  {variantGroups.map((variant) => {
                    const id = normalizeVariantId(variant.variantId);
                    if (!id) {
                      return null;
                    }
                    return (
                      <option key={id} value={id}>
                        {getVariantDisplayName(variant)}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="block rounded-md border border-base-300 px-3 py-2">
                <span className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    className="radio radio-sm"
                    checked={variantTargetDraft.mode === "new"}
                    onChange={() => setVariantTargetDraft(prev => ({ ...prev, mode: "new" }))}
                  />
                  <span className="text-sm font-medium">新建立绘组</span>
                </span>
                <input
                  className="input input-sm mt-2 w-full"
                  autoComplete="off"
                  aria-label="立绘组名称"
                  value={variantTargetDraft.name}
                  onChange={(event) => {
                    const name = event.currentTarget.value;
                    setVariantTargetDraft(prev => ({
                      ...prev,
                      mode: "new",
                      name,
                    }));
                  }}
                  disabled={variantTargetDraft.mode !== "new"}
                  placeholder="立绘组 1"
                />
              </label>
            </div>
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={handleCancelVariantTarget}>
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmVariantTarget}
                disabled={isSubmittingFiles}
                aria-busy={isSubmittingFiles}
              >
                {isSubmittingFiles ? "正在准备头像校正..." : "继续校正"}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="modal-backdrop"
            onClick={handleCancelVariantTarget}
            aria-label="关闭上传目标选择"
          />
        </div>
      )}
    </div>
  );
}

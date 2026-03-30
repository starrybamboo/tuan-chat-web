import type { MaterialPackageDraft } from "./materialPackageEditorShared";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { UploadUtils } from "@/utils/UploadUtils";
import { createEmptyMaterialPackageContent } from "./materialPackageEditorShared";
import { ensureMaterialPackageContent } from "./materialPackageTreeUtils";
import MaterialPackageWorkbench from "./materialPackageWorkbench";

interface MaterialPackageEditorProps {
  valueKey: string;
  dragPackageId?: number;
  selectedNodeKey?: string | null;
  title: string;
  subtitle?: string;
  initialDraft: MaterialPackageDraft;
  readOnly?: boolean;
  showPublicToggle?: boolean;
  backLabel?: string;
  onBack?: () => void;
  saveLabel?: string;
  deleteLabel?: string;
  autoSave?: boolean;
  savePending?: boolean;
  deletePending?: boolean;
  extraActionLabel?: string;
  extraActionPending?: boolean;
  onSave?: (draft: MaterialPackageDraft) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onExtraAction?: () => Promise<void> | void;
}

function normalizeDraft(draft: MaterialPackageDraft): MaterialPackageDraft {
  return {
    name: draft.name ?? "",
    description: draft.description ?? "",
    coverUrl: draft.coverUrl ?? "",
    isPublic: draft.isPublic ?? true,
    content: ensureMaterialPackageContent(draft.content ?? createEmptyMaterialPackageContent()),
  };
}

function buildSavePayload(draft: MaterialPackageDraft): MaterialPackageDraft {
  return {
    ...draft,
    name: draft.name.trim(),
    description: draft.description.trim(),
    coverUrl: draft.coverUrl.trim(),
    content: ensureMaterialPackageContent(draft.content),
  };
}

function serializeSavePayload(draft: MaterialPackageDraft): string {
  return JSON.stringify(buildSavePayload(draft));
}

type AutoSaveState = "idle" | "pending" | "saving" | "saved" | "invalid" | "error";

export default function MaterialPackageEditor({
  valueKey,
  dragPackageId,
  selectedNodeKey,
  title: _title,
  subtitle: _subtitle,
  initialDraft,
  readOnly = false,
  showPublicToggle = false,
  backLabel,
  onBack,
  saveLabel = "保存",
  deleteLabel = "删除",
  autoSave = false,
  savePending = false,
  deletePending = false,
  extraActionLabel,
  extraActionPending = false,
  onSave,
  onDelete,
  onExtraAction,
}: MaterialPackageEditorProps) {
  const uploadUtilsRef = useRef(new UploadUtils());
  const [draft, setDraft] = useState(() => normalizeDraft(initialDraft));
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("idle");
  const autoSaveTimerRef = useRef<number | null>(null);
  const lastSavedSnapshotRef = useRef(serializeSavePayload(normalizeDraft(initialDraft)));
  const lastFailedSnapshotRef = useRef<string | null>(null);
  const latestIncomingDraftRef = useRef(normalizeDraft(initialDraft));
  const draftRef = useRef(draft);
  const autoSaveEnabled = autoSave && !readOnly && Boolean(onSave);
  const savePayload = useMemo(() => buildSavePayload(draft), [draft]);
  const saveSnapshot = useMemo(() => JSON.stringify(savePayload), [savePayload]);

  latestIncomingDraftRef.current = normalizeDraft(initialDraft);
  draftRef.current = draft;

  useEffect(() => {
    const normalizedDraft = latestIncomingDraftRef.current;
    const incomingSnapshot = serializeSavePayload(normalizedDraft);
    lastSavedSnapshotRef.current = incomingSnapshot;
    lastFailedSnapshotRef.current = null;
    // 只在真正切换编辑对象时用服务端 draft 覆盖本地状态。
    // 否则父层 query 刷新时会把同一对象的旧快照重新灌进来，造成“刚新增 -> 消失 -> 又回来”的闪烁。
    setDraft(normalizedDraft);
    setAutoSaveState(autoSaveEnabled ? "saved" : "idle");
  }, [autoSaveEnabled, valueKey]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current != null) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  const handleUpdateDraft = (updater: (draft: MaterialPackageDraft) => MaterialPackageDraft) => {
    setDraft(previous => updater(previous));
  };

  const handleSave = async () => {
    if (!onSave) {
      return;
    }

    if (!draft.name.trim()) {
      toast.error("素材包名称不能为空");
      return;
    }

    await onSave(savePayload);
  };

  const handleCoverUpload = async (file: File) => {
    if (readOnly || isCoverUploading) {
      return;
    }

    setIsCoverUploading(true);
    const toastId = "material-cover-upload";
    toast.loading("封面上传中...", { id: toastId });

    try {
      const url = await uploadUtilsRef.current.uploadImg(file, 1);
      setDraft(previous => ({ ...previous, coverUrl: url }));
      toast.success("封面上传成功", { id: toastId });
    }
    catch (error) {
      const message = error instanceof Error ? error.message : "未知错误";
      toast.error(`封面上传失败：${message}`, { id: toastId });
    }
    finally {
      setIsCoverUploading(false);
    }
  };

  useEffect(() => {
    if (!autoSaveEnabled) {
      return;
    }

    if (autoSaveTimerRef.current != null) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (savePending) {
      setAutoSaveState("saving");
      return;
    }

    if (!savePayload.name) {
      if (saveSnapshot !== lastSavedSnapshotRef.current) {
        setAutoSaveState("invalid");
      }
      return;
    }

    if (saveSnapshot === lastSavedSnapshotRef.current) {
      setAutoSaveState("saved");
      return;
    }

    if (lastFailedSnapshotRef.current === saveSnapshot) {
      setAutoSaveState("error");
      return;
    }

    setAutoSaveState("pending");
    autoSaveTimerRef.current = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      setAutoSaveState("saving");
      Promise.resolve(onSave?.(savePayload))
        .then(() => {
          lastSavedSnapshotRef.current = saveSnapshot;
          lastFailedSnapshotRef.current = null;
          const latestSnapshot = serializeSavePayload(draftRef.current);
          setAutoSaveState(latestSnapshot === saveSnapshot ? "saved" : "pending");
        })
        .catch((error) => {
          const message = error instanceof Error ? error.message : "未知错误";
          lastFailedSnapshotRef.current = saveSnapshot;
          setAutoSaveState("error");
          toast.error(`自动保存失败：${message}`, { id: "material-package-auto-save" });
        });
    }, 800);
  }, [autoSaveEnabled, onSave, savePayload, savePending, saveSnapshot]);

  const autoSaveStatusText = useMemo(() => {
    if (!autoSaveEnabled) {
      return "";
    }

    switch (autoSaveState) {
      case "pending":
        return "待自动保存";
      case "saving":
        return "自动保存中...";
      case "saved":
        return "已自动保存";
      case "invalid":
        return "名称不能为空";
      case "error":
        return "自动保存失败";
      default:
        return "";
    }
  }, [autoSaveEnabled, autoSaveState]);

  const autoSaveStatusClassName = useMemo(() => {
    if (!autoSaveEnabled) {
      return "";
    }

    switch (autoSaveState) {
      case "invalid":
      case "error":
        return "text-error";
      case "saving":
      case "pending":
        return "text-base-content/55";
      default:
        return "text-base-content/45";
    }
  }, [autoSaveEnabled, autoSaveState]);

  return (
    <div className="relative flex min-h-0 flex-col text-base-content">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 px-6 py-5 md:px-8 sm:sticky sm:top-0">
        <div className="flex min-w-0 items-center">
          {backLabel && onBack && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100/80 px-4 py-2.5 text-sm font-medium text-base-content shadow-sm transition hover:border-primary/30 hover:bg-base-100"
              onClick={onBack}
            >
              <ArrowLeftIcon className="size-4" />
              <span>{backLabel}</span>
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3">
          {autoSaveEnabled && autoSaveStatusText && (
            <div className={`text-xs ${autoSaveStatusClassName}`}>
              {autoSaveStatusText}
            </div>
          )}
          {readOnly && onExtraAction && extraActionLabel && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-content shadow-[0_8px_16px_rgba(59,130,246,0.15)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(59,130,246,0.22)] disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              onClick={() => void onExtraAction()}
              disabled={extraActionPending}
            >
              {extraActionPending ? "处理中..." : extraActionLabel}
            </button>
          )}

          {!readOnly && onDelete && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-base-300 bg-base-100 px-4 py-2.5 text-sm font-medium text-base-content transition hover:border-error/30 hover:bg-error/10 hover:text-error disabled:opacity-60"
              onClick={() => void onDelete()}
              disabled={deletePending || savePending}
            >
              {deletePending ? "删除中..." : deleteLabel}
            </button>
          )}
          {!readOnly && onSave && !autoSaveEnabled && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-content shadow-[0_8px_16px_rgba(59,130,246,0.15)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(59,130,246,0.22)] disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              onClick={() => void handleSave()}
              disabled={savePending}
            >
              {savePending ? "保存中..." : saveLabel}
            </button>
          )}
        </div>
      </div>

      <MaterialPackageWorkbench
        selectionSyncKey={valueKey}
        dragPackageId={dragPackageId}
        requestedSelectedNodeKey={selectedNodeKey}
        draft={draft}
        readOnly={readOnly}
        showPublicToggle={showPublicToggle}
        isCoverUploading={isCoverUploading}
        onUpdateDraft={handleUpdateDraft}
        onCoverUpload={(file) => { void handleCoverUpload(file); }}
      />
    </div>
  );
}

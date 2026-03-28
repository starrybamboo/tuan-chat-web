import type { MaterialPackageDraft } from "./materialPackageEditorShared";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { UploadUtils } from "@/utils/UploadUtils";
import { createEmptyMaterialPackageContent } from "./materialPackageEditorShared";
import MaterialPackageOverview from "./materialPackageOverview";
import { ensureMaterialPackageContent } from "./materialPackageTreeUtils";
import MaterialPackageWorkbench from "./materialPackageWorkbench";

interface MaterialPackageEditorProps {
  valueKey: string;
  title: string;
  subtitle?: string;
  initialDraft: MaterialPackageDraft;
  readOnly?: boolean;
  showPublicToggle?: boolean;
  saveLabel?: string;
  deleteLabel?: string;
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

export default function MaterialPackageEditor({
  valueKey,
  title,
  subtitle,
  initialDraft,
  readOnly = false,
  showPublicToggle = false,
  saveLabel = "保存",
  deleteLabel = "删除",
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
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState(false);
  const [workbenchFocusKey, setWorkbenchFocusKey] = useState<string | null>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);

  useEffect(() => {
    setDraft(normalizeDraft(initialDraft));
    setIsWorkbenchOpen(false);
    setWorkbenchFocusKey(null);
  }, [initialDraft, valueKey]);

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

    await onSave({
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      coverUrl: draft.coverUrl.trim(),
      content: ensureMaterialPackageContent(draft.content),
    });
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

  const handleOpenWorkbench = (pathKey?: string) => {
    if (readOnly) {
      return;
    }

    setWorkbenchFocusKey(pathKey ?? null);
    setIsWorkbenchOpen(true);
  };

  if (isWorkbenchOpen && !readOnly) {
    return (
      <div className="rounded-[28px] border border-base-300 bg-base-100/95 text-base-content shadow-xl">
        <MaterialPackageWorkbench
          draft={draft}
          showPublicToggle={showPublicToggle}
          saveLabel={saveLabel}
          deleteLabel={deleteLabel}
          savePending={savePending}
          deletePending={deletePending}
          focusPathKey={workbenchFocusKey}
          onBack={() => setIsWorkbenchOpen(false)}
          onUpdateDraft={handleUpdateDraft}
          onSave={handleSave}
          onDelete={onDelete}
        />
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-base-300 bg-base-100/95 text-base-content shadow-xl">
      <div className="border-b border-base-300 px-6 py-6 md:px-8">
        <div className="text-2xl font-semibold tracking-tight text-base-content">{title}</div>
        {subtitle && <div className="mt-2 max-w-3xl text-sm leading-7 text-base-content/60">{subtitle}</div>}
      </div>

      <MaterialPackageOverview
        draft={draft}
        readOnly={readOnly}
        showPublicToggle={showPublicToggle}
        saveLabel={saveLabel}
        deleteLabel={deleteLabel}
        savePending={savePending}
        deletePending={deletePending}
        extraActionLabel={extraActionLabel}
        extraActionPending={extraActionPending}
        isCoverUploading={isCoverUploading}
        onUpdateDraft={handleUpdateDraft}
        onOpenWorkbench={handleOpenWorkbench}
        onCoverUpload={(file) => { void handleCoverUpload(file); }}
        onSave={handleSave}
        onDelete={onDelete}
        onExtraAction={onExtraAction}
      />
    </div>
  );
}

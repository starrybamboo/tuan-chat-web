import type { MaterialPackageContent } from "../../../../api/models/MaterialPackageContent";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import MaterialPackageTreePreview from "./materialPackageTreePreview";

export type MaterialPackageDraft = {
  name: string;
  description: string;
  coverUrl: string;
  isPublic: boolean;
  content: MaterialPackageContent;
};

type MaterialPackageEditorProps = {
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
  onSave?: (draft: MaterialPackageDraft) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
};

export function createEmptyMaterialPackageContent(): MaterialPackageContent {
  return {
    version: 1,
    root: [],
  };
}

function normalizeDraft(draft: MaterialPackageDraft): MaterialPackageDraft {
  return {
    name: draft.name ?? "",
    description: draft.description ?? "",
    coverUrl: draft.coverUrl ?? "",
    isPublic: draft.isPublic ?? true,
    content: draft.content ?? createEmptyMaterialPackageContent(),
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
  onSave,
  onDelete,
}: MaterialPackageEditorProps) {
  const normalizedInitialDraft = normalizeDraft(initialDraft);
  const [name, setName] = useState(normalizedInitialDraft.name);
  const [description, setDescription] = useState(normalizedInitialDraft.description);
  const [coverUrl, setCoverUrl] = useState(normalizedInitialDraft.coverUrl);
  const [isPublic, setIsPublic] = useState(normalizedInitialDraft.isPublic);
  const [contentText, setContentText] = useState(
    JSON.stringify(normalizedInitialDraft.content ?? createEmptyMaterialPackageContent(), null, 2),
  );

  useEffect(() => {
    const nextDraft = normalizeDraft(initialDraft);
    setName(nextDraft.name);
    setDescription(nextDraft.description);
    setCoverUrl(nextDraft.coverUrl);
    setIsPublic(nextDraft.isPublic);
    setContentText(JSON.stringify(nextDraft.content ?? createEmptyMaterialPackageContent(), null, 2));
  }, [valueKey]);

  const parsedContent = useMemo(() => {
    try {
      return JSON.parse(contentText) as MaterialPackageContent;
    }
    catch {
      return null;
    }
  }, [contentText]);

  const handleSave = async () => {
    if (!onSave) {
      return;
    }
    if (!name.trim()) {
      toast.error("素材包名称不能为空");
      return;
    }
    if (!parsedContent) {
      toast.error("素材包 JSON 不合法");
      return;
    }
    await onSave({
      name: name.trim(),
      description: description.trim(),
      coverUrl: coverUrl.trim(),
      isPublic,
      content: parsedContent,
    });
  };

  const fieldClassName = "w-full rounded-md border border-white/10 bg-[#0b111c] px-3 py-2.5 text-sm text-white/90 placeholder:text-white/28 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";
  const textareaClassName = "w-full rounded-md border border-white/10 bg-[#0b111c] px-3 py-3 text-sm text-white/90 placeholder:text-white/28 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="rounded-[28px] border border-white/10 bg-[#101723]/95 text-white shadow-xl">
      <div className="border-b border-white/10 px-6 py-5">
        <div className="text-xl font-semibold text-white/94">{title}</div>
        {subtitle && <div className="mt-1 text-sm text-white/45">{subtitle}</div>}
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/78">素材包名称</span>
            <input
              type="text"
              className={fieldClassName}
              value={name}
              onChange={event => setName(event.target.value)}
              disabled={readOnly}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/78">封面 URL</span>
            <input
              type="text"
              className={fieldClassName}
              value={coverUrl}
              onChange={event => setCoverUrl(event.target.value)}
              disabled={readOnly}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/78">描述</span>
            <textarea
              className={`${textareaClassName} min-h-28`}
              value={description}
              onChange={event => setDescription(event.target.value)}
              disabled={readOnly}
            />
          </label>

          {showPublicToggle && (
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div>
                <div className="font-medium text-white/88">公开到素材广场</div>
                <div className="text-sm text-white/42">关闭后只有你自己还能在局外素材库里看到这个包。</div>
              </div>
              <button
                type="button"
                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition ${
                  isPublic
                    ? "border-primary/40 bg-primary/90"
                    : "border-white/12 bg-white/[0.05]"
                } ${readOnly ? "cursor-not-allowed opacity-60" : "hover:border-primary/40"}`}
                aria-pressed={isPublic}
                onClick={() => {
                  if (readOnly) {
                    return;
                  }
                  setIsPublic(prev => !prev);
                }}
                disabled={readOnly}
              >
                <span
                  className={`inline-block size-6 rounded-full bg-white shadow transition-transform ${
                    isPublic ? "translate-x-[1.45rem]" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}

          <label className="block space-y-2">
            <span className="text-sm font-medium text-white/78">素材包 JSON</span>
            <textarea
              className={`${textareaClassName} min-h-[420px] font-mono text-xs leading-6 ${parsedContent ? "" : "border-error text-error"}`}
              value={contentText}
              onChange={event => setContentText(event.target.value)}
              disabled={readOnly}
              spellCheck={false}
            />
            <span className={`text-xs ${parsedContent ? "text-white/40" : "text-error"}`}>
              {parsedContent ? "会按当前 JSON 保存。" : "JSON 解析失败，保存前需要修正。"}
            </span>
          </label>

          {!readOnly && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSave()}
                disabled={savePending}
              >
                {savePending ? "保存中..." : saveLabel}
              </button>
              {onDelete && (
                <button
                  type="button"
                  className="btn btn-outline btn-error"
                  onClick={() => void onDelete()}
                  disabled={deletePending}
                >
                  {deletePending ? "删除中..." : deleteLabel}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-[#0b111c] p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-white/72">树形预览</div>
              <div className="text-xs text-white/34">
                {parsedContent?.root?.length ?? 0}
                个根节点
              </div>
            </div>
            <MaterialPackageTreePreview
              nodes={parsedContent?.root}
              emptyText={readOnly ? "这个素材包当前没有可预览的节点。" : "先在左边 JSON 里定义 folder / material 节点。"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

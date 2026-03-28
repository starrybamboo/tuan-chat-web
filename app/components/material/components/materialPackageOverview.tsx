import type { MaterialPackageDraft } from "./materialPackageEditorShared";
import { ImageIcon, PackageIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import {
  collectMaterialOverview,
  countFolderNodes,
  countMaterialAssets,
  countMaterialNodes,
} from "./materialPackageTreeUtils";

interface MaterialPackageOverviewProps {
  draft: MaterialPackageDraft;
  readOnly: boolean;
  showPublicToggle: boolean;
  saveLabel: string;
  deleteLabel: string;
  savePending: boolean;
  deletePending: boolean;
  extraActionLabel?: string;
  extraActionPending?: boolean;
  isCoverUploading: boolean;
  onUpdateDraft: (updater: (draft: MaterialPackageDraft) => MaterialPackageDraft) => void;
  onOpenWorkbench: (pathKey?: string) => void;
  onCoverUpload: (file: File) => void;
  onSave?: () => void;
  onDelete?: () => void;
  onExtraAction?: () => void;
}

export default function MaterialPackageOverview({
  draft,
  readOnly,
  showPublicToggle,
  saveLabel,
  deleteLabel,
  savePending,
  deletePending,
  extraActionLabel,
  extraActionPending = false,
  isCoverUploading,
  onUpdateDraft,
  onOpenWorkbench,
  onCoverUpload,
  onSave,
  onDelete,
  onExtraAction,
}: MaterialPackageOverviewProps) {
  const materialItems = collectMaterialOverview(draft.content.root);
  const folderCount = countFolderNodes(draft.content.root);
  const materialCount = countMaterialNodes(draft.content.root);
  const assetCount = countMaterialAssets(draft.content.root);
  const fieldClassName = "w-full rounded-md border border-base-300 bg-base-200/80 px-3 py-2.5 text-sm text-base-content placeholder:text-base-content/35 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";
  const textareaClassName = "w-full rounded-md border border-base-300 bg-base-200/80 px-3 py-3 text-sm text-base-content placeholder:text-base-content/35 transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="space-y-8 p-6 md:p-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-base-content/80">素材包名称</span>
            <input
              type="text"
              className={fieldClassName}
              value={draft.name}
              onChange={event => onUpdateDraft(current => ({ ...current, name: event.target.value }))}
              disabled={readOnly}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-base-content/80">描述</span>
            <textarea
              className={`${textareaClassName} min-h-32`}
              value={draft.description}
              onChange={event => onUpdateDraft(current => ({ ...current, description: event.target.value }))}
              disabled={readOnly}
            />
          </label>

          {showPublicToggle && (
            <div className="flex items-center justify-between rounded-2xl border border-base-300 bg-base-200/55 px-4 py-3">
              <div>
                <div className="font-medium text-base-content/90">公开至素材广场</div>
                <div className="text-sm text-base-content/60">允许其他创作者浏览并下载此素材包。</div>
              </div>
              <button
                type="button"
                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition ${
                  draft.isPublic
                    ? "border-primary/40 bg-primary/90"
                    : "border-base-300 bg-base-100"
                } ${readOnly ? "cursor-not-allowed opacity-60" : "hover:border-primary/40"}`}
                aria-pressed={draft.isPublic}
                onClick={() => {
                  if (!readOnly) {
                    onUpdateDraft(current => ({ ...current, isPublic: !current.isPublic }));
                  }
                }}
                disabled={readOnly}
              >
                <span
                  className={`inline-block size-6 rounded-full bg-white shadow transition-transform ${
                    draft.isPublic ? "translate-x-[1.45rem]" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        <div className="rounded-[26px] border border-base-300 bg-base-200/55 p-4">
          <div className="mb-3 text-sm font-medium text-base-content/75">封面图片</div>
          <div className="overflow-hidden rounded-[22px] border border-base-300 bg-base-950/90 shadow-inner">
            {draft.coverUrl
              ? (
                  <img
                    src={draft.coverUrl}
                    alt={draft.name || "素材包封面"}
                    className="aspect-square w-full object-cover"
                  />
                )
              : (
                  <div className="flex aspect-square w-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(2,6,23,1))] text-base-content/40">
                    <PackageIcon className="size-16" weight="fill" />
                  </div>
                )}
          </div>

          {!readOnly && (
            <div className="mt-4">
              <ImgUploader setImg={file => onCoverUpload(file)}>
                <button
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm font-medium text-base-content transition hover:border-primary/30 hover:bg-base-100/90"
                  disabled={isCoverUploading}
                >
                  <ImageIcon className="size-4" />
                  <span>{isCoverUploading ? "上传中..." : "上传封面"}</span>
                </button>
              </ImgUploader>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[26px] border border-base-300 bg-base-200/45 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-base-content">素材概览</div>
            <div className="flex flex-wrap gap-2 text-xs text-base-content/60">
              <span className="rounded-full border border-base-300 bg-base-100/80 px-3 py-1">{`${folderCount} 个文件夹`}</span>
              <span className="rounded-full border border-base-300 bg-base-100/80 px-3 py-1">{`${materialCount} 个素材`}</span>
              <span className="rounded-full border border-base-300 bg-base-100/80 px-3 py-1">{`${assetCount} 个素材条目`}</span>
            </div>
          </div>

          {!readOnly && (
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-primary/35 bg-primary px-5 py-3 text-sm font-semibold text-primary-content shadow-[0_18px_38px_rgba(59,130,246,0.22)] transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_24px_48px_rgba(59,130,246,0.28)]"
              onClick={() => onOpenWorkbench()}
            >
              <PencilSimpleIcon className="size-4" weight="bold" />
              <span>编辑素材结构</span>
            </button>
          )}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {materialItems.map(item => (
            <div
              key={item.key}
              className="rounded-[22px] border border-base-300 bg-base-100/85 p-5 shadow-sm"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  {item.folderTrail.length > 0 && (
                    <div className="text-[11px] uppercase tracking-[0.24em] text-base-content/45">
                      {item.folderTrail.join(" / ")}
                    </div>
                  )}
                  <div className="text-lg font-semibold text-base-content">{item.title}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-base-content/60">
                    <span>{`${item.assetCount} 个素材条目`}</span>
                    {item.assetKinds.map(kind => (
                      <span
                        key={`${item.key}-${kind}`}
                        className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-primary"
                      >
                        {kind}
                      </span>
                    ))}
                  </div>
                </div>

                {item.note && (
                  <div className="line-clamp-3 text-sm leading-6 text-base-content/62">{item.note}</div>
                )}

                {!readOnly && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm text-base-content transition hover:border-primary/30 hover:bg-base-100/90"
                      onClick={() => onOpenWorkbench(item.key)}
                    >
                      <PencilSimpleIcon className="size-4" />
                      <span>编辑</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {materialItems.length === 0 && (
            <div className="rounded-[22px] border border-dashed border-base-300 bg-base-100/65 px-6 py-12 text-center lg:col-span-2">
              <div className="text-lg font-semibold text-base-content">这个素材包还没有素材内容</div>
              <div className="mt-3 text-sm leading-7 text-base-content/58">
                {readOnly
                  ? "当前只能查看概览，你可以先浏览这个素材包的基础信息。"
                  : "先进入编辑工作区，创建文件夹和素材单元，再逐步整理内容。"}
              </div>
            </div>
          )}
        </div>
      </div>

      {readOnly && onExtraAction && extraActionLabel && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-content shadow-[0_18px_38px_rgba(59,130,246,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(59,130,246,0.28)]"
            onClick={() => void onExtraAction()}
            disabled={extraActionPending}
          >
            {extraActionPending ? "处理中..." : extraActionLabel}
          </button>
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {onDelete && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-base-300 bg-base-100 px-4 py-2.5 text-sm font-medium text-base-content transition hover:border-error/30 hover:bg-error/10 hover:text-error"
              onClick={() => void onDelete()}
              disabled={deletePending}
            >
              {deletePending ? "删除中..." : deleteLabel}
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-content shadow-[0_18px_38px_rgba(59,130,246,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(59,130,246,0.28)]"
            onClick={() => void onSave?.()}
            disabled={savePending}
          >
            {savePending ? "保存中..." : saveLabel}
          </button>
        </div>
      )}
    </div>
  );
}

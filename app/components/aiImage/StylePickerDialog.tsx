import type { AiImageStylePreset } from "@/utils/aiImageStylePresets";

import { useEffect, useState } from "react";

interface StylePickerDialogProps {
  isOpen: boolean;
  selectedStyleIds: string[];
  compareStyleId: string | null;
  stylePresets: AiImageStylePreset[];
  onToggleStyle: (id: string) => void;
  onSelectCompareStyle: (id: string) => void;
  onClearStyles: () => void;
  onClearCompareStyle: () => void;
  onClose: () => void;
}

export function StylePickerDialog({
  isOpen,
  selectedStyleIds,
  compareStyleId,
  stylePresets,
  onToggleStyle,
  onSelectCompareStyle,
  onClearStyles,
  onClearCompareStyle,
  onClose,
}: StylePickerDialogProps) {
  const [viewMode, setViewMode] = useState<"select" | "compare">("select");
  const selectedStyleIdSet = new Set(selectedStyleIds);
  const currentCountLabel = viewMode === "compare"
    ? (compareStyleId ? "已选 1 个" : "")
    : (selectedStyleIds.length ? `已选 ${selectedStyleIds.length} 个` : "");

  useEffect(() => {
    if (!isOpen)
      setViewMode("select");
  }, [isOpen]);

  return (
    <dialog
      open={isOpen}
      className={`modal ${isOpen ? "modal-open" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-box relative flex max-h-[min(94vh,1080px)] max-w-[min(96vw,1680px)] flex-col overflow-hidden border border-base-300 bg-base-100 p-0 text-base-content shadow-xl">
        <div className="flex items-center gap-4 border-b border-base-300 px-6 py-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">选择画风</h3>
            <button
              type="button"
              className={`btn btn-sm ${viewMode === "compare" ? "btn-primary" : "btn-ghost"}`}
              aria-pressed={viewMode === "compare"}
              onClick={() => setViewMode(prev => (prev === "compare" ? "select" : "compare"))}
            >
              风格对比
            </button>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="text-xs opacity-70">{currentCountLabel}</div>
            {(viewMode === "compare" ? Boolean(compareStyleId) : selectedStyleIds.length > 0)
              ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={viewMode === "compare" ? onClearCompareStyle : onClearStyles}
                  >
                    清空
                  </button>
                )
              : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {viewMode === "compare"
            ? (
                <div className="flex flex-wrap gap-4">
                {stylePresets.map((preset) => {
                  const selected = compareStyleId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`group flex w-[300px] flex-col overflow-hidden rounded-md border text-left transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        selected
                          ? "border-primary bg-primary/[0.04] shadow-[0_0_0_1px_rgba(47,183,168,0.18)]"
                          : "border-base-300 bg-base-100 hover:border-primary/45"
                      }`}
                      onClick={() => onSelectCompareStyle(preset.id)}
                      title={preset.tags.length ? preset.tags.join(", ") : preset.title}
                    >
                      <div className="relative h-[300px] w-[300px] overflow-hidden bg-base-200">
                        {preset.imageUrl
                          ? <img src={preset.imageUrl} alt={preset.title} className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" />
                          : <div className="flex h-full w-full items-center justify-center text-sm opacity-60">{preset.title}</div>}
                        {selected
                          ? <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-1 text-[11px] font-medium text-primary-content">已选</span>
                          : null}
                      </div>
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className="truncate text-sm font-medium text-base-content">{preset.title}</span>
                        <span className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-primary" : "bg-base-300"}`} />
                      </div>
                    </button>
                  );
                })}
                {!stylePresets.length
                  ? <div className="text-sm opacity-60">暂无画风</div>
                  : null}
                </div>
              )
            : (
                <div className="flex flex-wrap gap-4">
                {stylePresets.map((preset) => {
                  const selected = selectedStyleIdSet.has(preset.id);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`flex w-[300px] flex-col overflow-hidden rounded-md border text-left transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${selected ? "border-primary bg-primary/[0.04]" : "border-base-300 bg-base-100 hover:border-primary/45"}`}
                      onClick={() => onToggleStyle(preset.id)}
                      title={preset.tags.length ? preset.tags.join(", ") : preset.title}
                    >
                      <div className="flex h-[300px] w-full items-center justify-center overflow-hidden bg-base-200">
                        {preset.imageUrl
                          ? <img src={preset.imageUrl} alt={preset.title} className="h-full w-full object-cover" />
                          : <div className="text-xs opacity-60">{preset.title}</div>}
                      </div>
                      <div className="flex flex-col gap-1 px-3 py-2">
                        <div className="truncate text-sm font-medium">{preset.title}</div>
                        <div className="truncate text-xs opacity-60">
                          {preset.tags.length ? preset.tags.join(", ") : preset.title}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {!stylePresets.length
                  ? <div className="text-sm opacity-60">暂无画风</div>
                  : null}
                </div>
              )}
        </div>

        <div className="modal-action mt-0 border-t border-base-300 px-6 py-4">
          <button type="button" className="btn" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

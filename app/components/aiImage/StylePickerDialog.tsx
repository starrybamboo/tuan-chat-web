import type { AiImageStylePreset } from "@/utils/aiImageStylePresets";

import { useEffect, useState } from "react";

interface StylePickerDialogProps {
  isOpen: boolean;
  selectedStyleIds: string[];
  stylePresets: AiImageStylePreset[];
  onToggleStyle: (id: string) => void;
  onSelectSingleStyle: (id: string) => void;
  onClearStyles: () => void;
  onClose: () => void;
}

export function StylePickerDialog({
  isOpen,
  selectedStyleIds,
  stylePresets,
  onToggleStyle,
  onSelectSingleStyle,
  onClearStyles,
  onClose,
}: StylePickerDialogProps) {
  const [viewMode, setViewMode] = useState<"select" | "compare">("select");
  const selectedStyleIdSet = new Set(selectedStyleIds);
  const orderedStylePresets = [...stylePresets].sort((left, right) => {
    const selectedDelta = Number(selectedStyleIdSet.has(right.id)) - Number(selectedStyleIdSet.has(left.id));
    if (selectedDelta !== 0)
      return selectedDelta;
    return left.title.localeCompare(right.title);
  });

  useEffect(() => {
    if (!isOpen)
      setViewMode("select");
  }, [isOpen]);

  useEffect(() => {
    if (viewMode !== "compare")
      return;
    if (selectedStyleIds.length <= 1)
      return;
    onSelectSingleStyle(selectedStyleIds[0]);
  }, [onSelectSingleStyle, selectedStyleIds, viewMode]);

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
            <div className="text-xs opacity-70">{selectedStyleIds.length ? `已选 ${selectedStyleIds.length} 个` : ""}</div>
            {selectedStyleIds.length
              ? <button type="button" className="btn btn-sm btn-ghost" onClick={onClearStyles}>清空</button>
              : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {viewMode === "compare"
            ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {orderedStylePresets.map((preset) => {
                  const selected = selectedStyleIdSet.has(preset.id);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`group flex flex-col overflow-hidden rounded-md border text-left transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                        selected
                          ? "border-primary bg-primary/[0.04] shadow-[0_0_0_1px_rgba(47,183,168,0.18)]"
                          : "border-base-300 bg-base-100 hover:border-primary/45"
                      }`}
                      onClick={() => onSelectSingleStyle(preset.id)}
                      title={preset.tags.length ? preset.tags.join(", ") : preset.title}
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-base-200">
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
                {!orderedStylePresets.length
                  ? <div className="text-sm opacity-60">暂无画风</div>
                  : null}
                </div>
              )
            : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
                {stylePresets.map((preset) => {
                  const selected = selectedStyleIdSet.has(preset.id);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`flex flex-col gap-2 rounded-md border p-2 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/20 ${selected ? "border-primary bg-primary/[0.04]" : "border-base-300 bg-base-100 hover:border-primary/45"}`}
                      onClick={() => onToggleStyle(preset.id)}
                      title={preset.tags.length ? preset.tags.join(", ") : preset.title}
                    >
                      <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-base-200">
                        {preset.imageUrl
                          ? <img src={preset.imageUrl} alt={preset.title} className="h-full w-full object-cover" />
                          : <div className="text-xs opacity-60">{preset.title}</div>}
                      </div>
                      <div className="truncate text-sm font-medium">{preset.title}</div>
                      <div className="truncate text-xs opacity-60">
                        {preset.tags.length ? preset.tags.join(", ") : preset.title}
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

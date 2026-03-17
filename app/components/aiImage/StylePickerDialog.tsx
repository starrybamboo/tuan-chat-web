import type { AiImageStylePreset } from "@/utils/aiImageStylePresets";

interface StylePickerDialogProps {
  isOpen: boolean;
  selectedStyleIds: string[];
  stylePresets: AiImageStylePreset[];
  onToggleStyle: (id: string) => void;
  onClearStyles: () => void;
  onClose: () => void;
}

export function StylePickerDialog({
  isOpen,
  selectedStyleIds,
  stylePresets,
  onToggleStyle,
  onClearStyles,
  onClose,
}: StylePickerDialogProps) {
  return (
    <dialog
      open={isOpen}
      className={`modal ${isOpen ? "modal-open" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-box max-w-5xl">
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-lg font-bold">选择画风</h3>
          <div className="ml-auto flex items-center gap-2">
            <div className="text-xs opacity-70">{selectedStyleIds.length ? `已选 ${selectedStyleIds.length} 个` : ""}</div>
            {selectedStyleIds.length
              ? <button type="button" className="btn btn-sm btn-ghost" onClick={onClearStyles}>清空</button>
              : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {stylePresets.map((preset) => {
            const selected = selectedStyleIds.includes(preset.id);
            return (
              <button
                key={preset.id}
                type="button"
                className={`flex flex-col gap-2 rounded-box border p-2 text-left ${selected ? "border-primary" : "border-base-300"}`}
                onClick={() => onToggleStyle(preset.id)}
                title={preset.tags.length ? preset.tags.join(", ") : preset.title}
              >
                <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-box bg-base-200">
                  {preset.imageUrl
                    ? <img src={preset.imageUrl} alt={preset.title} className="h-full w-full object-cover" />
                    : <div className="text-xs opacity-60">{preset.title}</div>}
                </div>
                <div className="truncate text-sm font-medium">{preset.title}</div>
                <div className="truncate text-xs opacity-60">
                  {preset.tags.length ? preset.tags.join(", ") : "（未配置 tags）"}
                </div>
              </button>
            );
          })}
          {!stylePresets.length
            ? (
                <div className="text-sm opacity-60">
                  暂无画风。请在 app/assets/ai-image/styles/ 下放图片（例如 oil-painting.webp），并在 app/utils/aiImageStylePresets.ts 配置对应 tags。
                </div>
              )
            : null}
        </div>

        <div className="modal-action">
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

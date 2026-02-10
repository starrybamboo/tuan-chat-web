import type { ReactNode } from "react";
import type { WebgalChooseOptionDraft } from "./webgalChooseDraft";
import { createPortal } from "react-dom";

interface WebgalChooseModalProps {
  isOpen: boolean;
  title: string;
  description?: ReactNode;
  options: WebgalChooseOptionDraft[];
  error?: string | null;
  submitLabel?: string;
  onChangeOption: (index: number, key: keyof WebgalChooseOptionDraft, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function WebgalChooseModal({
  isOpen,
  title,
  description,
  options,
  error,
  submitLabel = "确认",
  onChangeOption,
  onAddOption,
  onRemoveOption,
  onClose,
  onSubmit,
}: WebgalChooseModalProps) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const webgalChooseInputClass = "w-full rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

  return createPortal(
    <div className="modal modal-open z-9999">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg">{title}</h3>
        <div className="py-4 space-y-3">
          {description && (
            <div className="text-xs opacity-70">{description}</div>
          )}
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={option.id} className="rounded-md border border-base-300/70 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    选项
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => onRemoveOption(index)}
                    disabled={options.length <= 1}
                  >
                    删除
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    className={webgalChooseInputClass}
                    placeholder="选项文本"
                    value={option.text}
                    onChange={e => onChangeOption(index, "text", e.target.value)}
                  />
                  <textarea
                    className={`${webgalChooseInputClass} min-h-24 font-mono`}
                    placeholder="自定义代码（可选）"
                    value={option.code}
                    onChange={e => onChangeOption(index, "code", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-sm" onClick={onAddOption}>
            添加选项
          </button>
          {error && (
            <div className="text-error text-sm">{error}</div>
          )}
        </div>
        <div className="modal-action">
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="button" className="btn btn-primary" onClick={onSubmit}>{submitLabel}</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>,
    document.body,
  );
}

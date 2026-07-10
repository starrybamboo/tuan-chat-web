import type { ReactNode } from "react";

import { createPortal } from "react-dom";

import type { WebgalChooseOptionDraft } from "./webgalChooseDraft";

type WebgalChooseModalProps = {
  isOpen: boolean;
  title: string;
  description?: ReactNode;
  options: WebgalChooseOptionDraft[];
  error?: string | null;
  submitLabel?: string;
  /** 提交进行中：用于禁用按钮并宣告 busy 状态。 */
  isSubmitting?: boolean;
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
  isSubmitting = false,
  onChangeOption,
  onAddOption,
  onRemoveOption,
  onClose,
  onSubmit,
}: WebgalChooseModalProps) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  const webgalChooseInputClass = "w-full rounded-md border border-base-300 bg-base-100 px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info";

  return createPortal(
    <div className="modal modal-open z-9999">
      <div
        className="modal-box max-w-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="WebGAL 选项设置"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onClose();
          }
        }}
      >
        <h3 className="font-bold text-lg">{title}</h3>
        <div className="py-4 space-y-3">
          {description && (
            <div className="text-xs opacity-70">{description}</div>
          )}
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={option.id} className="
                rounded-md border border-base-300/70 p-3 space-y-2
              ">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">
                    选项
                    {index + 1}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    aria-label={`删除第 ${index + 1} 个选项`}
                    onClick={() => onRemoveOption(index)}
                    disabled={options.length <= 1}
                  >
                    删除
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    className={webgalChooseInputClass}
                    autoComplete="off"
                    aria-label="选项文本"
                    placeholder="选项文本"
                    value={option.text}
                    onChange={e => onChangeOption(index, "text", e.target.value)}
                  />
                  <textarea
                    className={`
                      ${webgalChooseInputClass}
                      min-h-24 font-mono
                    `}
                    autoComplete="off"
                    aria-label="自定义代码"
                    placeholder="自定义代码（可选）"
                    value={option.code}
                    onChange={e => onChangeOption(index, "code", e.target.value)}
                  />
                  <p className="text-xs text-base-content/60">
                    留空则该选项仅展示文本；填写后将作为该选项的自定义脚本代码。
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-sm" onClick={onAddOption}>
            添加选项
          </button>
          {error && (
            <div className="text-error text-sm" role="alert">{error}</div>
          )}
        </div>
        <div className="modal-action">
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={isSubmitting} aria-busy={isSubmitting ? "true" : "false"}>{submitLabel}</button>
        </div>
      </div>
      <button type="button" className="modal-backdrop" onClick={onClose} aria-label="关闭 WebGAL 选项弹窗" />
    </div>,
    document.body,
  );
}

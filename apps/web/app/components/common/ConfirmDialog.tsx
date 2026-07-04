import type { ReactNode } from "react";

import { useCallback, useState } from "react";
import { create } from "zustand";

import { Button, type ButtonVariant } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";

/**
 * 统一确认弹窗：替代 comfirmModel / window.confirm / aiImage HistoryConfirmModal。
 *
 * - 声明式：<ConfirmDialog open onOpenChange title description variant icon onConfirm />
 * - 命令式：const ok = await confirm({ title, description, variant });
 *
 * 在 __root 挂载 <ConfirmDialogProvider /> 以启用命令式 confirm()。
 */
export type ConfirmVariant = "danger" | "warning" | "info";

export type ConfirmOptions = {
  title: string;
  /** 正文，可为字符串或自定义节点（对应旧 comfirmModel 的 message）。 */
  description?: ReactNode;
  variant?: ConfirmVariant;
  /** 圆形图标容器，吸收自 aiImage HistoryConfirmModal。 */
  icon?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmDialogProps = ConfirmOptions & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 确认回调；可为 async，期间按钮显示 loading。 */
  onConfirm?: () => void | Promise<void>;
};

const VARIANT_BUTTON: Record<ConfirmVariant, ButtonVariant> = {
  danger: "error",
  warning: "warning",
  info: "primary",
};

const VARIANT_ICON: Record<ConfirmVariant, string> = {
  danger: "bg-error/15 text-error",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
};

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  variant = "danger",
  icon,
  confirmLabel = "确认",
  cancelLabel = "取消",
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!onConfirm) {
      onOpenChange(false);
      return;
    }
    try {
      setBusy(true);
      await onConfirm();
      onOpenChange(false);
    }
    finally {
      setBusy(false);
    }
  }, [onConfirm, onOpenChange]);

  return (
    <Modal open={open} onOpenChange={onOpenChange} size="sm" ariaLabel={title}>
      <div className="flex flex-col items-center gap-3 text-center">
        {icon
          ? (
              <div className={`flex size-12 items-center justify-center rounded-full ${VARIANT_ICON[variant]}`}>
                {icon}
              </div>
            )
          : null}
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <div className="text-sm text-base-content/75">{description}</div> : null}
        <div className="mt-2 flex w-full gap-2">
          <Button variant="neutral" className="flex-1" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant={VARIANT_BUTTON[variant]} className="flex-1" loading={busy} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// —— 命令式 API ——

type ConfirmState = {
  open: boolean;
  options: ConfirmOptions;
  resolver: ((ok: boolean) => void) | null;
  show: (options: ConfirmOptions) => Promise<boolean>;
  resolve: (ok: boolean) => void;
};

const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  options: { title: "" },
  resolver: null,
  show: options =>
    new Promise<boolean>((resolve) => {
      set({ open: true, options, resolver: resolve });
    }),
  resolve: (ok) => {
    const { resolver } = get();
    resolver?.(ok);
    set({ open: false, resolver: null });
  },
}));

/** 命令式确认：const ok = await confirm({ title, variant })。 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().show(options);
}

/** 在应用根部挂载一次，承载命令式 confirm() 的弹窗。 */
export function ConfirmDialogProvider() {
  const open = useConfirmStore(state => state.open);
  const options = useConfirmStore(state => state.options);
  const resolve = useConfirmStore(state => state.resolve);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          resolve(false);
        }
      }}
      onConfirm={() => {
        resolve(true);
      }}
      {...options}
    />
  );
}

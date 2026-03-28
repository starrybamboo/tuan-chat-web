import type { ReactNode } from "react";
import { XIcon } from "@phosphor-icons/react";

type MaterialPackageEditorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export default function MaterialPackageEditorModal({
  isOpen,
  onClose,
  children,
}: MaterialPackageEditorModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="关闭素材包编辑弹层"
        onClick={onClose}
      />
      <div className="relative z-[81] max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-[30px] border border-white/10 bg-[#0f1622] shadow-[0_30px_80px_rgba(2,6,23,0.56)]">
        <button
          type="button"
          className="absolute right-4 top-4 z-10 inline-flex size-10 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/72 transition hover:border-white/20 hover:bg-black/30 hover:text-white"
          onClick={onClose}
          aria-label="关闭"
        >
          <XIcon className="size-5" />
        </button>
        <div className="max-h-[92vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

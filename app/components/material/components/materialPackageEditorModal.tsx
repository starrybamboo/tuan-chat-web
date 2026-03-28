import type { ReactNode } from "react";

interface MaterialPackageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function MaterialPackageEditorModal({
  isOpen,
  onClose,
  children,
}: MaterialPackageEditorModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-base-content/48 p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="关闭素材包编辑弹层"
        onClick={onClose}
      />
      <div className="relative z-[81] max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-[30px] border border-base-300 bg-base-100 shadow-2xl">
        <div className="max-h-[92vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

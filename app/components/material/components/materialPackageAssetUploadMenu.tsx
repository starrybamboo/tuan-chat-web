import type { MaterialMessageItem } from "../../../../api/models/MaterialMessageItem";
import { CaretDownIcon, PlusIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import MaterialPackageAssetUploadButton from "./materialPackageAssetUploadButton";

interface MaterialPackageAssetUploadMenuProps {
  disabled?: boolean;
  onUploaded: (message: MaterialMessageItem) => void;
}

export default function MaterialPackageAssetUploadMenu({
  disabled = false,
  onUploaded,
}: MaterialPackageAssetUploadMenuProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-base-300 bg-base-200/70 px-3 py-2 text-sm text-base-content transition hover:border-primary/30 hover:bg-base-200 hover:text-base-content disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
      >
        <PlusIcon className="size-4" weight="bold" />
        <span>添加素材</span>
        <CaretDownIcon className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+0.5rem)] z-20 w-48 rounded-2xl border border-base-300 bg-base-100 p-2 shadow-xl">
          <div className="space-y-2">
            <MaterialPackageAssetUploadButton
              kind="image"
              fullWidth
              onUploaded={(message) => {
                onUploaded(message);
                setIsOpen(false);
              }}
            />
            <MaterialPackageAssetUploadButton
              kind="audio"
              fullWidth
              onUploaded={(message) => {
                onUploaded(message);
                setIsOpen(false);
              }}
            />
            <MaterialPackageAssetUploadButton
              kind="video"
              fullWidth
              onUploaded={(message) => {
                onUploaded(message);
                setIsOpen(false);
              }}
            />
            <MaterialPackageAssetUploadButton
              kind="file"
              fullWidth
              onUploaded={(message) => {
                onUploaded(message);
                setIsOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

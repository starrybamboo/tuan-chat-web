import { GearSixIcon, ImageSquareIcon, SparkleIcon, XIcon } from "@phosphor-icons/react";
import type { Dispatch, SetStateAction } from "react";

import type {
  MetadataImportSelectionState,
  PendingMetadataImportState,
} from "@/components/aiImage/types";

interface MetadataImportDialogProps {
  pendingMetadataImport: PendingMetadataImportState | null;
  canImportMetadataPrompt: boolean;
  canImportMetadataNegativePrompt: boolean;
  canImportMetadataCharacters: boolean;
  canImportMetadataSettings: boolean;
  canImportMetadataSeed: boolean;
  hasAnyMetadataImportSelection: boolean;
  metadataImportSelection: MetadataImportSelectionState;
  setMetadataImportSelection: Dispatch<SetStateAction<MetadataImportSelectionState>>;
  onClose: () => void;
  onImportSourceImageTarget: (target: "img2img" | "vibe" | "precise") => void;
  onConfirmMetadataImport: () => void;
}

const IMAGE_TARGET_BUTTON_CLASS_NAME = "inline-flex h-10 min-w-[9.25rem] items-center justify-center gap-2 rounded-md border border-[#f3efc6] bg-[#f3efc6] px-3 text-[14px] font-semibold text-[#1b2141] transition enabled:hover:bg-[#fff7c9] enabled:hover:border-[#fff7c9] disabled:cursor-not-allowed disabled:border-[#f3efc6]/22 disabled:bg-[#f3efc6]/14 disabled:text-[#f3efc6]/32";
const METADATA_CHECKBOX_CLASS_NAME = "size-4 shrink-0 rounded-[2px] border border-[#f3efc6] bg-[#f3efc6] accent-[#f3efc6] transition focus:outline-none focus:ring-2 focus:ring-[#f3efc6]/25 focus:border-[#f3efc6] disabled:cursor-not-allowed disabled:opacity-40";
const METADATA_LABEL_ENABLED_CLASS_NAME = "cursor-pointer text-[#f5f4ff]";
const METADATA_LABEL_DISABLED_CLASS_NAME = "cursor-not-allowed text-white/28";

export function MetadataImportDialog({
  pendingMetadataImport,
  canImportMetadataPrompt,
  canImportMetadataNegativePrompt,
  canImportMetadataCharacters,
  canImportMetadataSettings,
  canImportMetadataSeed,
  hasAnyMetadataImportSelection,
  metadataImportSelection,
  setMetadataImportSelection,
  onClose,
  onImportSourceImageTarget,
  onConfirmMetadataImport,
}: MetadataImportDialogProps) {
  const isOpen = Boolean(pendingMetadataImport);

  return (
    <dialog
      open={isOpen}
      className={`modal ${isOpen ? "modal-open" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-box relative max-w-[452px] overflow-hidden border border-[#2a2d57] bg-[#171734] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-10 h-[25rem] w-[25rem] -translate-x-1/2 rounded-full border border-[#3a3d6b]/60" />
          <div className="absolute left-1/2 top-24 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full border border-[#2d3059]/55" />
          <div className="absolute -left-20 top-48 h-44 w-44 rounded-full bg-[#20254d]/55 blur-3xl" />
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#232852]/45 blur-3xl" />
        </div>

        <div className="relative px-6 pb-7 pt-5">
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md text-white/90 transition hover:text-white"
            aria-label="关闭图片导入弹窗"
            title="关闭图片导入弹窗"
            onClick={onClose}
          >
            <XIcon className="size-6" weight="bold" />
          </button>

          <div className="max-w-[320px] pr-12">
            <h3 className="font-serif text-[1.7rem] font-semibold leading-[1.22] text-[#f3efc6]">
              What do you want to do with this image?
            </h3>
          </div>

          <div className="mt-5 rounded-md border border-[#2b2f59] bg-[#101127] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            {pendingMetadataImport
              ? (
                  <img
                    src={pendingMetadataImport.sourceImage.dataUrl}
                    alt={pendingMetadataImport.sourceImage.name || "import-preview"}
                    className="mx-auto h-[220px] w-full max-w-[170px] object-contain"
                  />
                )
              : null}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className={IMAGE_TARGET_BUTTON_CLASS_NAME}
              disabled
              onClick={() => onImportSourceImageTarget("img2img")}
            >
              <ImageSquareIcon className="size-4" weight="regular" aria-hidden="true" />
              Image2Image
            </button>
            <button
              type="button"
              className={IMAGE_TARGET_BUTTON_CLASS_NAME}
              disabled
              onClick={() => onImportSourceImageTarget("vibe")}
            >
              <SparkleIcon className="size-4" weight="regular" aria-hidden="true" />
              Vibe Transfer
            </button>
            <button
              type="button"
              className={IMAGE_TARGET_BUTTON_CLASS_NAME}
              disabled
              onClick={() => onImportSourceImageTarget("precise")}
            >
              <GearSixIcon className="size-4" weight="regular" aria-hidden="true" />
              Precise Reference
            </button>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="space-y-3">
              <label className={`flex items-center gap-3 text-[13px] leading-none ${canImportMetadataPrompt ? METADATA_LABEL_ENABLED_CLASS_NAME : METADATA_LABEL_DISABLED_CLASS_NAME}`}>
                <input
                  type="checkbox"
                  className={METADATA_CHECKBOX_CLASS_NAME}
                  checked={canImportMetadataPrompt && metadataImportSelection.prompt}
                  disabled={!canImportMetadataPrompt}
                  onChange={event => setMetadataImportSelection(prev => ({ ...prev, prompt: event.target.checked }))}
                />
                <span>Prompt</span>
              </label>

              <label className={`flex items-center gap-3 text-[13px] leading-none ${canImportMetadataNegativePrompt ? METADATA_LABEL_ENABLED_CLASS_NAME : METADATA_LABEL_DISABLED_CLASS_NAME}`}>
                <input
                  type="checkbox"
                  className={METADATA_CHECKBOX_CLASS_NAME}
                  checked={canImportMetadataNegativePrompt && metadataImportSelection.undesiredContent}
                  disabled={!canImportMetadataNegativePrompt}
                  onChange={event => setMetadataImportSelection(prev => ({ ...prev, undesiredContent: event.target.checked }))}
                />
                <span>Undesired Content</span>
              </label>

              <label className={`flex items-center gap-3 text-[13px] leading-none ${canImportMetadataCharacters ? METADATA_LABEL_ENABLED_CLASS_NAME : METADATA_LABEL_DISABLED_CLASS_NAME}`}>
                <input
                  type="checkbox"
                  className={METADATA_CHECKBOX_CLASS_NAME}
                  checked={canImportMetadataCharacters && metadataImportSelection.characters}
                  disabled={!canImportMetadataCharacters}
                  onChange={(event) => {
                    setMetadataImportSelection(prev => ({
                      ...prev,
                      characters: event.target.checked,
                      appendCharacters: event.target.checked ? prev.appendCharacters : false,
                    }));
                  }}
                />
                <span>Characters</span>
              </label>

              <label className={`pl-7 flex items-center gap-3 text-[12px] leading-none ${canImportMetadataCharacters && metadataImportSelection.characters ? "cursor-pointer text-white/80" : "cursor-not-allowed text-white/22"}`}>
                <input
                  type="checkbox"
                  className={METADATA_CHECKBOX_CLASS_NAME}
                  checked={canImportMetadataCharacters && metadataImportSelection.characters && metadataImportSelection.appendCharacters}
                  disabled={!canImportMetadataCharacters || !metadataImportSelection.characters}
                  onChange={event => setMetadataImportSelection(prev => ({ ...prev, appendCharacters: event.target.checked }))}
                />
                <span>Append</span>
              </label>

              <label className={`flex items-center gap-3 text-[13px] leading-none ${canImportMetadataSettings ? METADATA_LABEL_ENABLED_CLASS_NAME : METADATA_LABEL_DISABLED_CLASS_NAME}`}>
                <input
                  type="checkbox"
                  className={METADATA_CHECKBOX_CLASS_NAME}
                  checked={canImportMetadataSettings && metadataImportSelection.settings}
                  disabled={!canImportMetadataSettings}
                  onChange={event => setMetadataImportSelection(prev => ({ ...prev, settings: event.target.checked }))}
                />
                <span>Settings</span>
              </label>

              <label className={`flex items-center gap-3 text-[13px] leading-none ${canImportMetadataSeed ? METADATA_LABEL_ENABLED_CLASS_NAME : METADATA_LABEL_DISABLED_CLASS_NAME}`}>
                <input
                  type="checkbox"
                  className={METADATA_CHECKBOX_CLASS_NAME}
                  checked={canImportMetadataSeed && metadataImportSelection.seed}
                  disabled={!canImportMetadataSeed}
                  onChange={event => setMetadataImportSelection(prev => ({ ...prev, seed: event.target.checked }))}
                />
                <span>Seed</span>
              </label>
            </div>

            <div className="flex min-w-[9.75rem] flex-col gap-4 sm:items-end">
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center rounded-md border border-[#2f3156] bg-[#2a2d57] px-5 text-[14px] font-semibold text-white transition enabled:hover:border-[#3a3d70] enabled:hover:bg-[#343868] disabled:cursor-not-allowed disabled:border-[#2f3156]/55 disabled:bg-[#2a2d57]/55 disabled:text-white/34"
                disabled={!hasAnyMetadataImportSelection}
                onClick={onConfirmMetadataImport}
              >
                Import Metadata
              </button>

              <label className="flex items-center gap-3 text-[13px] text-white/92">
                <input
                  type="checkbox"
                  className={METADATA_CHECKBOX_CLASS_NAME}
                  checked={metadataImportSelection.cleanImports}
                  onChange={event => setMetadataImportSelection(prev => ({ ...prev, cleanImports: event.target.checked }))}
                />
                <span>Clean Imports</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

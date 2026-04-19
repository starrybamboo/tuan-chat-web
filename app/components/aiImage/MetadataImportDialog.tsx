import { XIcon } from "@phosphor-icons/react";
import type { Dispatch, SetStateAction } from "react";

import type {
  MetadataImportSelectionState,
  PendingMetadataImportState,
} from "@/components/aiImage/types";
import image2imageIconSrc from "@/components/aiImage/assets/image2image.png";
import preciseReferenceIconSrc from "@/components/aiImage/assets/precise-reference.png";
import vibeTransferIconSrc from "@/components/aiImage/assets/vibe-transfer.png";
import PortalTooltip from "@/components/common/portalTooltip";

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
const METADATA_LABEL_ENABLED_CLASS_NAME = "cursor-pointer text-base-content";
const METADATA_LABEL_DISABLED_CLASS_NAME = "cursor-not-allowed text-base-content/35";
const CLEAN_IMPORTS_HINT_TEXT = "Remove[] / {}, add spaces after commas";

function ReferenceActionIcon({
  className,
  src,
}: {
  className?: string;
  src: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

function CleanImportsHint() {
  return (
    <PortalTooltip
      label={CLEAN_IMPORTS_HINT_TEXT}
      placement="top"
      gap={8}
      className="pointer-events-none z-[1100] rounded-xl border border-base-300 bg-base-100 px-3 py-2 text-[11px] leading-5 text-base-content/72 shadow-xl"
    >
      <button
        type="button"
        className="flex size-4 cursor-help items-center justify-center rounded-full bg-transparent text-base-content/28 transition hover:text-base-content/55 focus:outline-none"
        aria-label={CLEAN_IMPORTS_HINT_TEXT}
      >
        <span className="flex size-3.5 items-center justify-center rounded-full border border-base-content/16 text-[9px] font-medium leading-none text-current">
          ?
        </span>
      </button>
    </PortalTooltip>
  );
}

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
  const hasImportedMetadata = Boolean(pendingMetadataImport?.metadata);
  const previewFrameClassName = hasImportedMetadata
    ? "mt-5 rounded-md border border-base-300 bg-base-200/60 p-4 shadow-sm"
    : "mt-5 flex min-h-[18rem] items-center justify-center rounded-md border border-base-300 bg-base-200/60 p-4 shadow-sm";
  const previewImageClassName = hasImportedMetadata
    ? "mx-auto h-[220px] w-full max-w-[170px] object-contain"
    : "mx-auto h-[260px] w-full max-w-full object-contain";

  return (
    <dialog
      open={isOpen}
      className={`modal ${isOpen ? "modal-open" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="modal-box relative max-w-[452px] overflow-hidden border border-base-300 bg-base-100 p-0 text-base-content shadow-xl">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-10 h-[25rem] w-[25rem] -translate-x-1/2 rounded-full border border-base-content/10" />
          <div className="absolute left-1/2 top-24 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full border border-base-content/5" />
          <div className="absolute -left-20 top-48 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-base-content/6 blur-3xl" />
        </div>

        <div className="relative px-6 pb-7 pt-5">
          <button
            type="button"
            className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-md text-base-content/75 transition hover:text-base-content"
            aria-label="关闭图片导入弹窗"
            title="关闭图片导入弹窗"
            onClick={onClose}
          >
            <XIcon className="size-6" weight="bold" />
          </button>

          <div className="max-w-[320px] pr-12">
            <h3 className="font-serif text-[1.52rem] font-semibold leading-[1.22] text-base-content">
              What do you want to do with this image?
            </h3>
          </div>

          <div className={previewFrameClassName}>
            {pendingMetadataImport
              ? (
                  <img
                    src={pendingMetadataImport.sourceImage.dataUrl}
                    alt={pendingMetadataImport.sourceImage.name || "import-preview"}
                    className={previewImageClassName}
                  />
                )
              : null}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className={IMAGE_TARGET_BUTTON_CLASS_NAME}
              onClick={() => onImportSourceImageTarget("img2img")}
            >
              <ReferenceActionIcon className="size-[15px] shrink-0" src={image2imageIconSrc} />
              Image2Image
            </button>
            <button
              type="button"
              className={IMAGE_TARGET_BUTTON_CLASS_NAME}
              disabled
              onClick={() => onImportSourceImageTarget("vibe")}
            >
              <ReferenceActionIcon className="size-[15px] shrink-0" src={vibeTransferIconSrc} />
              Vibe Transfer
            </button>
            <button
              type="button"
              className={IMAGE_TARGET_BUTTON_CLASS_NAME}
              disabled
              onClick={() => onImportSourceImageTarget("precise")}
            >
              <ReferenceActionIcon className="size-[15px] shrink-0" src={preciseReferenceIconSrc} />
              Precise Reference
            </button>
          </div>

          {hasImportedMetadata
            ? (
                <>
                  <div className="mt-7">
                    <div className="text-[1rem] font-semibold leading-6 text-base-content">This image has metadata!</div>
                    <div className="text-[1rem] font-semibold leading-6 text-base-content">Did you want to import that instead?</div>
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

                      <label className={`pl-7 flex items-center gap-3 text-[12px] leading-none ${canImportMetadataCharacters && metadataImportSelection.characters ? "cursor-pointer text-base-content/80" : "cursor-not-allowed text-base-content/22"}`}>
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
                        className="inline-flex h-12 items-center justify-center rounded-md border border-base-300 bg-base-200 px-5 text-[14px] font-semibold text-base-content transition enabled:hover:border-primary/40 enabled:hover:bg-base-300 disabled:cursor-not-allowed disabled:border-base-300 disabled:bg-base-200 disabled:text-base-content/35"
                        disabled={!hasAnyMetadataImportSelection}
                        onClick={onConfirmMetadataImport}
                      >
                        Import Metadata
                      </button>

                      <label className="flex items-center gap-3 text-[13px] text-base-content/92 sm:mr-[23px]">
                        <input
                          type="checkbox"
                          className={METADATA_CHECKBOX_CLASS_NAME}
                          checked={metadataImportSelection.cleanImports}
                          onChange={event => setMetadataImportSelection(prev => ({ ...prev, cleanImports: event.target.checked }))}
                        />
                        <span>Clean Imports</span>
                        <CleanImportsHint />
                      </label>
                    </div>
                  </div>
                </>
              )
            : null}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

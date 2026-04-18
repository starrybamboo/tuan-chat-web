import type { Dispatch, SetStateAction } from "react";

import type {
  MetadataImportSelectionState,
  PendingMetadataImportState,
} from "@/components/aiImage/types";
import type { NovelAiImportedSettings } from "@/utils/novelaiImageMetadata";
import { XMarkICon } from "@/icons";

interface MetadataImportDialogProps {
  pendingMetadataImport: PendingMetadataImportState | null;
  pendingMetadataSettings: NovelAiImportedSettings | null;
  canImportMetadataPrompt: boolean;
  canImportMetadataNegativePrompt: boolean;
  canImportMetadataCharacters: boolean;
  canImportMetadataSettings: boolean;
  canImportMetadataSeed: boolean;
  hasAnyMetadataImportSelection: boolean;
  metadataImportSelection: MetadataImportSelectionState;
  setMetadataImportSelection: Dispatch<SetStateAction<MetadataImportSelectionState>>;
  pendingMetadataModelMismatch: string;
  onClose: () => void;
  onImportSourceImageTarget: (target: "img2img" | "vibe" | "precise") => void;
  onConfirmMetadataImport: () => void;
}

export function MetadataImportDialog({
  pendingMetadataImport,
  pendingMetadataSettings,
  canImportMetadataPrompt,
  canImportMetadataNegativePrompt,
  canImportMetadataCharacters,
  canImportMetadataSettings,
  canImportMetadataSeed,
  hasAnyMetadataImportSelection,
  metadataImportSelection,
  setMetadataImportSelection,
  pendingMetadataModelMismatch,
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
      <div className="modal-box relative max-w-[480px] overflow-hidden border border-base-300 bg-base-100 p-0 text-base-content shadow-xl">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-20 h-80 w-80 -translate-x-1/2 rounded-full border border-base-content/10" />
          <div className="absolute left-1/2 top-40 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full border border-base-content/5" />
          <div className="absolute -left-16 top-32 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-base-content/6 blur-3xl" />
        </div>

        <div className="relative p-6">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-circle absolute right-4 top-4 border border-base-300 bg-base-200 text-base-content hover:bg-base-300"
            aria-label="关闭图片导入弹窗"
            title="关闭图片导入弹窗"
            onClick={onClose}
          >
            <XMarkICon className="size-5" />
          </button>

          <div className="max-w-[300px] pr-12">
            <h3 className="font-serif text-[2rem] font-semibold leading-tight text-base-content">
              What do you want to do with this image?
            </h3>
            <div className="mt-2 text-sm leading-6 text-base-content/65">
              当前先保留 NovelAI 的 metadata 导入流程，但会自动屏蔽所有会消耗 Anlas 的图片入口。
            </div>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-base-300 bg-base-200/60 p-3 shadow-sm">
            {pendingMetadataImport
              ? (
                  <img
                    src={pendingMetadataImport.sourceImage.dataUrl}
                    alt={pendingMetadataImport.sourceImage.name || "import-preview"}
                    className="h-[220px] w-full rounded-[1rem] object-contain"
                  />
                )
              : null}
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="btn btn-primary min-w-[10.5rem]"
              disabled
              onClick={() => onImportSourceImageTarget("img2img")}
            >
              Image2Image
            </button>
            <button
              type="button"
              className="btn btn-primary min-w-[10.5rem]"
              disabled
              onClick={() => onImportSourceImageTarget("vibe")}
            >
              Vibe Transfer
            </button>
            <button
              type="button"
              className="btn btn-primary min-w-[10.5rem]"
              disabled
              onClick={() => onImportSourceImageTarget("precise")}
            >
              Precise Reference
            </button>
          </div>
          <div className="mt-3 text-center text-xs leading-5 text-base-content/60">
            当前免费模式下，这三类入口都会消耗 Anlas，已暂时禁用；仍可继续导入 metadata。
          </div>

          <div className="mt-7">
            <div className="text-[1.65rem] font-semibold leading-tight text-base-content">This image has metadata!</div>
            <div className="mt-1 text-sm leading-6 text-base-content/70">Did you want to import that instead?</div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <label className={`flex items-center gap-3 text-sm ${canImportMetadataPrompt ? "cursor-pointer text-base-content" : "cursor-not-allowed text-base-content/35"}`}>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm rounded-sm border-base-300 bg-base-100 checked:border-primary checked:bg-primary checked:text-primary-content"
                  checked={canImportMetadataPrompt && metadataImportSelection.prompt}
                  disabled={!canImportMetadataPrompt}
                  onChange={event => setMetadataImportSelection(prev => ({ ...prev, prompt: event.target.checked }))}
                />
                <span>Prompt</span>
              </label>

              <label className={`flex items-center gap-3 text-sm ${canImportMetadataNegativePrompt ? "cursor-pointer text-base-content" : "cursor-not-allowed text-base-content/35"}`}>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm rounded-sm border-base-300 bg-base-100 checked:border-primary checked:bg-primary checked:text-primary-content"
                  checked={canImportMetadataNegativePrompt && metadataImportSelection.undesiredContent}
                  disabled={!canImportMetadataNegativePrompt}
                  onChange={event => setMetadataImportSelection(prev => ({ ...prev, undesiredContent: event.target.checked }))}
                />
                <span>Undesired Content</span>
              </label>

              <label className={`flex items-center gap-3 text-sm ${canImportMetadataCharacters ? "cursor-pointer text-base-content" : "cursor-not-allowed text-base-content/35"}`}>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm rounded-sm border-base-300 bg-base-100 checked:border-primary checked:bg-primary checked:text-primary-content"
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

              <label className={`ml-7 flex items-center gap-3 text-sm ${canImportMetadataCharacters && metadataImportSelection.characters ? "cursor-pointer text-base-content/85" : "cursor-not-allowed text-base-content/30"}`}>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm rounded-sm border-base-300 bg-base-100 checked:border-primary checked:bg-primary checked:text-primary-content"
                  checked={canImportMetadataCharacters && metadataImportSelection.characters && metadataImportSelection.appendCharacters}
                  disabled={!canImportMetadataCharacters || !metadataImportSelection.characters}
                  onChange={event => setMetadataImportSelection(prev => ({ ...prev, appendCharacters: event.target.checked }))}
                />
                <span>Append</span>
              </label>

              <label className={`flex items-center gap-3 text-sm ${canImportMetadataSettings ? "cursor-pointer text-base-content" : "cursor-not-allowed text-base-content/35"}`}>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm rounded-sm border-base-300 bg-base-100 checked:border-primary checked:bg-primary checked:text-primary-content"
                  checked={canImportMetadataSettings && metadataImportSelection.settings}
                  disabled={!canImportMetadataSettings}
                  onChange={event => setMetadataImportSelection(prev => ({ ...prev, settings: event.target.checked }))}
                />
                <span>Settings</span>
              </label>

              <label className={`flex items-center gap-3 text-sm ${canImportMetadataSeed ? "cursor-pointer text-base-content" : "cursor-not-allowed text-base-content/35"}`}>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm rounded-sm border-base-300 bg-base-100 checked:border-primary checked:bg-primary checked:text-primary-content"
                  checked={canImportMetadataSeed && metadataImportSelection.seed}
                  disabled={!canImportMetadataSeed}
                  onChange={event => setMetadataImportSelection(prev => ({ ...prev, seed: event.target.checked }))}
                />
                <span>Seed</span>
              </label>
            </div>

            <div className="flex min-w-[12rem] flex-col justify-end gap-3">
              <button
                type="button"
                className="btn btn-primary disabled:border-base-300 disabled:bg-base-200 disabled:text-base-content/35"
                disabled={!hasAnyMetadataImportSelection}
                onClick={onConfirmMetadataImport}
              >
                Import Metadata
              </button>

              <label className="flex items-center justify-end gap-3 text-sm text-base-content/70">
                <span>Clean Imports</span>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm rounded-sm border-base-300 bg-base-100 checked:border-primary checked:bg-primary checked:text-primary-content"
                  checked={metadataImportSelection.cleanImports}
                  onChange={event => setMetadataImportSelection(prev => ({ ...prev, cleanImports: event.target.checked }))}
                />
              </label>
            </div>
          </div>

          <div className="mt-5 space-y-2 text-xs leading-5 text-base-content/55">
            <div>
              Metadata Source:
              {" "}
              {pendingMetadataImport?.metadata.source === "stealth" ? "stealth metadata" : "PNG metadata"}
            </div>
            {pendingMetadataSettings?.width && pendingMetadataSettings?.height
              ? <div>{`Metadata Size: ${pendingMetadataSettings.width}×${pendingMetadataSettings.height}`}</div>
              : null}
            {pendingMetadataSettings?.mode === "img2img" || pendingMetadataSettings?.mode === "infill"
              ? (
                  <div>
                    {pendingMetadataSettings.mode === "infill"
                      ? "该 metadata 标记为 Inpaint；当前导入流程不会自动恢复底图与蒙版，只保留可安全导入的 metadata。"
                      : "该 metadata 标记为 img2img；当前免费模式会忽略这类付费设置，只保留可安全导入的 metadata。"}
                  </div>
                )
              : null}
            {pendingMetadataModelMismatch
              ? <div>{pendingMetadataModelMismatch}</div>
              : null}
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

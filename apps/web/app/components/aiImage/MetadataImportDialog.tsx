import type { Dispatch, SetStateAction } from "react";

import type {
  MetadataImportSelectionState,
  PendingMetadataImportState,
} from "@/components/aiImage/types";

import image2imageIconSrc from "@/components/aiImage/assets/image2image.png";
import preciseReferenceIconSrc from "@/components/aiImage/assets/precise-reference.png";
import vibeTransferIconSrc from "@/components/aiImage/assets/vibe-transfer.png";
import { ReferenceActionIcon } from "@/components/aiImage/ReferenceActionIcon";
import { DialogFrame } from "@/components/common/DialogFrame";
import { Checkbox } from "@/components/common/FormField";
import { MediaImage } from "@/components/common/mediaImage";
import PortalTooltip from "@/components/common/portalTooltip";

type MetadataImportDialogProps = {
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

const IMAGE_TARGET_BUTTON_CLASS_NAME = "inline-flex h-10 min-w-36 items-center justify-center gap-2 rounded-md border border-warning bg-warning px-3 text-sm font-semibold text-warning-content transition enabled:hover:bg-warning/90 enabled:hover:border-warning/90 disabled:cursor-not-allowed disabled:border-warning/22 disabled:bg-warning/14 disabled:text-warning/32";
const METADATA_CHECKBOX_CLASS_NAME = "size-4 shrink-0 rounded-sm border border-warning bg-warning accent-warning transition focus:outline-none focus:ring-2 focus:ring-warning/25 focus:border-warning disabled:cursor-not-allowed disabled:opacity-40";
const METADATA_LABEL_ENABLED_CLASS_NAME = "cursor-pointer text-base-content";
const METADATA_LABEL_DISABLED_CLASS_NAME = "cursor-not-allowed text-base-content/50";
const CLEAN_IMPORTS_HINT_TEXT = "Remove[] / {}, add spaces after commas";

function CleanImportsHint() {
  return (
    <PortalTooltip
      label={CLEAN_IMPORTS_HINT_TEXT}
      placement="top"
      gap={8}
      className="
        pointer-events-none z-[1100] rounded-xl border border-base-300
        bg-base-100 px-3 py-2 text-[11px] leading-5 text-base-content/72
        shadow-xl
      "
    >
      <button
        type="button"
        className="
          flex size-4 cursor-help items-center justify-center rounded-full
          bg-transparent text-base-content/50 transition
          hover:text-base-content/55
          focus:outline-none focus:ring-2 focus:ring-info/30
        "
        aria-label={CLEAN_IMPORTS_HINT_TEXT}
      >
        <span className="
          flex size-3.5 items-center justify-center rounded-full border
          border-base-content/16 text-[9px] font-medium leading-none
          text-current
        ">
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
    <DialogFrame
      open={isOpen}
      mode="native"
      onClose={onClose}
      ariaLabel="图片导入"
      panelClassName="
        max-w-[452px] overflow-hidden border border-base-300
        bg-base-100 p-0 text-base-content shadow-xl
      "
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="
          absolute left-1/2 top-10 h-[25rem] w-[25rem] -translate-x-1/2
          rounded-full border border-base-content/10
        " />
        <div className="
          absolute left-1/2 top-24 h-[38rem] w-[38rem] -translate-x-1/2
          rounded-full border border-base-content/5
        " />
        <div className="
          absolute -left-20 top-48 h-44 w-44 rounded-full bg-info/10
          blur-3xl
        " />
        <div className="
          absolute right-0 top-0 h-48 w-48 rounded-full bg-base-content/6
          blur-3xl
        " />
      </div>

      <div className="relative px-6 pb-7 pt-5">
          <div className="max-w-[320px]">
            <h3 className="
              font-serif text-[1.52rem] font-semibold leading-[1.22]
              text-base-content
            ">
              你想怎么处理这张图片？
            </h3>
          </div>

          <div className={previewFrameClassName}>
            {pendingMetadataImport
              ? (
                  <MediaImage
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
              aria-label="导入源图片到图生图"
              onClick={() => onImportSourceImageTarget("img2img")}
            >
              <ReferenceActionIcon className="size-[15px] shrink-0" src={image2imageIconSrc} />
              图生图
            </button>
            <button
              type="button"
              className={IMAGE_TARGET_BUTTON_CLASS_NAME}
              disabled
              title="暂不可用"
              aria-label="风格迁移，暂不可用"
              onClick={() => onImportSourceImageTarget("vibe")}
            >
              <ReferenceActionIcon className="size-[15px] shrink-0" src={vibeTransferIconSrc} />
              风格迁移
            </button>
            <button
              type="button"
              className={IMAGE_TARGET_BUTTON_CLASS_NAME}
              disabled
              title="暂不可用"
              aria-label="精准参考，暂不可用"
              onClick={() => onImportSourceImageTarget("precise")}
            >
              <ReferenceActionIcon className="size-[15px] shrink-0" src={preciseReferenceIconSrc} />
              精准参考
            </button>
          </div>

          {hasImportedMetadata
            ? (
                <>
                  <div className="mt-7">
                    <div className="
                      text-[1rem] font-semibold leading-6 text-base-content
                    ">这张图片包含元数据！</div>
                    <div className="
                      text-[1rem] font-semibold leading-6 text-base-content
                    ">要改为导入这些元数据吗？</div>
                  </div>

                  <div className="
                    mt-6 grid gap-5
                    sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start
                  ">
                    <div className="space-y-3">
                      <label className={`
                        flex items-center gap-3 text-[13px] leading-none
                        ${canImportMetadataPrompt ? METADATA_LABEL_ENABLED_CLASS_NAME : METADATA_LABEL_DISABLED_CLASS_NAME}
                      `}>
                        <Checkbox
                          density="compact"
                          className={METADATA_CHECKBOX_CLASS_NAME}
                          checked={canImportMetadataPrompt && metadataImportSelection.prompt}
                          disabled={!canImportMetadataPrompt}
                          onChange={event => setMetadataImportSelection(prev => ({ ...prev, prompt: event.target.checked }))}
                        />
                        <span>提示词</span>
                      </label>

                      <label className={`
                        flex items-center gap-3 text-[13px] leading-none
                        ${canImportMetadataNegativePrompt ? METADATA_LABEL_ENABLED_CLASS_NAME : METADATA_LABEL_DISABLED_CLASS_NAME}
                      `}>
                        <Checkbox
                          density="compact"
                          className={METADATA_CHECKBOX_CLASS_NAME}
                          checked={canImportMetadataNegativePrompt && metadataImportSelection.undesiredContent}
                          disabled={!canImportMetadataNegativePrompt}
                          onChange={event => setMetadataImportSelection(prev => ({ ...prev, undesiredContent: event.target.checked }))}
                        />
                        <span>反向提示词</span>
                      </label>

                      <label className={`
                        flex items-center gap-3 text-[13px] leading-none
                        ${canImportMetadataCharacters ? METADATA_LABEL_ENABLED_CLASS_NAME : METADATA_LABEL_DISABLED_CLASS_NAME}
                      `}>
                        <Checkbox
                          density="compact"
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
                        <span>角色</span>
                      </label>

                      <label className={`
                        pl-7 flex items-center gap-3 text-[12px] leading-none
                        ${canImportMetadataCharacters && metadataImportSelection.characters ? `
                          cursor-pointer text-base-content/80
                        ` : `cursor-not-allowed text-base-content/50`}
                      `}>
                        <Checkbox
                          density="compact"
                          className={METADATA_CHECKBOX_CLASS_NAME}
                          checked={canImportMetadataCharacters && metadataImportSelection.characters && metadataImportSelection.appendCharacters}
                          disabled={!canImportMetadataCharacters || !metadataImportSelection.characters}
                          onChange={event => setMetadataImportSelection(prev => ({ ...prev, appendCharacters: event.target.checked }))}
                        />
                        <span>追加</span>
                      </label>

                      <label className={`
                        flex items-center gap-3 text-[13px] leading-none
                        ${canImportMetadataSettings ? METADATA_LABEL_ENABLED_CLASS_NAME : METADATA_LABEL_DISABLED_CLASS_NAME}
                      `}>
                        <Checkbox
                          density="compact"
                          className={METADATA_CHECKBOX_CLASS_NAME}
                          checked={canImportMetadataSettings && metadataImportSelection.settings}
                          disabled={!canImportMetadataSettings}
                          onChange={event => setMetadataImportSelection(prev => ({ ...prev, settings: event.target.checked }))}
                        />
                        <span>设置</span>
                      </label>

                      <label className={`
                        flex items-center gap-3 text-[13px] leading-none
                        ${canImportMetadataSeed ? METADATA_LABEL_ENABLED_CLASS_NAME : METADATA_LABEL_DISABLED_CLASS_NAME}
                      `}>
                        <Checkbox
                          density="compact"
                          className={METADATA_CHECKBOX_CLASS_NAME}
                          checked={canImportMetadataSeed && metadataImportSelection.seed}
                          disabled={!canImportMetadataSeed}
                          onChange={event => setMetadataImportSelection(prev => ({ ...prev, seed: event.target.checked }))}
                        />
                        <span>种子</span>
                      </label>
                    </div>

                    <div className="
                      flex min-w-[9.75rem] flex-col gap-4
                      sm:items-end
                    ">
                      <button
                        type="button"
                        className="
                          inline-flex h-12 items-center justify-center
                          rounded-md border border-base-300 bg-base-200 px-5
                          text-sm font-semibold text-base-content transition
                          enabled:hover:border-info/40
                          enabled:hover:bg-base-300
                          disabled:cursor-not-allowed disabled:border-base-300
                          disabled:bg-base-200 disabled:text-base-content/50
                        "
                        disabled={!hasAnyMetadataImportSelection}
                        title={!hasAnyMetadataImportSelection ? "请选择要导入的元数据" : undefined}
                        onClick={onConfirmMetadataImport}
                      >
                        导入元数据
                      </button>

                      <label className="
                        flex items-center gap-3 text-[13px] text-base-content/92
                        sm:mr-[23px]
                      ">
                        <Checkbox
                          density="compact"
                          className={METADATA_CHECKBOX_CLASS_NAME}
                          checked={metadataImportSelection.cleanImports}
                          onChange={event => setMetadataImportSelection(prev => ({ ...prev, cleanImports: event.target.checked }))}
                        />
                        <span>清理导入文本</span>
                        <CleanImportsHint />
                      </label>
                    </div>
                  </div>
                </>
              )
            : null}
      </div>
    </DialogFrame>
  );
}

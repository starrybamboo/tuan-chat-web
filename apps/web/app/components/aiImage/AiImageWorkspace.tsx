import type { ComponentProps } from "react";

import { ArrowSquareInIcon, PlantIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { memo, useEffect, useState } from "react";

import type { GeneratedImageItem } from "@/components/aiImage/types";

import { AiImageHistoryPane } from "@/components/aiImage/AiImageHistoryPane";
import { AiImagePreviewPane } from "@/components/aiImage/AiImagePreviewPane";
import { MediaImage } from "@/components/common/mediaImage";
import { HistoryIcon } from "@/icons";

type AiImageWorkspaceProps = {
  isDirectorToolsOpen: boolean;
  previewPaneProps: ComponentProps<typeof AiImagePreviewPane>;
  historyPaneProps: Omit<ComponentProps<typeof AiImageHistoryPane>, "isDirectorToolsOpen" | "onCollapse">;
  pinnedPreviewResult: GeneratedImageItem | null;
  onClearPinnedPreview: () => void;
  onJumpToPinnedPreview: () => void;
  onApplyPinnedPreviewSeed: () => void;
}

export const AiImageWorkspace = memo(({
  isDirectorToolsOpen,
  previewPaneProps,
  historyPaneProps,
  pinnedPreviewResult,
  onClearPinnedPreview,
  onJumpToPinnedPreview,
  onApplyPinnedPreviewSeed,
}: AiImageWorkspaceProps) => {
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [isPinnedDrawerOpen, setIsPinnedDrawerOpen] = useState(false);
  const [isPinnedEdgeHovered, setIsPinnedEdgeHovered] = useState(false);
  const historyPaneWidthClassName = "h-[160px] w-full md:h-auto md:w-[160px]";

  useEffect(() => {
    if (!pinnedPreviewResult) {
      queueMicrotask(() => setIsPinnedDrawerOpen(false));
      queueMicrotask(() => setIsPinnedEdgeHovered(false));
      return;
    }
    queueMicrotask(() => setIsPinnedDrawerOpen(false));
    queueMicrotask(() => setIsPinnedEdgeHovered(false));
  }, [pinnedPreviewResult]);

  return (
    <div className="
      relative z-0 flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-visible
      bg-transparent p-2 md:flex-row md:pl-0
    ">
      {isPinnedDrawerOpen && pinnedPreviewResult && !isDirectorToolsOpen
        ? (
            <button
              type="button"
              className="absolute inset-0 z-[5] bg-black/36 transition-opacity"
              aria-label="关闭固定预览遮罩"
              title="关闭固定预览遮罩"
              onClick={() => setIsPinnedDrawerOpen(false)}
            />
          )
        : null}

      {pinnedPreviewResult && !isDirectorToolsOpen
        ? (
            <div className="
              pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2
            ">
              <div
                className="
                  pointer-events-auto flex items-stretch gap-2
                  transition-transform duration-300
                  ease-emphasized
                "
                style={{ transform: isPinnedDrawerOpen ? "translateX(0)" : (isPinnedEdgeHovered ? "translateX(calc(-100% + 28px))" : "translateX(calc(-100% + 14px))") }}
                onMouseEnter={() => setIsPinnedEdgeHovered(true)}
                onMouseLeave={() => setIsPinnedEdgeHovered(false)}
              >
                <div className="
                  flex w-11 shrink-0 flex-col items-center justify-start gap-1
                  rounded-none border border-white/18 bg-base-300/98 px-0 py-2
                  shadow-xl backdrop-blur
                ">
                  <button
                    type="button"
                    className="
                      inline-flex size-9 items-center justify-center
                      rounded-none text-base-content/72 transition-colors
                      hover:bg-base-200/35 hover:text-base-content
                    "
                    aria-label="取消固定预览"
                    title="取消固定预览"
                    onClick={onClearPinnedPreview}
                  >
                    <TrashSimpleIcon className="size-[18px]" weight="regular" />
                  </button>
                  <button
                    type="button"
                    className="
                      inline-flex size-9 items-center justify-center
                      rounded-none text-base-content/72 transition-colors
                      hover:bg-base-200/35 hover:text-base-content
                    "
                    aria-label="跳转到固定图片"
                    title="跳转到固定图片"
                    onClick={() => {
                      onJumpToPinnedPreview();
                      setIsPinnedDrawerOpen(false);
                    }}
                  >
                    <ArrowSquareInIcon className="size-[18px]" weight="regular" />
                  </button>
                  <button
                    type="button"
                    className="
                      inline-flex size-9 items-center justify-center
                      rounded-none text-base-content/72 transition-colors
                      hover:bg-base-200/35 hover:text-base-content
                    "
                    aria-label="应用固定图片的 seed"
                    title="应用固定图片的 seed"
                    onClick={onApplyPinnedPreviewSeed}
                  >
                    <PlantIcon className="size-[18px]" weight="regular" />
                  </button>
                </div>
                <button
                  type="button"
                  className="
                    relative block shrink-0 overflow-hidden rounded-none
                    bg-transparent shadow-xl
                  "
                  aria-label={isPinnedDrawerOpen ? "Collapse pinned preview" : "Expand pinned preview"}
                  aria-expanded={isPinnedDrawerOpen}
                  aria-controls="ai-image-pinned-preview"
                  onClick={() => {
                    if (isPinnedDrawerOpen) {
                      setIsPinnedDrawerOpen(false);
                      return;
                    }
                    setIsPinnedDrawerOpen(true);
                  }}
                >
                  <MediaImage
                    id="ai-image-pinned-preview"
                    src={pinnedPreviewResult.dataUrl}
                    className="
                      block max-h-[min(74vh,640px)] w-auto rounded-none
                      object-contain
                    "
                    alt="pinned-preview"
                  />
                </button>
              </div>
            </div>
          )
        : null}

      <AiImagePreviewPane {...previewPaneProps} />

      {isHistoryCollapsed
        ? (
            <div className="absolute right-2 top-3 z-20">
              <button
                type="button"
                className="
                  flex size-10 items-center justify-center bg-transparent
                  text-base-content/62 transition
                  hover:text-base-content/90
                  focus:outline-none focus:ring-2 focus:ring-info/30
                "
                aria-label="Expand history sidebar"
                title="Expand history sidebar"
                onClick={() => setIsHistoryCollapsed(false)}
              >
                <HistoryIcon className="size-6" />
              </button>
            </div>
          )
        : null}

      <div
        className={`
          relative shrink-0 overflow-hidden transition-all duration-300
          motion-reduce:transition-none
          ease-emphasized
          ${
          isHistoryCollapsed
            ? "w-0 translate-x-3 opacity-0 pointer-events-none"
            : historyPaneWidthClassName
        }
        `}
      >
        <AiImageHistoryPane
          {...historyPaneProps}
          isDirectorToolsOpen={false}
          onCollapse={() => setIsHistoryCollapsed(true)}
        />
      </div>
    </div>
  );
});

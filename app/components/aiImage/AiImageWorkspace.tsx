import { ArrowSquareInIcon, PlantIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";

import type { GeneratedImageItem } from "@/components/aiImage/types";
import { AiImageHistoryPane } from "@/components/aiImage/AiImageHistoryPane";
import { AiImagePreviewPane } from "@/components/aiImage/AiImagePreviewPane";
import { HistoryIcon } from "@/icons";

interface AiImageWorkspaceProps {
  isDirectorToolsOpen: boolean;
  previewPaneProps: ComponentProps<typeof AiImagePreviewPane>;
  historyPaneProps: Omit<ComponentProps<typeof AiImageHistoryPane>, "isDirectorToolsOpen" | "onCollapse">;
  pinnedPreviewResult: GeneratedImageItem | null;
  onClearPinnedPreview: () => void;
  onJumpToPinnedPreview: () => void;
  onApplyPinnedPreviewSeed: () => void;
}

export function AiImageWorkspace({
  isDirectorToolsOpen,
  previewPaneProps,
  historyPaneProps,
  pinnedPreviewResult,
  onClearPinnedPreview,
  onJumpToPinnedPreview,
  onApplyPinnedPreviewSeed,
}: AiImageWorkspaceProps) {
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [isPinnedDrawerOpen, setIsPinnedDrawerOpen] = useState(false);
  const [isPinnedEdgeHovered, setIsPinnedEdgeHovered] = useState(false);
  const historyPaneWidthClassName = isDirectorToolsOpen ? "w-[196px]" : "w-[160px]";

  useEffect(() => {
    if (!pinnedPreviewResult) {
      setIsPinnedDrawerOpen(false);
      setIsPinnedEdgeHovered(false);
      return;
    }
    setIsPinnedDrawerOpen(false);
    setIsPinnedEdgeHovered(false);
  }, [pinnedPreviewResult?.dataUrl, pinnedPreviewResult?.seed]);

  return (
    <div className="relative z-0 flex min-h-0 flex-1 overflow-visible bg-base-200">
      {isPinnedDrawerOpen && pinnedPreviewResult && !isDirectorToolsOpen
        ? (
            <button
              type="button"
              className="absolute inset-0 z-[5] bg-black/36 transition-opacity"
              aria-label="收起 pinned 预览阴影"
              onClick={() => setIsPinnedDrawerOpen(false)}
            />
          )
        : null}

      {pinnedPreviewResult && !isDirectorToolsOpen
        ? (
            <div className="pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2">
              <div
                className="pointer-events-auto flex items-stretch gap-2 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: isPinnedDrawerOpen ? "translateX(0)" : (isPinnedEdgeHovered ? "translateX(calc(-100% + 28px))" : "translateX(calc(-100% + 14px))") }}
                onMouseEnter={() => setIsPinnedEdgeHovered(true)}
                onMouseLeave={() => setIsPinnedEdgeHovered(false)}
              >
                <div className="flex w-11 shrink-0 flex-col items-center justify-start gap-1 rounded-none border border-white/18 bg-base-300/98 px-0 py-2 shadow-xl backdrop-blur">
                  <button
                    type="button"
                    className="inline-flex size-9 items-center justify-center rounded-none text-base-content/72 transition-colors hover:bg-base-200/35 hover:text-base-content"
                    aria-label="取消固定预览"
                    title="取消固定预览"
                    onClick={onClearPinnedPreview}
                  >
                    <TrashSimpleIcon className="size-[18px]" weight="regular" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex size-9 items-center justify-center rounded-none text-base-content/72 transition-colors hover:bg-base-200/35 hover:text-base-content"
                    aria-label="跳转到 pinned 图片"
                    title="跳转到 pinned 图片"
                    onClick={() => {
                      onJumpToPinnedPreview();
                      setIsPinnedDrawerOpen(false);
                    }}
                  >
                    <ArrowSquareInIcon className="size-[18px]" weight="regular" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex size-9 items-center justify-center rounded-none text-base-content/72 transition-colors hover:bg-base-200/35 hover:text-base-content"
                    aria-label="应用 pinned seed"
                    title="应用 pinned seed"
                    onClick={onApplyPinnedPreviewSeed}
                  >
                    <PlantIcon className="size-[18px]" weight="regular" />
                  </button>
                </div>
                <button
                  type="button"
                  className="relative block shrink-0 overflow-hidden rounded-none bg-transparent shadow-xl"
                  aria-label={isPinnedDrawerOpen ? "收起 pinned 预览" : "展开 pinned 预览"}
                  onClick={() => {
                    if (isPinnedDrawerOpen) {
                      setIsPinnedDrawerOpen(false);
                      return;
                    }
                    setIsPinnedDrawerOpen(true);
                  }}
                >
                  <img
                    src={pinnedPreviewResult.dataUrl}
                    className="block max-h-[min(74vh,640px)] w-auto rounded-none object-contain"
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
                className="flex size-10 items-center justify-center bg-transparent text-base-content/62 transition hover:text-base-content/90 focus:outline-none"
                aria-label="展开历史记录侧边栏"
                title="展开历史记录侧边栏"
                onClick={() => setIsHistoryCollapsed(false)}
              >
                <HistoryIcon className="size-6" />
              </button>
            </div>
          )
        : null}

      <div
        className={`relative shrink-0 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isHistoryCollapsed
            ? "w-0 translate-x-3 opacity-0 pointer-events-none"
            : historyPaneWidthClassName
        }`}
      >
        <AiImageHistoryPane
          {...historyPaneProps}
          isDirectorToolsOpen={isDirectorToolsOpen}
          onCollapse={() => setIsHistoryCollapsed(true)}
        />
      </div>
    </div>
  );
}

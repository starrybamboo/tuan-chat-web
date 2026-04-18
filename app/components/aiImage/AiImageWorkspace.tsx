import { ClipboardTextIcon, PlantIcon, TrashSimpleIcon } from "@phosphor-icons/react";
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
  onSelectPinnedPreview: () => void;
  onClearPinnedPreview: () => void;
  onCopyPinnedPreviewImage: () => void | Promise<void>;
  onApplyPinnedPreviewSeed: () => void;
}

export function AiImageWorkspace({
  isDirectorToolsOpen,
  previewPaneProps,
  historyPaneProps,
  pinnedPreviewResult,
  onSelectPinnedPreview,
  onClearPinnedPreview,
  onCopyPinnedPreviewImage,
  onApplyPinnedPreviewSeed,
}: AiImageWorkspaceProps) {
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [isPinnedDrawerOpen, setIsPinnedDrawerOpen] = useState(false);

  useEffect(() => {
    if (!pinnedPreviewResult) {
      setIsPinnedDrawerOpen(false);
      return;
    }
    setIsPinnedDrawerOpen(false);
  }, [pinnedPreviewResult?.dataUrl, pinnedPreviewResult?.seed]);

  return (
    <div className="relative z-0 flex min-h-0 flex-1 overflow-visible bg-base-200">
      {pinnedPreviewResult && !isDirectorToolsOpen
        ? (
            <div className="pointer-events-none absolute left-0 top-1/2 z-10 -translate-y-1/2">
              <div
                className="pointer-events-auto flex items-stretch transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ transform: isPinnedDrawerOpen ? "translateX(0)" : "translateX(calc(-100% + 14px))" }}
              >
                <div className="flex w-11 shrink-0 flex-col items-center justify-center gap-1 rounded-none border border-r-0 border-white/22 bg-base-100/95 px-0 py-2 shadow-xl backdrop-blur">
                  <button
                    type="button"
                    className="inline-flex size-9 items-center justify-center rounded-none text-base-content/72 transition-colors hover:bg-base-300/75 hover:text-base-content"
                    aria-label="取消固定预览"
                    title="取消固定预览"
                    onClick={onClearPinnedPreview}
                  >
                    <TrashSimpleIcon className="size-[18px]" weight="regular" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex size-9 items-center justify-center rounded-none text-base-content/72 transition-colors hover:bg-base-300/75 hover:text-base-content"
                    aria-label="复制 pinned 图片"
                    title="复制 pinned 图片"
                    onClick={() => void onCopyPinnedPreviewImage()}
                  >
                    <ClipboardTextIcon className="size-[18px]" weight="regular" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex size-9 items-center justify-center rounded-none text-base-content/72 transition-colors hover:bg-base-300/75 hover:text-base-content"
                    aria-label="应用 pinned seed"
                    title="应用 pinned seed"
                    onClick={onApplyPinnedPreviewSeed}
                  >
                    <PlantIcon className="size-[18px]" weight="regular" />
                  </button>
                </div>
                <button
                  type="button"
                  className="relative flex h-[min(74vh,640px)] w-[320px] items-center justify-center overflow-hidden rounded-none border border-white/22 border-l-0 bg-base-100/95 shadow-xl backdrop-blur lg:w-[360px]"
                  title={isPinnedDrawerOpen ? "切回 pinned 预览" : "展开 pinned 预览"}
                  onClick={() => {
                    if (isPinnedDrawerOpen) {
                      onSelectPinnedPreview();
                      setIsPinnedDrawerOpen(false);
                      return;
                    }
                    setIsPinnedDrawerOpen(true);
                  }}
                >
                  <img
                    src={pinnedPreviewResult.dataUrl}
                    className="h-full w-full rounded-none object-contain"
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

      {!isHistoryCollapsed
        ? (
            <AiImageHistoryPane
              {...historyPaneProps}
              isDirectorToolsOpen={isDirectorToolsOpen}
              onCollapse={() => setIsHistoryCollapsed(true)}
            />
          )
        : null}
    </div>
  );
}

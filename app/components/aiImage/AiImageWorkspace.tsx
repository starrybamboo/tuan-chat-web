import { CaretLeftIcon, CaretRightIcon, PushPinIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";

import { AiImageHistoryPane } from "@/components/aiImage/AiImageHistoryPane";
import { AiImagePreviewPane } from "@/components/aiImage/AiImagePreviewPane";
import { HistoryIcon } from "@/icons";

interface AiImageWorkspaceProps {
  isDirectorToolsOpen: boolean;
  previewPaneProps: ComponentProps<typeof AiImagePreviewPane>;
  historyPaneProps: Omit<ComponentProps<typeof AiImageHistoryPane>, "isDirectorToolsOpen" | "onCollapse">;
}

export function AiImageWorkspace({
  isDirectorToolsOpen,
  previewPaneProps,
  historyPaneProps,
}: AiImageWorkspaceProps) {
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);
  const [isPinnedDrawerOpen, setIsPinnedDrawerOpen] = useState(false);
  const pinnedPreviewResult = previewPaneProps.pinnedPreviewResult;

  useEffect(() => {
    if (!pinnedPreviewResult) {
      setIsPinnedDrawerOpen(false);
      return;
    }
    setIsPinnedDrawerOpen(false);
  }, [pinnedPreviewResult?.dataUrl, pinnedPreviewResult?.seed]);

  return (
    <div className="relative z-0 flex min-h-0 flex-1 overflow-visible bg-base-200">
      {pinnedPreviewResult
        ? (
            <div className="pointer-events-none absolute bottom-4 left-0 z-10">
              <div
                className="pointer-events-auto flex items-stretch transition-transform duration-300 ease-out"
                style={{ transform: isPinnedDrawerOpen ? "translateX(0)" : "translateX(calc(-100% + 2.75rem))" }}
              >
                <button
                  type="button"
                  className="w-[124px] overflow-hidden rounded-none border border-white/22 bg-base-100/95 p-2 text-left shadow-xl backdrop-blur"
                  title="切回 pinned 预览"
                  onClick={() => {
                    previewPaneProps.onSelectPinnedPreview();
                    setIsPinnedDrawerOpen(false);
                  }}
                >
                  <div className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-base-content/60">
                    <PushPinIcon className="size-3.5" weight="regular" />
                    <span>Pinned</span>
                  </div>
                  <img
                    src={pinnedPreviewResult.dataUrl}
                    className="h-24 w-full rounded-none object-cover"
                    alt="pinned-preview"
                  />
                </button>
                <button
                  type="button"
                  className="flex w-11 shrink-0 items-center justify-center rounded-none border border-l-0 border-white/22 bg-base-100/95 text-base-content/72 shadow-xl backdrop-blur transition-colors hover:bg-base-100 hover:text-base-content"
                  aria-label={isPinnedDrawerOpen ? "收起 pinned 预览" : "展开 pinned 预览"}
                  title={isPinnedDrawerOpen ? "收起 pinned 预览" : "展开 pinned 预览"}
                  onClick={() => setIsPinnedDrawerOpen(prev => !prev)}
                >
                  {isPinnedDrawerOpen
                    ? <CaretLeftIcon className="size-5" weight="bold" />
                    : <CaretRightIcon className="size-5" weight="bold" />}
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

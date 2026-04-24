// AI 生图页面：对齐 NovelAI Image 的桌面端布局与交互；当前保留免费单张 txt2img，并开放预览区 Inpaint。
import { useCallback, useEffect, useRef, useState } from "react";
import { UploadSimpleIcon } from "@phosphor-icons/react";

import { AiImageSidebar } from "@/components/aiImage/AiImageSidebar";
import { AiImageWorkspace } from "@/components/aiImage/AiImageWorkspace";
import { InpaintDialog } from "@/components/aiImage/InpaintDialog";
import { MetadataImportDialog } from "@/components/aiImage/MetadataImportDialog";
import { PreviewImageDialog } from "@/components/aiImage/PreviewImageDialog";
import { StylePickerDialog } from "@/components/aiImage/StylePickerDialog";
import { useAiImagePageController } from "@/components/aiImage/useAiImagePageController";

const AI_IMAGE_SIDEBAR_MIN_RATIO = 0.18;
const AI_IMAGE_SIDEBAR_MAX_RATIO = 0.23;
const AI_IMAGE_SIDEBAR_DEFAULT_RATIO = 0.2;

function clampAiImageSidebarWidth(nextWidth: number, containerWidth: number) {
  const minWidth = Math.round(containerWidth * AI_IMAGE_SIDEBAR_MIN_RATIO);
  const maxWidth = Math.round(containerWidth * AI_IMAGE_SIDEBAR_MAX_RATIO);
  return Math.min(maxWidth, Math.max(minWidth, nextWidth));
}

export default function AiImagePage() {
  const controller = useAiImagePageController();
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(null);
  const isSidebarVisible = !controller.sidebarProps.isDirectorToolsOpen;

  useEffect(() => {
    const layoutElement = layoutRef.current;
    if (!layoutElement)
      return;

    const syncSidebarWidth = () => {
      const containerWidth = layoutElement.clientWidth;
      if (!containerWidth)
        return;

      setSidebarWidth((prevWidth) => {
        const defaultWidth = clampAiImageSidebarWidth(
          Math.round(containerWidth * AI_IMAGE_SIDEBAR_DEFAULT_RATIO),
          containerWidth,
        );
        if (prevWidth == null)
          return defaultWidth;
        const clampedWidth = clampAiImageSidebarWidth(prevWidth, containerWidth);
        return clampedWidth === prevWidth ? prevWidth : clampedWidth;
      });
    };

    syncSidebarWidth();

    if (typeof ResizeObserver === "function") {
      const resizeObserver = new ResizeObserver(syncSidebarWidth);
      resizeObserver.observe(layoutElement);
      return () => resizeObserver.disconnect();
    }

    window.addEventListener("resize", syncSidebarWidth);
    return () => window.removeEventListener("resize", syncSidebarWidth);
  }, []);

  const handleSidebarResizeStart = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isSidebarVisible)
      return;

    const layoutElement = layoutRef.current;
    if (!layoutElement)
      return;

    event.preventDefault();

    const containerWidth = layoutElement.clientWidth;
    if (!containerWidth)
      return;

    const startX = event.clientX;
    const startWidth = sidebarWidth ?? clampAiImageSidebarWidth(
      Math.round(containerWidth * AI_IMAGE_SIDEBAR_DEFAULT_RATIO),
      containerWidth,
    );
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextContainerWidth = layoutRef.current?.clientWidth ?? 0;
      if (!nextContainerWidth)
        return;

      const deltaX = moveEvent.clientX - startX;
      setSidebarWidth(clampAiImageSidebarWidth(startWidth + deltaX, nextContainerWidth));
    };

    const handleMouseUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, [isSidebarVisible, sidebarWidth]);

  return (
    <div
      className="ai-image-shell relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-base-100"
      onDragEnter={controller.handlePageImageDragEnter}
      onDragLeave={controller.handlePageImageDragLeave}
      onDragOver={controller.handlePageImageDragOver}
      onDrop={controller.handlePageImageDrop}
    >
      <style>{`
        .ai-image-shell {
          --ai-image-surface-radius: 0.375rem;
        }

        .ai-image-shell :where(
          .card,
          .btn,
          .collapse,
          .badge,
          .join,
          .join-item,
          .modal-box,
          button,
          details,
          summary,
          img,
          canvas,
          [class*="rounded"]
        ) {
          border-radius: var(--ai-image-surface-radius) !important;
        }

        .ai-image-shell :where(
          .input,
          .select,
          .textarea,
          .checkbox,
          .toggle,
          input,
          select,
          textarea
        ) {
          border-radius: 0 !important;
        }

        .ai-image-shell :where(
          .rounded-full,
          [class*="rounded-full"],
          .btn-circle
        ) {
          border-radius: 9999px !important;
        }
      `}</style>
      {controller.isPageImageDragOver
        ? (
            <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-base-100/52 backdrop-blur-[2px]">
              <div className="flex size-[88px] items-center justify-center rounded-[24px] border border-base-300/60 bg-base-300/90 shadow-[0_16px_34px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                <UploadSimpleIcon className="size-11 text-base-content/85 drop-shadow-[0_1px_1px_rgba(0,0,0,0.16)]" weight="bold" aria-hidden="true" />
              </div>
            </div>
          )
        : null}

      <input
        ref={controller.sourceFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file)
            return;
          void controller.handlePickSourceImage(file, { source: "picker", imageCount: 1 });
          event.target.value = "";
        }}
      />
      <input
        ref={controller.vibeReferenceInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = event.target.files;
          if (!files?.length)
            return;
          void controller.handlePickVibeReferences(files);
          event.target.value = "";
        }}
      />
      <input
        ref={controller.preciseReferenceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file)
            return;
          void controller.handlePickPreciseReference(file);
          event.target.value = "";
        }}
      />

      <div ref={layoutRef} className="flex min-h-0 flex-1 overflow-hidden bg-base-200">
        {isSidebarVisible
          ? (
              <>
                <div
                  className="relative z-20 flex min-h-0 min-w-0 shrink-0"
                  style={sidebarWidth == null ? undefined : { width: `${sidebarWidth}px` }}
                >
                  <AiImageSidebar sidebarProps={controller.sidebarProps} />
                  <button
                    type="button"
                    className="group absolute inset-y-0 right-0 z-30 w-3 translate-x-1/2 cursor-col-resize touch-none bg-transparent px-0"
                    aria-label="拖拽调整 AI 生图侧边栏宽度"
                    title="拖拽调整 AI 生图侧边栏宽度"
                    onMouseDown={handleSidebarResizeStart}
                  >
                    <span className="mx-auto my-3 block h-[calc(100%-1.5rem)] w-px rounded-full bg-base-300/70 transition-colors group-hover:bg-primary/45 group-active:bg-primary" />
                  </button>
                </div>
              </>
            )
          : null}
        <AiImageWorkspace {...controller.workspaceProps} />
      </div>

      <MetadataImportDialog {...controller.metadataImportDialogProps} />
      <PreviewImageDialog {...controller.previewImageDialogProps} />
      <InpaintDialog {...controller.inpaintDialogProps} />
      <StylePickerDialog {...controller.stylePickerDialogProps} />
    </div>
  );
}

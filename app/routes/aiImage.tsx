// AI 生图页面：对齐 NovelAI Image 的桌面端布局与交互；当前保留免费单张 txt2img，并开放预览区 Inpaint。
import { useCallback, useEffect, useRef, useState } from "react";

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
          --color-primary: #2fb7a8;
          --color-primary-content: #ffffff;
          --color-info: #59cabc;
          --color-info-content: #ffffff;
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
            <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-base-100/70 backdrop-blur-sm">
              <div className="rounded-2xl border-2 border-primary bg-base-100/95 px-6 py-5 text-center shadow-2xl">
                <div className="text-lg font-semibold text-primary">松开导入到 AI 绘画页</div>
                <div className="mt-2 text-sm text-base-content/70">
                  支持外部图片和历史记录图片拖回本页。若检测到 NovelAI metadata，会先弹出导入设置选项；无 metadata 时不会再直接导入 Base Img。
                </div>
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
          void controller.handlePickSourceImage(file);
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
                </div>
                <button
                  type="button"
                  className="group relative z-20 flex w-2 shrink-0 cursor-col-resize items-stretch justify-center bg-base-200 px-0 touch-none"
                  aria-label="拖拽调整 AI 生图侧边栏宽度"
                  title="拖拽调整 AI 生图侧边栏宽度"
                  onMouseDown={handleSidebarResizeStart}
                >
                  <span className="my-3 w-px rounded-full bg-base-300 transition-colors group-hover:bg-primary/45 group-active:bg-primary" />
                </button>
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

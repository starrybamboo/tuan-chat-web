// AI 生图页面：对齐 NovelAI Image 的桌面端布局与交互；当前保留免费单张 txt2img，并开放预览区 Inpaint。
import { AiImageSidebar } from "@/components/aiImage/AiImageSidebar";
import { AiImageWorkspace } from "@/components/aiImage/AiImageWorkspace";
import { InpaintDialog } from "@/components/aiImage/InpaintDialog";
import { MetadataImportDialog } from "@/components/aiImage/MetadataImportDialog";
import { PreviewImageDialog } from "@/components/aiImage/PreviewImageDialog";
import { StylePickerDialog } from "@/components/aiImage/StylePickerDialog";
import { useAiImagePageController } from "@/components/aiImage/useAiImagePageController";

export default function AiImagePage() {
  const controller = useAiImagePageController();

  return (
    <div
      className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-base-100"
      onDragEnter={controller.handlePageImageDragEnter}
      onDragLeave={controller.handlePageImageDragLeave}
      onDragOver={controller.handlePageImageDragOver}
      onDrop={controller.handlePageImageDrop}
    >
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

      <div className="flex min-h-0 flex-1 overflow-hidden bg-base-200">
        <AiImageSidebar sidebarProps={controller.sidebarProps} />
        <AiImageWorkspace {...controller.workspaceProps} />
      </div>

      <MetadataImportDialog {...controller.metadataImportDialogProps} />
      <PreviewImageDialog {...controller.previewImageDialogProps} />
      <InpaintDialog {...controller.inpaintDialogProps} />
      <StylePickerDialog {...controller.stylePickerDialogProps} />
    </div>
  );
}

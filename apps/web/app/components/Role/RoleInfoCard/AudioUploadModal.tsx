import { useMemo, useState } from "react";

import { appToast } from "@/components/common/appToast/appToast";
import { Button } from "@/components/common/Button";
import { DialogFrame } from "@/components/common/DialogFrame";
import { UploadDropZone } from "@/components/common/MediaFrame";
import { Surface, surfaceClassName } from "@/components/common/DesignLanguage";
import { InlineAlert } from "@/components/common/StatusPrimitives";
import { UploadUtils } from "@/utils/media/UploadUtils";

type AudioUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (audio: { voiceFileId: number; mediaType: string }) => void;
}

/**
 * 音频上传弹窗组件
 * 用于上传音频文件作为AI生成角色音色的参考
 */
export default function AudioUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: AudioUploadModalProps) {
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 音频上传工具实例
  const uploadUtils = useMemo(() => new UploadUtils(), []);

  // 处理音频文件选择
  const handleAudioFileSelect = (file: File) => {
    setSelectedAudioFile(file);
  };

  // 检查文件类型是否为音频
  const isAudioFile = (file: File) => {
    const audioTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/mp4",
      "audio/aac",
      "audio/ogg",
      "audio/webm",
    ];
    const audioExtensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".webm"];

    return audioTypes.includes(file.type)
      || audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  const handleAudioFiles = (files: File[]) => {
    const audioFile = files.find(file => isAudioFile(file));

    if (audioFile) {
      handleAudioFileSelect(audioFile);
    }
    else if (files.length > 0) {
      appToast.error("请选择音频文件（MP3、WAV、M4A、AAC、OGG）");
    }
  };

  // 处理音频上传
  const handleAudioUpload = async () => {
    if (!selectedAudioFile)
      return;

    try {
      setIsUploading(true);
      appToast.loading("正在上传音频文件...", { id: "audio-upload" });

      // 语音参考文件：上传原始音频（不做 Opus 转码），避免影响后续音色参考质量/兼容性
      const uploadedAudio = await uploadUtils.uploadAudioOriginalAsset(selectedAudioFile, 1);

      appToast.success("音频文件上传成功！", { id: "audio-upload" });

      // 调用成功回调
      onSuccess?.({
        voiceFileId: uploadedAudio.fileId,
        mediaType: uploadedAudio.mediaType,
      });

      // 清理状态并关闭弹窗
      setSelectedAudioFile(null);
      onClose();
    }
    catch (error) {
      console.error("音频上传失败:", error);
      appToast.error(
        `音频上传失败: ${error instanceof Error ? error.message : "未知错误"}`,
        { id: "audio-upload" },
      );
    }
    finally {
      setIsUploading(false);
    }
  };

  // 处理弹窗关闭
  const handleClose = () => {
    setSelectedAudioFile(null);
    onClose();
  };

  // 重置文件选择
  const handleResetFile = () => {
    setSelectedAudioFile(null);
  };

  if (!isOpen)
    return null;

  return (
    <DialogFrame
      open={isOpen}
      mode="inline"
      onClose={handleClose}
      ariaLabel="上传音频"
      rootClassName="z-50"
      panelClassName={surfaceClassName({
        level: "floating",
        className: "max-h-[80vh] w-full max-w-md overflow-hidden",
      })}
    >
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-semibold">上传音频文件</h3>
          </div>

          <div className="space-y-4">
            {/* 提示信息 */}
            <InlineAlert
              tone="info"
              icon={(
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="size-6 stroke-current">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              )}
            >
              <div className="text-sm">
                <div className="mb-1 font-semibold">音频文件要求：</div>
                <ul className="ml-10 list-disc list-inside space-y-1">
                  <li>支持格式：MP3、WAV、M4A、AAC、OGG</li>
                  <li>时长要求：几秒钟即可，建议在30秒以内</li>
                  <li>用途：AI将基于此音频生成角色专属音色</li>
                </ul>
              </div>
            </InlineAlert>

            {selectedAudioFile
                ? (
                    <Surface level="inset" className="space-y-3 p-6 text-center">
                      <div className="
                        flex items-center justify-center size-12 mx-auto
                        bg-success/10 rounded-full
                      ">
                        <svg className="size-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-success">{selectedAudioFile.name}</p>
                        <p className="text-sm text-base-content/60">
                          文件大小:
                          {" "}
                          {(selectedAudioFile.size / 1024 / 1024).toFixed(2)}
                          {" "}
                          MB
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFile}
                      >
                        重新选择
                      </Button>
                    </Surface>
                  )
                : (
                    <UploadDropZone
                      accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm"
                      label="选择或拖入音频文件"
                      description="支持 MP3、WAV、M4A、AAC、OGG、WEBM"
                      onFiles={handleAudioFiles}
                    />
                  )}

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={handleClose}
              >
                取消
              </Button>
              <Button
                variant="primary"
                loading={isUploading}
                disabled={!selectedAudioFile || isUploading}
                onClick={handleAudioUpload}
              >
                {isUploading ? "上传中..." : "上传"}
              </Button>
            </div>
          </div>
        </div>
    </DialogFrame>
  );
}

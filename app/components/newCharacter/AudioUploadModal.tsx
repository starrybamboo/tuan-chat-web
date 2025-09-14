import { UploadUtils } from "@/utils/UploadUtils";
import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";

interface AudioUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (audioUrl: string) => void; // 上传成功的回调，返回音频URL
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

  // 处理音频上传
  const handleAudioUpload = async () => {
    if (!selectedAudioFile)
      return;

    try {
      setIsUploading(true);
      toast.loading("正在上传音频文件...", { id: "audio-upload" });

      // 上传音频文件，场景为5（音频文件），最大时长30秒
      const audioUrl = await uploadUtils.uploadAudio(selectedAudioFile, 5, 30);

      toast.success("音频文件上传成功！", { id: "audio-upload" });

      // 调用成功回调
      onSuccess?.(audioUrl);

      // 清理状态并关闭弹窗
      setSelectedAudioFile(null);
      onClose();
    }
    catch (error) {
      console.error("音频上传失败:", error);
      toast.error(
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
    const input = document.getElementById("audioFileInput") as HTMLInputElement;
    if (input)
      input.value = "";
  };

  if (!isOpen)
    return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div className="bg-base-100 rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">上传音频文件</h3>
            <button
              type="button"
              className="btn btn-sm btn-circle btn-ghost"
              onClick={handleClose}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {/* 提示信息 */}
            <div className="alert bg-info/20">

              <div className="text-sm">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div className="font-semibold mb-1">音频文件要求：</div>
                </div>
                <ul className="ml-10 list-disc list-inside space-y-1">
                  <li>支持格式：MP3、WAV、M4A、AAC、OGG</li>
                  <li>时长要求：几秒钟即可，建议在30秒以内</li>
                  <li>用途：AI将基于此音频生成角色专属音色</li>
                </ul>
              </div>
            </div>

            {/* 文件上传区域 */}
            <div className="border-2 border-dashed border-base-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
                className="hidden"
                id="audioFileInput"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleAudioFileSelect(file);
                  }
                }}
              />

              {selectedAudioFile
                ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-success/10 rounded-full">
                        <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={handleResetFile}
                      >
                        重新选择
                      </button>
                    </div>
                  )
                : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-secondary/10 rounded-full">
                        <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">选择音频文件</p>
                        <p className="text-sm text-base-content/60">
                          点击下方按钮或拖拽文件到此处
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => document.getElementById("audioFileInput")?.click()}
                      >
                        选择文件
                      </button>
                    </div>
                  )}
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleClose}
              >
                取消
              </button>
              <button
                type="button"
                className={`btn btn-primary ${isUploading ? "loading" : ""}`}
                disabled={!selectedAudioFile || isUploading}
                onClick={handleAudioUpload}
              >
                {isUploading ? "上传中..." : "上传"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

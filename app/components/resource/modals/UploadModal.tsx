import { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { UploadUtils } from "@/utils/UploadUtils";
import { useUploadResourceMutation } from "../../../../api/hooks/resourceQueryHooks";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [selectedType, setSelectedType] = useState<"5" | "6">("5"); // 5: 图片, 6: 音频
  const [isUploading, setIsUploading] = useState(false);
  const [resourceName, setResourceName] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isAI, setIsAI] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const uploadUtils = useMemo(() => new UploadUtils(), []);
  const uploadResourceMutation = useUploadResourceMutation();

  // 重置表单
  const resetForm = () => {
    setResourceName("");
    setIsPublic(false);
    setIsAI(false);
    setSelectedFile(null);
    setSelectedType("5");
  };

  // 重置文件选择
  const resetFile = () => {
    setSelectedFile(null);
    const input = document.getElementById("resourceFileInput") as HTMLInputElement;
    if (input)
      input.value = "";
  };

  // 处理弹窗关闭
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 检查文件类型
  const isValidFile = (file: File) => {
    if (selectedType === "5") {
      // 图片文件检查
      const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
      return imageTypes.includes(file.type)
        || imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    }
    else {
      // 音频文件检查
      const audioTypes = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/aac", "audio/ogg", "audio/webm"];
      const audioExtensions = [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".webm"];
      return audioTypes.includes(file.type)
        || audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    }
  };

  // 处理拖拽进入
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  // 处理拖拽离开
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  // 处理拖拽悬停
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // 处理文件拖拽放下
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(file => isValidFile(file));

    if (validFile) {
      setSelectedFile(validFile);
    }
    else if (files.length > 0) {
      const fileType = selectedType === "5" ? "图片" : "音频";
      const formats = selectedType === "5" ? "JPG、PNG、GIF、WEBP" : "MP3、WAV、M4A、AAC、OGG";
      toast.error(`请选择${fileType}文件（${formats}）`);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !resourceName.trim()) {
      toast.error("请选择文件并输入资源名称");
      return;
    }

    try {
      setIsUploading(true);
      toast.loading("正在上传文件...", { id: "resource-upload" });
      let url: string;

      // 根据类型上传
      if (selectedType === "5") {
        // 图片
        url = await uploadUtils.uploadImg(selectedFile, 1);
      }
      else {
        // 音频
        url = await uploadUtils.uploadAudio(selectedFile, 1);
      }

      // 调用接口保存资源
      await uploadResourceMutation.mutateAsync({
        type: selectedType,
        url,
        name: resourceName,
        isPublic,
        isAi: isAI,
      });

      toast.success("资源上传成功！", { id: "resource-upload" });

      // 重置表单
      resetForm();
      onSuccess();
      onClose();
    }
    catch (error) {
      console.error("上传失败:", error);
      toast.error(
        `上传失败: ${error instanceof Error ? error.message : "未知错误"}`,
        { id: "resource-upload" },
      );
    }
    finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (isValidFile(file)) {
      setSelectedFile(file);
    }
    else {
      const fileType = selectedType === "5" ? "图片" : "音频";
      const formats = selectedType === "5" ? "JPG、PNG、GIF、WEBP" : "MP3、WAV、M4A、AAC、OGG";
      toast.error(`请选择${fileType}文件（${formats}）`);
    }
  };

  if (!isOpen)
    return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div className="bg-base-100 rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">上传资源</h3>
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
            {/* 资源类型选择 */}
            <div>
              <label className="block text-sm font-medium mb-2">资源类型</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType("5");
                    setSelectedFile(null);
                  }}
                  className={`btn flex-1 ${
                    selectedType === "5" ? "btn-primary" : "btn-outline"
                  }`}
                >
                  图片
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedType("6");
                    setSelectedFile(null);
                  }}
                  className={`btn flex-1 ${
                    selectedType === "6" ? "btn-primary" : "btn-outline"
                  }`}
                >
                  音频
                </button>
              </div>
            </div>

            {/* 提示信息 */}
            <div className="alert bg-info/20">
              <div className="text-sm">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <div>
                    <ul className="ml-4 list-disc list-inside space-y-1">
                      {selectedType === "5"
                        ? (
                            <>
                              <li>支持格式：JPG、PNG、GIF</li>
                            </>
                          )
                        : (
                            <>
                              <li>支持格式：MP3、WAV、M4A、AAC</li>
                            </>
                          )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 资源名称 */}
            <div>
              <label className="block text-sm font-medium mb-2">资源名称</label>
              <input
                type="text"
                value={resourceName}
                onChange={e => setResourceName(e.target.value)}
                placeholder="请输入资源名称"
                className="input input-bordered w-full"
              />
            </div>

            {/* 设置选项 */}
            <div className="space-y-3 flex row-auto">
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={e => setIsPublic(e.target.checked)}
                    className="checkbox checkbox-primary"
                  />
                  <div>
                    <span className="label-text font-medium">设为公开资源</span>
                    <div className="text-xs text-base-content/60">其他用户可以使用此资源</div>
                  </div>
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3">
                  <input
                    type="checkbox"
                    checked={isAI}
                    onChange={e => setIsAI(e.target.checked)}
                    className="checkbox checkbox-secondary"
                  />
                  <div>
                    <span className="label-text font-medium">AI生成内容</span>
                    <div className="text-xs text-base-content/60">由AI工具生成</div>
                  </div>
                </label>
              </div>
            </div>

            {/* 文件上传区域 */}
            <div>
              <label className="block text-sm font-medium mb-2">选择文件</label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-base-300 hover:border-primary/50"
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept={selectedType === "5" ? "image/*,.jpg,.jpeg,.png,.gif,.webp" : "audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm"}
                  className="hidden"
                  id="resourceFileInput"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(file);
                    }
                  }}
                />

                {selectedFile
                  ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-success/10 rounded-full">
                          <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-success overflow-hidden">{selectedFile.name}</p>
                          <p className="text-sm text-base-content/60">
                            文件大小:
                            {" "}
                            {(selectedFile.size / 1024 / 1024).toFixed(2)}
                            {" "}
                            MB
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={resetFile}
                        >
                          重新选择
                        </button>
                      </div>
                    )
                  : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-secondary/10 rounded-full">
                          {selectedType === "5"
                            ? (
                                <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              )
                            : (
                                <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                </svg>
                              )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {isDragOver ? "释放文件以上传" : `选择${selectedType === "5" ? "图片" : "音频"}文件`}
                          </p>
                          <p className="text-sm text-base-content/60">
                            {isDragOver
                              ? "松开鼠标即可开始上传文件"
                              : "点击下方按钮或拖拽文件到此处"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => document.getElementById("resourceFileInput")?.click()}
                        >
                          选择文件
                        </button>
                      </div>
                    )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-end pt-4">
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
                disabled={!selectedFile || !resourceName.trim() || isUploading}
                onClick={handleUpload}
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

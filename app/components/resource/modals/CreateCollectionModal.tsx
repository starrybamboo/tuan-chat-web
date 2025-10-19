import { useState } from "react";
import { useCreateResourceCollectionMutation } from "../../../../api/hooks/resourceQueryHooks";
import { UploadUtils } from "../../../utils/UploadUtils";

interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  resourceType: "5" | "6";
}

export function CreateCollectionModal({ isOpen, onClose, onSuccess, resourceType }: CreateCollectionModalProps) {
  const [collectionName, setCollectionName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [coverImage, setCoverImage] = useState<string | undefined>(undefined);
  const [coverImageFile, setCoverImageFile] = useState<File | undefined>(undefined);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const createCollectionMutation = useCreateResourceCollectionMutation();
  const uploadUtils = new UploadUtils();

  // 重置表单
  const resetForm = () => {
    setCollectionName("");
    setDescription("");
    setIsPublic(false);
    setCoverImage(undefined);
    setCoverImageFile(undefined);
  };

  // 处理弹窗关闭
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 检查文件类型
  const isValidImageFile = (file: File) => {
    const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    return imageTypes.includes(file.type)
      || imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
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

  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    if (!isValidImageFile(file)) {
      console.error("请选择图片文件（JPG、PNG、GIF、WEBP）");
      return;
    }

    try {
      setIsUploadingImage(true);
      setCoverImageFile(file);
      const imageUrl = await uploadUtils.uploadImg(file, 4); // scene 4 表示模组图片
      setCoverImage(imageUrl);
    }
    catch (error) {
      console.error("图片上传失败:", error);
      setCoverImageFile(undefined);
    }
    finally {
      setIsUploadingImage(false);
    }
  };

  // 处理文件拖拽放下
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(file => isValidImageFile(file));

    if (validFile) {
      handleImageUpload(validFile);
    }
    else if (files.length > 0) {
      console.error("请选择图片文件（JPG、PNG、GIF、WEBP）");
    }
  };

  // 重置封面图片
  const resetCoverImage = () => {
    setCoverImage(undefined);
    setCoverImageFile(undefined);
    const input = document.getElementById("coverImageInput") as HTMLInputElement;
    if (input)
      input.value = "";
  };

  const handleCreate = async () => {
    if (!collectionName.trim()) {
      console.error("请输入素材集名称");
      return;
    }

    try {
      setIsCreating(true);

      await createCollectionMutation.mutateAsync({
        collectionListName: collectionName,
        description,
        isPublic,
        resourceListType: resourceType,
        coverImageUrl: coverImage, // 添加封面图片
      });

      // 重置表单
      resetForm();
      onSuccess();
      onClose();
    }
    catch (error) {
      console.error("创建失败:", error);
    }
    finally {
      setIsCreating(false);
    }
  };

  if (!isOpen)
    return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div className="bg-base-100 rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">新建素材集</h3>
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
            {/* 素材集名称 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                素材集名称 *
              </label>
              <input
                type="text"
                value={collectionName}
                onChange={e => setCollectionName(e.target.value)}
                placeholder="请输入素材集名称"
                className="input input-bordered w-full"
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                描述
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="请输入素材集描述（可选）"
                className="textarea textarea-bordered w-full resize-none"
                rows={3}
              />
            </div>

            {/* 封面图片上传 */}
            <div>
              <label className="block text-sm font-medium mb-2">封面图片（可选）</label>

              {/* 图片预览区域 */}
              {(coverImage || coverImageFile)
                ? (
                    <div className="relative w-full">
                      <img
                        src={coverImageFile
                          ? URL.createObjectURL(coverImageFile)
                          : coverImage}
                        alt="封面预览"
                        className="w-full h-32 object-cover rounded-lg border border-base-300"
                      />
                      {isUploadingImage && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                          <span className="loading loading-spinner loading-lg text-white"></span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={resetCoverImage}
                        className="absolute top-2 right-2 btn btn-sm btn-circle btn-error"
                        disabled={isUploadingImage}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )
                : (
              /* 上传区域 */
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
                        accept="image/*,.jpg,.jpeg,.png,.gif,.webp"
                        className="hidden"
                        id="coverImageInput"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file);
                          }
                        }}
                      />

                      <div className="space-y-3">
                        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-secondary/10 rounded-full">
                          <svg className="w-6 h-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium">拖拽图片到此处或点击上传</p>
                          <p className="text-xs text-base-content/60 mt-1">
                            支持 JPG、PNG、GIF、WEBP 格式
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => document.getElementById("coverImageInput")?.click()}
                        >
                          选择图片
                        </button>
                      </div>
                    </div>
                  )}
            </div>

            {/* 公开设置 */}
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={e => setIsPublic(e.target.checked)}
                  className="checkbox checkbox-primary"
                />
                <div>
                  <span className="label-text font-medium">设为公开素材集</span>
                  <div className="text-xs text-base-content/60">其他用户可以使用此素材集</div>
                </div>
              </label>
            </div>

            {/* 资源类型提示 */}
            <div className="alert bg-info/20">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <div className="flex items-center gap-2 text-sm">
                  <span>
                    {resourceType === "5"
                      ? "🖼️"
                      : "🎵"}
                  </span>
                  <span>
                    此素材集将用于存储
                    {resourceType === "5"
                      ? "图片"
                      : "音频"}
                    资源
                  </span>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleClose}
                disabled={isCreating}
              >
                取消
              </button>
              <button
                type="button"
                className={`btn btn-primary ${isCreating
                  ? "loading"
                  : ""}`}
                disabled={isCreating || !collectionName.trim()}
                onClick={handleCreate}
              >
                {isCreating
                  ? "创建中..."
                  : "创建"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

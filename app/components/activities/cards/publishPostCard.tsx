import type { Sticker } from "@tuanchat/openapi-client/models/Sticker";
import type { PublishPostImageAsset } from "./publishPostMedia";
import React, { useEffect, useRef, useState } from "react";
import StickerWindow from "@/components/chat/window/StickerWindow";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import { EmojiIconWhite, Image2Fill, XMarkICon } from "@/icons";
import { imageLowUrl } from "@/utils/mediaUrl";
import { UploadUtils } from "@/utils/UploadUtils";
import { usePublishMomentFeedMutation } from "../../../../api/hooks/activitiesFeedQuerryHooks";
import { useGetUserInfoQuery } from "../../../../api/hooks/UserHooks";
import {
  buildMomentFeedRequestFromPostMedia,
  createStickerPublishImage,
  getPublishPostImagePreviewUrl,

} from "./publishPostMedia";

interface PublishBoxProps {
  loginUserId: number;
}

const PublishPostCard: React.FC<PublishBoxProps> = ({ loginUserId }) => {
  const [content, setContent] = useState("");
  const [rows, setRows] = useState(3);
  const [isPublishing, setIsPublishing] = useState(false);

  // 图片状态数组（按插入顺序）
  const [images, setImages] = useState<PublishPostImageAsset[]>([]);

  // 控制表情弹窗显示（如果你想改为 Modal，可替换）
  const [showStickerWindow, setShowStickerWindow] = useState(false);

  const uploadUtilsRef = useRef(new UploadUtils());
  const uploadingPromisesRef = useRef<Record<string, Promise<void>>>({});

  const publishMutation = usePublishMomentFeedMutation();

  // 获取用户信息
  const userQuery = useGetUserInfoQuery(loginUserId);
  const user = userQuery.data?.data;

  const maxLength = 500; // 最大字符数限制
  const currentLength = content.length;
  const maxImages = 9;
  const maxFileSize = 20 * 1024 * 1024; // 20MB

  // 根据内容动态调整高度（保留原逻辑）
  useEffect(() => {
    const lines = content.split("\n").length;
    const estimatedLines = Math.ceil(content.length / 50); // 大约每行50字符
    const totalLines = Math.max(lines, estimatedLines);

    // 最少3行，最多8行
    const newRows = Math.min(Math.max(totalLines, 3), 8);
    setRows(newRows);
  }, [content]);

  // 处理发布动态
  // 组件卸载时释放 blob URL（防内存泄露）
  useEffect(() => {
    return () => {
      images.forEach((i) => {
        if (i.file && i.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(i.previewUrl);
        }
      });
    };
  }, [images]);

  // 本地文件被 ImgUploader 返回时的处理
  // ImgUploader 会调用 setImg(file)
  const handleLocalFileSelected = (file: File) => {
    if (!file)
      return;

    if (file.size > maxFileSize) {
      // TODO: 更优 UI 提示
      // alert(`ͼƬ ${file.name} 超过 20MB，无法添加`);
      return;
    }
    // if (images.length >= maxImages) {
    //
    //   return;
    // }

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const blobUrl = URL.createObjectURL(file);

    const newImg: PublishPostImageAsset = {
      id,
      file,
      previewUrl: blobUrl,
      uploading: true, // 参考 StickerWindow：选择即上传 -> uploading true
      error: null,
      name: file.name,
      size: file.size,
    };

    // 先把缩略图放到 UI（紧凑横向条）
    setImages(prev => [...prev, newImg]);

    uploadingPromisesRef.current[id] = (async () => {
      try {
        const uploadedImage = await uploadUtilsRef.current.uploadDualImage(file, 1);
        setImages(prev => prev.map(p => (p.id === id
          ? {
              ...p,
              uploading: false,
              fileId: uploadedImage.fileId,
              mediaType: uploadedImage.mediaType,
              previewUrl: getPublishPostImagePreviewUrl({
                fileId: uploadedImage.fileId,
                mediaType: uploadedImage.mediaType,
                previewUrl: p.previewUrl,
              }),
            }
          : p)));
      }
      catch (err: any) {
        const msg = err?.message || "上传失败";
        setImages(prev => prev.map(p => (p.id === id ? { ...p, uploading: false, error: msg } : p)));
      }
      finally {
        delete uploadingPromisesRef.current[id];
      }
    })();
  };

  const handleEmojiChoose = (emoji: Sticker) => {
    const newImg = createStickerPublishImage(emoji);
    if (!newImg)
      return;
    // 我还没想好存多少图片
    // if (images.length >= maxImages) {
    //   alert(`最多只能上传 ${maxImages} 张图片`);
    //   return;
    // }
    setImages(prev => [...prev, newImg]);
    // 如果你想在选择表情包后自动关闭弹窗：
    setShowStickerWindow(false);
  };

  const handleDeleteImage = (id: string) => {
    setImages((prev) => {
      const toRemove = prev.find(p => p.id === id);
      if (toRemove?.file && toRemove.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(toRemove.previewUrl);
      }
      return prev.filter(p => p.id !== id);
    });
  };
  const handlePublish = async () => {
    if (!content.trim() || currentLength > maxLength || isPublishing) {
      return;
    }

    setIsPublishing(true);

    try {
      const pending = Object.values(uploadingPromisesRef.current);
      if (pending.length > 0) {
        await Promise.all(pending.map(p => p.catch(() => undefined)));
      }

      // 若存在上传失败的图片，阻止发布并提示
      const failed = images.find(i => i.error);
      if (failed) {
        // alert("有图片上传失败，请删除或重试后再发布");
        setIsPublishing(false);
        return;
      }

      const { request, invalidImageIds } = buildMomentFeedRequestFromPostMedia(content, images);
      if (invalidImageIds.length > 0) {
        setIsPublishing(false);
        return;
      }

      await publishMutation.mutateAsync(request);

      // 发布成功后释放本地 blob 并清理
      images.forEach((i) => {
        if (i.file && i.previewUrl.startsWith("blob:"))
          URL.revokeObjectURL(i.previewUrl);
      });

      // TODO: 添加成功提示
      setContent("");
      setRows(3);
      setImages([]);
    }
    catch (err) {
      console.error("发布失败:", err);
      // TODO: 错误提示 UI
    }
    finally {
      setIsPublishing(false);
    }
  };

  // 检查是否可以发布
  const canPublish = content.trim() && currentLength <= maxLength && !isPublishing;

  return (
    <div className="bg-base-100 rounded-xl shadow-sm border border-base-300 p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="flex items-start space-x-4">
        <div className="pointer-events-none relative flex-shrink-0">
          <img
            src={imageLowUrl(user?.avatarFileId) || undefined}
            alt={user?.username}
            className="mask mask-circle w-12 h-12 sm:w-14 sm:h-14 object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="relative">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="有什么新鲜事想告诉大家？"
              className="w-full p-3 border border-base-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
              rows={rows}
              disabled={isPublishing}
            />

            {/* 发布中的加载状态 */}
            {isPublishing && (
              <div className="absolute inset-0 bg-base-100/80 rounded-lg flex items-center justify-center">
                <div className="loading loading-spinner loading-sm text-primary"></div>
              </div>
            )}
          </div>

          {/* 缩略条：横向滚动、紧凑 */}
          {images.length > 0 && (
            <div className="mt-3">
              <div className="flex gap-2 overflow-x-auto py-1">
                {images.map((img, idx) => (
                  <div key={img.id} className="relative flex-shrink-0">
                    <button
                      type="button"
                      className="block w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden border border-base-300 bg-base-200/30"
                    >
                      <img
                        src={getPublishPostImagePreviewUrl(img)}
                        alt={img.name ?? `img-${idx}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>

                    {/* 上传状态或错误提示 */}
                    {img.uploading && (
                      <div className="absolute left-1 bottom-1 bg-base-100/80 rounded px-1 py-0.5 text-xs flex items-center">
                        <div className="loading loading-spinner loading-xs mr-1" />
                        <span className="text-xs">上传中</span>
                      </div>
                    )}
                    {img.error && (
                      <div className="absolute left-1 bottom-1 bg-error/95 text-error-content rounded px-1 py-0.5 text-xs">
                        失败
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute top-1 right-1 bg-base-100/80 hover:bg-error hover:text-error-content rounded-full w-6 h-6 flex items-center justify-center text-sm duration-300"
                      aria-label="删除图片"
                    >
                      <XMarkICon />
                    </button>
                  </div>
                ))}
              </div>

              <p className="text-xs text-base-content/60 mt-2">
                {images.length}
                /
                {maxImages}
                {" "}
                张
              </p>
            </div>
          )}

          {/* 发布失败提示 */}
          {publishMutation.isError && (
            <div className="mt-2 text-sm text-error">
              发布失败，请重试
            </div>
          )}

          {/* 下方操作栏 */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-3">
              <button
                className="text-base-content/60 hover:text-primary transition-colors p-1 rounded-full hover:bg-base-200 disabled:opacity-50 cursor-pointer"
                type="button"
                title="添加表情"
                disabled={isPublishing}
                onClick={() => setShowStickerWindow(v => !v)}
              >
                <EmojiIconWhite />
              </button>

              {/* 图片上传：使用你提供的 ImgUploader */}
              <ImgUploader setImg={handleLocalFileSelected}>
                <div
                  className="text-base-content/60 hover:text-primary transition-colors p-1 rounded-full hover:bg-base-200 cursor-pointer"
                  title="上传图片"
                >
                  <Image2Fill />
                </div>
              </ImgUploader>
            </div>

            {/* 右边：字数统计和发布按钮 */}
            <div className="flex items-center space-x-3">
              {/* 字数统计 */}
              <span className={`text-xs transition-colors ${
                currentLength > maxLength * 0.8
                  ? currentLength > maxLength
                    ? "text-error"
                    : "text-warning"
                  : "text-base-content/60"
              }`}
              >
                {currentLength}
                /
                {maxLength}
              </span>

              {/* 发布按钮 */}
              <button
                className={`px-4 sm:px-6 py-2 rounded-full font-medium transition-all duration-200 flex items-center space-x-2 ${
                  canPublish
                    ? "bg-primary text-primary-content hover:bg-primary/90 cursor-pointer shadow-sm hover:shadow"
                    : "bg-base-300 text-base-content/40"
                }`}
                disabled={!canPublish}
                onClick={handlePublish}
                type="button"
              >
                {isPublishing && (
                  <div className="loading loading-spinner loading-xs"></div>
                )}
                <span>发布</span>
              </button>
            </div>
          </div>

          {/* 表情包弹窗 */}
          {showStickerWindow && (
            <div className="mt-2 border border-base-300 rounded-lg bg-base-100 shadow-lg p-2">
              <StickerWindow onChoose={handleEmojiChoose} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublishPostCard;

import { useLocalStorage } from "@/components/common/customHooks/useLocalStorage";
import MarkdownEditor from "@/components/common/markdown/markdownEditor";
import { ImgUploader } from "@/components/common/uploader/imgUploader";
import CommunitySelector from "@/components/community/communitySelector";
import { UploadUtils } from "@/utils/UploadUtils";
import React, { useEffect, useState } from "react";
import { useListCommunitiesQuery } from "../../../api/hooks/communityQueryHooks";

export interface StoredPost {
  title?: string;
  content?: string;
  selectedCommunityId?: number;
  coverImage?: string; // 封面图片URL
}

interface PostEditorProps {
  onClose?: () => void;
  onSubmit: (post: StoredPost) => Promise<boolean>;
  enableCommunitySelection?: boolean; // 是否启用社区选择
  defaultCommunityId?: number; // 默认社区ID
}

/**
 * 帖子编辑器，也就是一个markdown编辑器
 * @param props 组件属性
 * @param props.onClose 关闭窗口的时候的回调函数
 * @param props.onSubmit 提交按钮的回调函数，异步执行, 传入帖子的标题和内容。如果发送成功，返回true，否则返回false。
 * @param props.enableCommunitySelection 是否启用社区选择功能
 * @param props.defaultCommunityId 默认社区ID
 * @constructor
 */
export default function PostEditor({
  onClose,
  onSubmit,
  enableCommunitySelection = false,
  defaultCommunityId,
}: PostEditorProps) {
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const [storedPost, setStoredPost] = useLocalStorage<StoredPost>("saveWritingPost", {});

  const [title, setTitle] = useState(storedPost.title ?? "");
  const [content, setContent] = useState(storedPost.content ?? "");
  const [coverImage, setCoverImage] = useState<string | undefined>(storedPost.coverImage);
  const [coverImageFile, setCoverImageFile] = useState<File | undefined>(undefined); // 临时存储文件对象用于预览
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | undefined>(
    storedPost.selectedCommunityId ?? defaultCommunityId,
  );

  // 获取社区列表（仅在启用社区选择时）
  const listCommunitiesQuery = useListCommunitiesQuery();
  const communityList = listCommunitiesQuery.data?.data ?? [];

  // 创建上传工具实例
  const uploadUtils = new UploadUtils();

  // 处理图片上传
  const handleImageUpload = async (file: File) => {
    try {
      setIsUploadingImage(true);
      setCoverImageFile(file); // 设置文件用于预览
      const imageUrl = await uploadUtils.uploadImg(file, 4); // scene 4 表示模组图片
      setCoverImage(imageUrl);
    }
    catch (error) {
      console.error("图片上传失败:", error);
      // 可以在这里添加错误提示
    }
    finally {
      setIsUploadingImage(false);
    }
  };

  useEffect(() => {
    setStoredPost({
      title,
      content,
      coverImage,
      selectedCommunityId: enableCommunitySelection ? selectedCommunityId : undefined,
    });
  }, [title, content, coverImage, selectedCommunityId, setStoredPost, enableCommunitySelection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (enableCommunitySelection && !selectedCommunityId) {
      return;
    }

    setIsPublishing(true);
    const isSuccess = await onSubmit({
      title,
      content,
      coverImage,
      selectedCommunityId: enableCommunitySelection ? selectedCommunityId : undefined,
    });
    setIsPublishing(false);
    if (!isSuccess)
      return;
    setTitle("");
    setContent("");
    setCoverImage(undefined);
    setCoverImageFile(undefined);
    setSelectedCommunityId(defaultCommunityId);
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="card bg-base-100 shadow-md h-full w-full">
      <div className="card-body flex h-full">
        <h2 className="card-title">
          创建帖子
          <span className="text-sm font-normal text-base-content/70 flex items-center badge badge-outline">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              className="mr-1 fill-info"
            >
              <path
                d="M12 1c6.075 0 11 4.925 11 11s-4.925 11-11 11S1 18.075 1 12 5.925 1 12 1Zm0 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 13a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm1-9v8h-2V7h2Z"
              />
            </svg>
            所有改动都会实时保存到浏览器本地
          </span>
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
          <div>
            <label className="label">
              <span className="label-text">标题</span>
            </label>
            <input
              type="text"
              placeholder="标题"
              className="input input-bordered w-full"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          {/* 封面图片上传 */}
          <div>
            <label className="label">
              <span className="label-text">封面图片 (可选)</span>
            </label>

            <div className="flex flex-col space-y-2">
              {/* 图片预览区域 */}
              {(coverImage || coverImageFile) && (
                <div className="relative w-full max-w-md">
                  <img
                    src={coverImageFile ? URL.createObjectURL(coverImageFile) : coverImage}
                    alt="封面预览"
                    className="w-full h-48 object-cover rounded-lg border border-base-300"
                  />
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <span className="loading loading-spinner loading-lg text-white"></span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImage(undefined);
                      setCoverImageFile(undefined);
                    }}
                    className="absolute top-2 right-2 btn btn-sm btn-circle btn-error"
                    disabled={isUploadingImage}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* 上传按钮 */}
              {!coverImage && !coverImageFile && (
                <div className="flex flex-col space-y-3">
                  {/* 移动端大块上传区域 */}
                  <div className="block">
                    <ImgUploader setImg={handleImageUpload}>
                      <div className="w-full h-32 border-2 border-dashed border-base-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 text-base-content/50 mb-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <span className="text-sm text-base-content/70">点击上传封面图片</span>
                      </div>
                    </ImgUploader>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 社区选择器 - 使用可复用组件 */}
          {enableCommunitySelection && (
            <div>
              <label className="label">
                <span className="label-text">发布到社区</span>
                {!selectedCommunityId && (
                  <span className="label-text-alt text-error">请选择一个社区</span>
                )}
              </label>

              <CommunitySelector
                communityList={communityList}
                selectedCommunityId={selectedCommunityId}
                onSelect={setSelectedCommunityId}
                required={true}
              />
            </div>
          )}

          <MarkdownEditor onChange={(value) => { setContent(value); }} className="flex-1" defaultContent={content}></MarkdownEditor>
          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-info"
              disabled={isPublishing}
            >
              {isPublishing
                ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      发布中...
                    </>
                  )
                : (
                    "发布帖子"
                  )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

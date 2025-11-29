import { useState } from "react";
import { ImgUploaderWithCopper } from "./imgUploaderWithCropper";
import { ResourceSelectorModal } from "./ResourceSelectorModal";

interface ImgUploaderWithSelectorProps {
  setDownloadUrl?: (newUrl: string) => void | undefined;
  setCopperedDownloadUrl?: (newUrl: string) => void | undefined;
  children: React.ReactNode;
  fileName?: string;
  mutate?: (data: any) => void;
  showResourceSelector?: boolean; // 是否显示资源选择器
  selectorTitle?: string; // 资源选择器标题
}

/**
 * 增强版图片上传组件，支持上传图片和选择已有资源
 * @param {object} props 组件属性
 * @param {(url: string) => void} [props.setDownloadUrl] 上传原图完成后的回调
 * @param {(url: string) => void} [props.setCopperedDownloadUrl] 上传裁剪图完成后的回调
 * @param {React.ReactNode} props.children 触发上传的子元素
 * @param {string} props.fileName 文件名
 * @param {(data: any) => void} [props.mutate] 可选的更新函数
 * @param {boolean} [props.showResourceSelector] 是否显示资源选择器，默认为true
 * @param {string} [props.selectorTitle] 资源选择器标题
 * @constructor
 */
export function ImgUploaderWithSelector({
  setDownloadUrl,
  setCopperedDownloadUrl,
  children,
  fileName,
  mutate,
  showResourceSelector = true,
  selectorTitle = "选择素材",
}: ImgUploaderWithSelectorProps) {
  const [showResourceModal, setShowResourceModal] = useState(false);

  const handleResourceSelect = (resourceUrl: string) => {
    // 当从资源库选择图片时，直接使用该URL
    setCopperedDownloadUrl?.(resourceUrl);
    setDownloadUrl?.(resourceUrl);
    mutate?.({ url: resourceUrl });
  };

  return (
    <div className="relative group">
      {/* 原有的上传组件 */}
      <ImgUploaderWithCopper
        setDownloadUrl={setDownloadUrl}
        setCopperedDownloadUrl={setCopperedDownloadUrl}
        fileName={fileName}
        mutate={mutate}
      >
        {children}
      </ImgUploaderWithCopper>

      {/* 资源选择按钮 - 悬浮在上传组件上方 */}
      {showResourceSelector && (
        <div
          className="absolute bottom-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          onClick={(e) => {
            // 阻止事件冒泡到父级的上传点击事件
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowResourceModal(true);
            }}
            onMouseDown={(e) => {
              // 额外阻止mousedown事件
              e.preventDefault();
              e.stopPropagation();
            }}
            className="btn btn-sm btn-primary shadow-lg"
            title="从素材库选择"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="hidden sm:inline ml-1">素材库</span>
          </button>
        </div>
      )}

      {/* 资源选择器模态框 */}
      <ResourceSelectorModal
        isOpen={showResourceModal}
        onClose={() => setShowResourceModal(false)}
        onSelect={handleResourceSelect}
        title={selectorTitle}
        resourceType="5" // 图片类型
      />
    </div>
  );
}

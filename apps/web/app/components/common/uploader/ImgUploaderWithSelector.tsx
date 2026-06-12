import { ImgUploaderWithCopper } from "./imgUploaderWithCropper";

interface ImgUploaderWithSelectorProps {
  setDownloadUrl?: (newUrl: string) => void | undefined;
  setCopperedDownloadUrl?: (newUrl: string) => void | undefined;
  children: React.ReactNode;
  fileName?: string;
  mutate?: (data: any) => void;
}

/**
 * 增强版图片上传组件
 * @param {object} props 组件属性
 * @param {(url: string) => void} [props.setDownloadUrl] 上传原图完成后的回调
 * @param {(url: string) => void} [props.setCopperedDownloadUrl] 上传裁剪图完成后的回调
 * @param {React.ReactNode} props.children 触发上传的子元素
 * @param {string} props.fileName 文件名
 * @param {(data: any) => void} [props.mutate] 可选的更新函数
 * @constructor
 */
export function ImgUploaderWithSelector({
  setDownloadUrl,
  setCopperedDownloadUrl,
  children,
  fileName,
  mutate,
}: ImgUploaderWithSelectorProps) {
  return (
    <div className="relative group">
      <ImgUploaderWithCopper
        setDownloadUrl={setDownloadUrl}
        setCopperedDownloadUrl={setCopperedDownloadUrl}
        fileName={fileName}
        mutate={mutate}
      >
        {children}
      </ImgUploaderWithCopper>
    </div>
  );
}

import { ALLOWED_IMG_TYPES } from "@/utils/allowedImgFiles";
import { UploadUtils } from "@/utils/UploadUtils";
import React, { useRef } from "react";

interface ImgUploaderProps {
  // 一个函数, 如果useState的话就填set函数. 会在返回后将downLoadUrl作为参数传入
  setDownloadUrl: (downLoadUrl: string) => void;
  children: React.ReactNode;
}

// 图片上传组件
export function ImgUploader({ setDownloadUrl, children }: ImgUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadUtils = new UploadUtils(2);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 判断文件类型
    if (!file || !ALLOWED_IMG_TYPES.includes(file?.type)) {
      return;
    }
    try {
      const downloadUrl = await uploadUtils.upload(file);
      setDownloadUrl(downloadUrl);
    }
    catch (error) {
      console.error("上传失败:", error);
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <div onClick={() => fileInputRef.current?.click()}>
        {children}
      </div>
    </div>
  );
}

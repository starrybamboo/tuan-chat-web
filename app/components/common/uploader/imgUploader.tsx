/**
 * 改成了返回图片文件，而不是上传后再返回服务器的下载url
 */

import { ALLOWED_IMG_TYPES } from "@/utils/allowedImgFiles";
import React, { useRef } from "react";

interface ImgUploaderProps {
  // 一个函数, 如果useState的话就填set函数. 会在返回后将Img File作为参数传入
  setImg: (downLoadUrl: File) => void;
  children: React.ReactNode;
}

// 图片上传组件
export function ImgUploader({ setImg, children }: ImgUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 判断文件类型
    if (!file || !ALLOWED_IMG_TYPES.includes(file?.type)) {
      return;
    }
    setImg(file);
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

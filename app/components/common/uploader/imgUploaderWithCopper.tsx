/**
 *这下面和./imgCopper中很多的代码是从https://www.npmjs.com/package/react-image-cropv 中搞过来的
 */

import type { Crop, PixelCrop } from "react-image-crop";
import { PopWindow } from "@/components/common/popWindow";
import { canvasPreview } from "@/components/common/uploader/imgCopper/canvasPreview";

import { useDebounceEffect } from "@/components/common/uploader/imgCopper/useDebounceEffect";
import { UploadUtils } from "@/utils/UploadUtils";

import React, { useRef, useState } from "react";
import { centerCrop, makeAspectCrop, ReactCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

// This is to demonstate how to make and center a % aspect crop
// which is a bit trickier so we use some helper functions.
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

interface ImgUploaderWithCopperProps {
  // 一个函数, 如果useState的话就填set函数. 会在返回后将downLoadUrl作为参数传入
  setDownloadUrl: (newUrl: string) => void;
  setCopperedDownloadUrl: (newUrl: string) => void;
  children: React.ReactNode;
  fileName: string;
  mutate?: (variables: string) => void;
}

export function ImgUploaderWithCopper({ setDownloadUrl, setCopperedDownloadUrl, children, fileName, mutate }: ImgUploaderWithCopperProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadUtils = new UploadUtils(2);
  // 控制弹窗的显示与隐藏
  const [isOpen, setIsOpen] = useState(false);

  const [imgSrc, setImgSrc] = useState("");
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const imgFile = useRef<File>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }

  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width
        && completedCrop?.height
        && imgRef.current
        && previewCanvasRef.current
      ) {
        // We use canvasPreview as it's much faster than imgPreview.
        canvasPreview(
          imgRef.current,
          previewCanvasRef.current,
          completedCrop,
          1,
          0,
        );
      }
    },
    100,
    [completedCrop],
  );

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 判断文件类型
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    setIsOpen(true);
    imgFile.current = file;

    setCrop(undefined); // Makes crop preview update between images.
    const reader = new FileReader();
    reader.addEventListener("load", () =>
      setImgSrc(reader.result?.toString() || ""));
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!imgFile.current) {
      return;
    }

    const originalFile = imgFile.current;
    const fileWithNewName = new File(
      [originalFile],
      fileName,
      {
        type: originalFile.type,
        lastModified: originalFile.lastModified,
      },
    );

    try {
      const downloadUrl = await uploadUtils.upload(fileWithNewName);
      setDownloadUrl(downloadUrl);
      const copperedImgFile = await getCopperedImg();
      const copperedDownloadUrl = await uploadUtils.upload(copperedImgFile);
      setCopperedDownloadUrl(copperedDownloadUrl);
      if (mutate !== undefined) {
        mutate(copperedDownloadUrl);
      }
      setIsOpen(false);
    }
    catch (error) {
      console.error("上传失败:", error);
    }
  }

  async function getCopperedImg() {
    const image = imgRef.current;
    const previewCanvas = previewCanvasRef.current;
    if (!image || !previewCanvas || !completedCrop) {
      throw new Error("Crop canvas does not exist");
    }

    // This will size relative to the uploaded image
    // size. If you want to size according to what they
    // are looking at on screen, remove scaleX + scaleY
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const offscreen = new OffscreenCanvas(
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
    );
    const ctx = offscreen.getContext("2d");
    if (!ctx) {
      throw new Error("No 2d context");
    }

    ctx.drawImage(
      previewCanvas,
      0,
      0,
      previewCanvas.width,
      previewCanvas.height,
      0,
      0,
      offscreen.width,
      offscreen.height,
    );
    // 可以用 { type: "image/jpeg", quality: <0 to 1> } 来压缩
    const blob = await offscreen.convertToBlob({
      type: "image/png",
    });
    return new File([blob], `${fileName}-coppered`, {
      type: "image/png",
      lastModified: Date.now(),
    });
  }

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
      <PopWindow isOpen={isOpen} onClose={() => { setIsOpen(false); }}>
        <div className="flex flex-row items-center overflow-auto">
          {!!imgSrc && (
            <div className="overflow-auto flex">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={c => setCompletedCrop(c)}
                aspect={1}
                // minWidth={400}
                minHeight={10}
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imgSrc}
                  // style={{ transform: `scale(${scale})` }}
                  onLoad={onImageLoad}
                  // className="max-w-[50vw] max-h-[70vh]"
                  // 不能用className设置, 否则会出问题, 见鬼!!!
                  style={{
                    maxWidth: "50vw",
                    maxHeight: "70vh",
                  }}
                />
              </ReactCrop>
            </div>
          )}
          <div className="divider lg:divider-horizontal"></div>
          {!!completedCrop && (
            <div className="flex flex-col gap-3">
              <div className="w-96 h-96">
                <canvas
                  ref={previewCanvasRef}
                  style={{
                    objectFit: "contain",
                  }}
                  className="w-full h-full"
                />
              </div>
              <button className="btn btn-dash" onClick={handleSubmit} type="button">完成</button>
            </div>
          )}
        </div>
      </PopWindow>
    </div>
  );
}

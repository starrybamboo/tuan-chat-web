/**
 *这下面和./imgCopper中很多的代码是从https://www.npmjs.com/package/react-image-crop中搞过来的
 */

import type { Crop, PixelCrop } from "react-image-crop";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";

import { canvasPreview } from "@/components/common/uploader/imgCopper/canvasPreview";
import { useDebounceEffect } from "@/components/common/uploader/imgCopper/useDebounceEffect";

import { UploadUtils } from "@/utils/UploadUtils";
import React, { useRef, useState } from "react";
import { centerCrop, makeAspectCrop, ReactCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

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
  // 如果useState的话就填set函数. 会在返回后将downLoadUrl作为参数传入
  // 如果没填就不会向oss上传图片
  setDownloadUrl?: (newUrl: string) => void | undefined;
  setCopperedDownloadUrl?: (newUrl: string) => void | undefined;
  children: React.ReactNode;
  fileName: string;
  mutate?: (data: any) => void;
}

/**
 * 图片上传组件，带裁剪
 * @param setDownloadUrl 填写的话就会上传裁剪前的图片，并在上传完后调用
 * @param setCopperedDownloadUrl 填写的话就会上传裁剪后的图片，并在上传后调用
 * @param children
 * @param fileName 上传后存在图床里面的文件名，裁剪后的图片会带-copper后缀
 * @param mutate
 * @constructor
 */
export function ImgUploaderWithCopper({ setDownloadUrl, setCopperedDownloadUrl, children, fileName, mutate }: ImgUploaderWithCopperProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadUtils = new UploadUtils();
  // 控制弹窗的显示与隐藏
  const [isOpen, setIsOpen] = useSearchParamsState("imgUploaderWithCopperPop", false);

  const [imgSrc, setImgSrc] = useState("");
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const imgFile = useRef<File>(null);

  const [isSubmiting, setisSubmiting] = useState(false);

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
    setisSubmiting(true);
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
      let downloadUrl = "";
      let copperedDownloadUrl = "";
      if (setDownloadUrl) {
        downloadUrl = await uploadUtils.uploadImg(fileWithNewName);
        setDownloadUrl(downloadUrl);
      }
      if (setCopperedDownloadUrl) {
        const copperedImgFile = await getCopperedImg();
        copperedDownloadUrl = await uploadUtils.uploadImg(copperedImgFile, 70, 768);
        setCopperedDownloadUrl(copperedDownloadUrl);
      }
      if (mutate !== undefined) {
        mutate({ avatarUrl: copperedDownloadUrl, spriteUrl: downloadUrl });
      }
    }
    catch (error) {
      console.error("上传失败:", error);
    }
    finally {
      setisSubmiting(false);
      setIsOpen(false);
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

  async function handleDownload() {
    const copperedImgFile = await getCopperedImg();
    const url = URL.createObjectURL(copperedImgFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}-cropped.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              {
                isSubmiting
                  ? (
                      <button className="btn loading" disabled={true} type="button"></button>
                    )
                  : (
                      <div className="flex flex-row justify-center gap-4">
                        <button className="btn w-max btn-info" onClick={handleSubmit} type="button">完成</button>
                        <button className="btn w-max btn-info" onClick={handleDownload} type="button">下载裁切后的图像</button>
                      </div>
                    )
              }

            </div>
          )}
        </div>
      </PopWindow>
    </div>
  );
}

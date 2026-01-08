/**
 *这下面和./imgCopper中很多的代码是从https://www.npmjs.com/package/react-image-crop中搞过来的
 */

import type { Crop, PixelCrop } from "react-image-crop";

import React, { useEffect, useRef, useState } from "react";
import { ReactCrop } from "react-image-crop";

import { PopWindow } from "@/components/common/popWindow";
import { canvasPreview, getCroppedImageFile, useDebounceEffect } from "@/utils/imgCropper";
import { UploadUtils } from "@/utils/UploadUtils";
import "react-image-crop/dist/ReactCrop.css";

// 原先强制 1:1，现在改成自由裁剪：初始化给一个居中稍大的默认矩形（不锁定比例）
function makeInitialFreeCrop(mediaWidth: number, mediaHeight: number) {
  // 取较小边的 90% 作为初始宽高基准，保持居中；用户之后可随意拖动改变为任意长宽比
  const base = Math.min(mediaWidth, mediaHeight) * 0.9;
  const initWidth = Math.min(base, mediaWidth * 0.9);
  const initHeight = Math.min(base, mediaHeight * 0.9);
  const x = (mediaWidth - initWidth) / mediaWidth * 100;
  const y = (mediaHeight - initHeight) / mediaHeight * 100;
  return {
    unit: "%" as const,
    x,
    y,
    width: (initWidth / mediaWidth) * 100,
    height: (initHeight / mediaHeight) * 100,
  };
}

interface ImgUploaderWithCopperProps {
  setDownloadUrl?: (newUrl: string) => void | undefined;
  setCopperedDownloadUrl?: (newUrl: string) => void | undefined;
  children: React.ReactNode;
  fileName?: string;
  mutate?: (data: any) => void;
}

/**
 * 图片上传组件，带裁剪
 * @param {object} props 组件属性
 * @param {(url: string) => void} [props.setDownloadUrl] 上传原图完成后的回调, 会在返回后将downLoadUrl作为参数传入，如果没填就不会向oss上传图片
 * @param {(url: string) => void} [props.setCopperedDownloadUrl] 上传裁剪图完成后的回调，同上。
 * @param {React.ReactNode} props.children 触发上传的子元素
 * @param {string} props.fileName 没什么用的参数，为了兼容旧代码。在图床使用hash作为文件名。
 * @param {(data: any) => void} [props.mutate] 可选的更新函数
 * @constructor
 */
export function ImgUploaderWithCopper({ setDownloadUrl, setCopperedDownloadUrl, children, fileName, mutate }: ImgUploaderWithCopperProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadUtils = new UploadUtils();
  // 控制弹窗的显示与隐藏
  const [isOpen, setIsOpen] = useState(false);

  const [imgSrc, setImgSrc] = useState("");
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const imgFile = useRef<File>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 给用户的状态提示（加载中 / 生成预览 / 上传中 / 完成 / 错误）
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    const checkMobile = () => {
      requestAnimationFrame(() => {
        setIsMobile(window.innerWidth < 768);
      });
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  function clearPreviewCanvas() {
    const canvas = previewCanvasRef.current;
    if (!canvas)
      return;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 把尺寸归零以避免意外的残留渲染
    canvas.width = 0;
    canvas.height = 0;
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    // 使用 naturalWidth/naturalHeight 确保基于真实图片尺寸计算裁剪区域
    const imgEl = e.currentTarget;
    try {
      const naturalW = imgEl.naturalWidth || imgEl.width;
      const naturalH = imgEl.naturalHeight || imgEl.height;
      setStatusMessage("已加载图片，请调整裁剪框以生成预览...");
      setCrop(makeInitialFreeCrop(naturalW, naturalH));
      // completedCrop 由 onComplete 更新 - 在加载时清空旧的 completedCrop
      setCompletedCrop(undefined);
      clearPreviewCanvas();
    }
    catch (err) {
      console.error("onImageLoad 错误：", err);
      setStatusMessage("图片加载异常");
    }
  }

  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width
        && completedCrop?.height
        && imgRef.current
        && previewCanvasRef.current
      ) {
        setStatusMessage("生成预览中...");
        try {
          // We use canvasPreview as it's much faster than imgPreview.
          await canvasPreview(
            imgRef.current,
            previewCanvasRef.current,
            completedCrop,
            1,
            0,
          );
          setStatusMessage("预览就绪");
        }
        catch (err) {
          console.error("canvasPreview 错误:", err);
          setStatusMessage("生成预览失败");
        }
      }
      else {
        // 没有 completedCrop 时清空画布
        clearPreviewCanvas();
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
    // 保存文件引用
    imgFile.current = file;

    // 清理旧状态，避免旧图片残留
    setImgSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    clearPreviewCanvas();
    setStatusMessage("加载图片中...");

    const reader = new FileReader();
    reader.addEventListener("load", () =>
      setImgSrc(reader.result?.toString() || ""));
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setStatusMessage("上传中...");
    if (!imgFile.current) {
      setStatusMessage("没有图片可上传");
      setIsSubmitting(false);
      return;
    }

    const originalFile = imgFile.current;
    const fileWithNewName = new File(
      [originalFile],
      fileName ?? originalFile.name,
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
        setStatusMessage("上传裁剪后图片中...");
        copperedDownloadUrl = await uploadUtils.uploadImg(copperedImgFile, 2, 70, 768);
        setCopperedDownloadUrl(copperedDownloadUrl);
      }
      if (mutate !== undefined) {
        mutate({ avatarUrl: copperedDownloadUrl, spriteUrl: downloadUrl });
      }
      setStatusMessage("上传完成");
    }
    catch (error) {
      console.error("上传失败:", error);
      setStatusMessage("上传失败，请重试");
    }
    finally {
      setIsSubmitting(false);
      // 关闭弹窗时也清理状态
      setIsOpen(false);
      // 小延迟后清除状态（避免闪烁）
      setTimeout(() => {
        setStatusMessage("");
        setImgSrc("");
        setCrop(undefined);
        setCompletedCrop(undefined);
        clearPreviewCanvas();
      }, 300);
    }
  }

  async function getCopperedImg() {
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas || !completedCrop) {
      throw new Error("Crop canvas does not exist");
    }
    return await getCroppedImageFile(previewCanvas, `${fileName}-coppered`);
  }

  async function handleDownload() {
    try {
      setStatusMessage("准备下载...");
      const copperedImgFile = await getCopperedImg();
      const url = URL.createObjectURL(copperedImgFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}-cropped.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatusMessage("下载已开始");
    }
    catch (err) {
      console.error("下载失败:", err);
      setStatusMessage("下载失败");
    }
    finally {
      setTimeout(() => setStatusMessage(""), 800);
    }
  }

  // 动态计算图片样式，因为听说不能用 classname，那就这样写了
  const getImageStyle = () => {
    return {
      maxWidth: isMobile ? "90vw" : "40vw",
      maxHeight: isMobile ? "50vh" : "60vh",
    };
  };

  // 当弹窗关闭时，重置状态
  function handleClose() {
    setIsOpen(false);
    setImgSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    clearPreviewCanvas();
    setStatusMessage("");
    imgFile.current = null;
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
      <PopWindow isOpen={isOpen} onClose={handleClose}>
        <h2 className="text-2xl mt-4 font-bold">上传图像</h2>
        <div className={isMobile ? "flex flex-col items-center gap-4 max-h-[90vh] p-4" : "flex flex-row items-center justify-center gap-8 overflow-auto p-6"}>
          {!!imgSrc && (
            <div className="flex shrink-0">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={c => setCompletedCrop(c)}
                // 不再传 aspect，实现自由比例裁剪
                minHeight={10}
                keepSelection={true}
                disabled={false}
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={imgSrc}
                  // style={{ transform: `scale(${scale})` }}
                  onLoad={onImageLoad}
                  // className="max-w-[50vw] max-h-[70vh]"
                  // 不能用className设置, 否则会出问题, 见鬼!!!
                  style={getImageStyle()}
                />
              </ReactCrop>
            </div>
          )}
          <div className={isMobile ? "divider" : "divider lg:divider-horizontal"}></div>
          {!!completedCrop && (
            <div className="flex flex-col gap-3 items-center">
              <div className={isMobile ? "w-64 h-64 shrink-0" : "w-80 h-80 shrink-0"}>
                <canvas
                  ref={previewCanvasRef}
                  style={{
                    objectFit: "contain",
                    width: "100%",
                    height: "100%",
                  }}
                  className="border border-gray-200 rounded"
                />
              </div>
              {/* 状态提示 */}
              {statusMessage && (
                <div className="text-lg text-base-500">{statusMessage}</div>
              )}
              {
                isSubmitting
                  ? (
                      <button className={isMobile ? "btn loading btn-sm" : "btn loading"} disabled={true} type="button"></button>
                    )
                  : (
                      <div className={isMobile ? "flex flex-col gap-2 w-full" : "flex flex-row justify-center gap-4"}>
                        <button
                          className={isMobile ? "btn btn-info btn-md w-full text-md" : "btn w-max btn-info"}
                          onClick={handleSubmit}
                          type="button"
                        >
                          完成
                        </button>
                        <button
                          className={isMobile ? "btn btn-outline btn-info btn-md w-full text-md" : "btn w-max btn-info"}
                          onClick={handleDownload}
                          type="button"
                        >
                          下载裁切后的图像
                        </button>
                      </div>
                    )
              }
            </div>
          )}
          {/* 如果还没有完成的裁切，也展示状态（避免用户看不到任何反馈，之前遇到过这个问题，但是没复现，打个补丁兜底吧） */}
          {!completedCrop && imgSrc && (
            <div className="flex flex-col items-center gap-2">
              <div className="w-64 h-64 flex items-center justify-center text-sm text-gray-400 border border-dashed rounded">
                {statusMessage || "请调整裁剪框以生成预览"}
              </div>
            </div>
          )}
        </div>
      </PopWindow>
    </div>
  );
}

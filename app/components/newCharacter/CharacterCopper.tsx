// 导入必要的类型和组件
import type { Crop, PixelCrop } from "react-image-crop";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";

import { canvasPreview } from "@/components/common/uploader/imgCopper/canvasPreview";
import { useDebounceEffect } from "@/components/common/uploader/imgCopper/useDebounceEffect";

import { UploadUtils } from "@/utils/UploadUtils";
import React, { useRef, useState } from "react";
import { centerCrop, makeAspectCrop, ReactCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

/**
 * 创建并居中裁剪区域的辅助函数
 * @param mediaWidth - 媒体宽度
 * @param mediaHeight - 媒体高度
 * @param aspect - 宽高比
 * @returns 居中的裁剪区域配置
 */
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

/**
 * 图片上传器组件的属性接口
 */
interface ImgUploaderWithCopperProps {
  // 设置原始图片下载链接的回调函数
  setDownloadUrl?: (newUrl: string) => void | undefined;
  // 设置裁剪后图片下载链接的回调函数
  setCopperedDownloadUrl?: (newUrl: string) => void | undefined;
  // 子组件，用作触发上传的UI元素
  children: React.ReactNode;
  // 上传文件的文件名
  fileName: string;
  // 数据更新回调函数
  mutate?: (data: any) => void;
}

/**
 * 带裁剪功能的图片上传组件
 * 支持图片上传、预览、裁剪和保存功能
 */
export function CharacterCopper({ setDownloadUrl, setCopperedDownloadUrl, children, fileName, mutate }: ImgUploaderWithCopperProps) {
  // 文件输入框引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 上传工具实例
  const uploadUtils = new UploadUtils(2);
  // 控制弹窗的显示状态
  const [isOpen, setIsOpen] = useSearchParamsState<boolean>(`characterCopperPop`, false);

  // 图片相关状态
  const [imgSrc, setImgSrc] = useState("");
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>(); // 存储图片裁剪比例
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  // 存储当前选择的图片文件
  const imgFile = useRef<File>(null);

  // 提交状态
  const [isSubmiting, setisSubmiting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  // 移除未使用的状态
  // const [firstStepImage, setFirstStepImage] = useState<File | null>(null);

  /**
   * 图片加载完成后的处理函数
   * 设置初始裁剪区域为居中1:1比例
   */
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const aspect = currentStep === 1 ? 2 / 3 : 1;
    const newCrop = centerAspectCrop(width, height, aspect);
    setCrop(newCrop);
    // 在图片加载完成时设置completedCrop
    const cropWidth = (width * newCrop.width) / 100;
    const cropHeight = (height * newCrop.height) / 100;
    setCompletedCrop({
      unit: "px",
      x: (width - cropWidth) / 2,
      y: (height - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
    });
  }

  // 使用防抖效果更新预览画布
  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width
        && completedCrop?.height
        && imgRef.current
        && previewCanvasRef.current
      ) {
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

  /**
   * 处理文件选择变化
   * 验证文件类型并预览图片
   */
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

  /**
   * 处理提交操作
   * 上传原始图片和裁剪后的图片
   */
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

      if (currentStep === 1) {
        // 第一步：只保存裁剪后的图片用于第二步使用
        const firstStepCroppedImage = await getCopperedImg();
        // 移除未使用的状态设置
        // setFirstStepImage(firstStepCroppedImage);
        // 将裁剪后的图片设置为第二步的原始图片
        const reader = new FileReader();
        reader.addEventListener("load", () => setImgSrc(reader.result?.toString() || ""));
        reader.readAsDataURL(firstStepCroppedImage);
        // 更新当前图片文件引用
        imgFile.current = firstStepCroppedImage;
        setCurrentStep(2);
      }
      else if (currentStep === 2) {
        // 第二步：上传原始图片和裁剪后的头像
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
        // 延迟关闭弹窗和重置状态，避免抖动
        setTimeout(() => {
          setIsOpen(false);
          setCurrentStep(1);
          setImgSrc("");
          setCrop(undefined);
          setCompletedCrop(undefined);
          if (previewCanvasRef.current) {
            const ctx = previewCanvasRef.current.getContext("2d");
            ctx?.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
          }
          if (imgRef.current) {
            imgRef.current.src = "";
          }
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          imgFile.current = null;
        }, 100);

      }
    }
    catch (error) {
      console.error("上传失败:", error);
    }
    finally {
      setisSubmiting(false);
      // 不要关闭弹窗，让用户继续进行第二步
      // setIsOpen(false);
    }
  }

  /**
   * 获取裁剪后的图片
   * 将画布内容转换为文件对象
   */
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
    return new File([blob], `${fileName}-coptered`, {
      type: "image/png",
      lastModified: Date.now(),
    });
  }

  /**
   * 处理裁剪图片下载
   * 创建临时下载链接并触发下载
   */
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
      {/* 隐藏的文件输入框 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      {/* 触发文件选择的容器 */}
      <div onClick={() => fileInputRef.current?.click()}>
        {children}
      </div>
      {/* 裁剪弹窗 */}
      <PopWindow
        isOpen={isOpen}
        onClose={() => {
          setCurrentStep(1);
          setImgSrc("");
          setCrop(undefined);
          setCompletedCrop(undefined);
          setisSubmiting(false);
          if (previewCanvasRef.current) {
            const ctx = previewCanvasRef.current.getContext("2d");
            ctx?.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
          }
          if (imgRef.current) {
            imgRef.current.src = "";
          }
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          setIsOpen(false);
        }}
      >
        <div className="flex flex-col md:flex-row gap-8 justify-center">
          {/* 原始图片裁剪区域 */}
          {!!imgSrc && (
            <div className="w-full md:w-1/2 rounded-lg flex items-center justify-center">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={c => setCompletedCrop(c)}
                aspect={currentStep === 2 ? 1 : undefined}// 第一步不限制比例，第二步固定1:1
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
                    maxHeight: "70vh",
                  }}
                />
              </ReactCrop>
            </div>
          )}
          {/* 裁剪预览和操作按钮 */}
          {!!completedCrop && (
            <div className="w-full md:w-1/2 p-3 gap-4 flex flex-col items-center justify-center">
              {
                currentStep !== 1
                  ? (
                      <canvas
                        ref={previewCanvasRef}
                        style={{ objectFit: "contain" }}
                        className=" w-full h-[90%]"
                      />
                    )
                  : (
                      <>
                        <h2 className="text-xl font-bold">webgal渲染结果预览</h2>
                        <div className="relative w-full aspect-video ">
                          {/* 裁剪后的图像 - 左侧显示 */}
                          <canvas
                            ref={previewCanvasRef}
                            className="absolute left-0 h-full object-contain"
                            style={{ objectPosition: "left center" }}
                          />
                          {/* 底部1/3的黑色半透明遮罩 */}
                          <div className="absolute bottom-0 w-full h-[30%] bg-black/50">
                            <div className="absolute top-0 left-[6%] text-white">
                              <p className="text-white leading-snug">
                                <span className="block text-xs font-medium">角色名</span>
                                <span className="block text-xs mt-1">对话内容</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </>

                    )

              }

              {
                isSubmiting
                  ? (
                      <button className="btn loading" disabled={true} type="button"></button>
                    )
                  : (
                      <div className="flex flex-row justify-center gap-4 mt-2">
                        <button className="btn w-max btn-info" onClick={handleSubmit} type="button">完成</button>
                        <button className="btn w-max btn-info" onClick={handleDownload} type="button">
                          下载裁切后的图像
                        </button>
                      </div>
                    )
              }

            </div>
          )}
        </div>
        <ul className="steps mt-2">
          <li className={`step ${currentStep >= 1 ? "step-primary" : ""}`}>上传立绘</li>
          <li className={`step ${currentStep >= 2 ? "step-primary" : ""}`}>上传头像</li>
        </ul>

      </PopWindow>
    </div>
  );
}

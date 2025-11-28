// 导入必要的类型和组件
import type { CropMode } from "@/utils/imgCropper/useCropPreview";
import type { Transform } from "../sprite/TransformControl";

import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import { isMobileScreen } from "@/utils/getScreenSize";
import { useCropPreview } from "@/utils/imgCropper";
import { UploadUtils } from "@/utils/UploadUtils";
import React, { useCallback, useRef, useState } from "react";
import { ReactCrop } from "react-image-crop";
import { AvatarPreview } from "../Preview/AvatarPreview";
import { RenderPreview } from "../Preview/RenderPreview";
import { TransformControl } from "../sprite/TransformControl";
import "react-image-crop/dist/ReactCrop.css";

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
  // 上传场景：1.聊天室,2.表情包，3.角色差分 4.模组图片
  scene: 1 | 2 | 3 | 4;
  // 数据更新回调函数
  mutate?: (data: any) => void;
  // 外层div的className
  wrapperClassName?: string;
  // 内层div的className
  triggerClassName?: string;
}

/**
 * 带裁剪功能的图片上传组件
 * 支持图片上传、预览、裁剪和保存功能
 */
export function CharacterCopper({ setDownloadUrl, setCopperedDownloadUrl, children, fileName, scene, mutate, triggerClassName, wrapperClassName }: ImgUploaderWithCopperProps) {
  // 文件输入框引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 上传工具实例
  const uploadUtils = new UploadUtils();
  // 控制弹窗的显示状态
  const [isOpen, setIsOpen] = useSearchParamsState<boolean>(`characterCopperPop`, false);

  // 图片相关状态
  const [imgSrc, setImgSrc] = useState("");

  // 存储当前选择的图片文件
  const imgFile = useRef<File>(null);

  // 提交状态
  const [isSubmiting, setisSubmiting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Transform控制状态
  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    positionX: 0,
    positionY: 0,
    alpha: 1,
    rotation: 0,
  });

  // 获取当前裁剪模式（第一步为sprite全图裁剪，第二步为avatar头像裁剪）
  const getCropMode = useCallback((): CropMode => {
    return currentStep === 1 ? "sprite" : "avatar";
  }, [currentStep]);

  // 使用 useCropPreview hook 管理裁剪状态
  const {
    imgRef,
    previewCanvasRef,
    crop,
    setCrop,
    completedCrop,
    previewDataUrl: currentAvatarUrl,
    onImageLoad,
    onCropChange,
    onCropComplete,
    reset: resetCropState,
    getCroppedFile,
  } = useCropPreview({
    mode: getCropMode,
    debounceMs: 100,
  });

  /**
   * 重置所有状态到初始值
   */
  function resetAllStates() {
    setCurrentStep(1);
    setImgSrc("");
    setisSubmiting(false);
    // 重置Transform状态
    setTransform({ scale: 1, positionX: 0, positionY: 0, alpha: 1, rotation: 0 });
    // 重置裁剪状态
    resetCropState();
    // 清除图片引用
    if (imgRef.current) {
      imgRef.current.src = "";
    }
    // 清除文件输入框
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // 清除文件引用
    imgFile.current = null;
  }

  // 使用防抖 Hook 更新预览画布（已集成在 useCropPreview 中）

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
        const firstStepCroppedImage = await getCroppedFile(`${fileName}-cropped.png`);
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
          downloadUrl = await uploadUtils.uploadImg(fileWithNewName, scene);
          setDownloadUrl(downloadUrl);
        }
        if (setCopperedDownloadUrl) {
          const copperedImgFile = await getCroppedFile(`${fileName}-cropped.png`);
          copperedDownloadUrl = await uploadUtils.uploadImg(copperedImgFile, scene, 60, 512);
          setCopperedDownloadUrl(copperedDownloadUrl);
        }
        if (mutate !== undefined) {
          console.warn("CharacterCopper: 传递Transform数据", transform);
          mutate({ avatarUrl: copperedDownloadUrl, spriteUrl: downloadUrl, transform });
        }
        // 延迟关闭弹窗和重置状态，避免抖动
        setTimeout(() => {
          resetAllStates();
          setIsOpen(false);
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
   * 处理裁剪图片下载
   * 创建临时下载链接并触发下载
   */
  async function handleDownload() {
    const copperedImgFile = await getCroppedFile(`${fileName}-cropped.png`);
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
    <div className={wrapperClassName || ""}>
      {/* 隐藏的文件输入框 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      {/* 触发文件选择的容器 */}
      <div className={triggerClassName || ""} onClick={() => fileInputRef.current?.click()}>
        {children}
      </div>
      {/* 裁剪弹窗 */}
      <PopWindow
        isOpen={isOpen}
        onClose={() => {
          resetAllStates();
          setIsOpen(false);
        }}
        fullScreen={isMobileScreen()}
      >
        <div className="flex items-center gap-8">
          <div className="w-full flex items-center">
            <h1 className="text-xl md:text-2xl font-bold w-64">
              {currentStep === 1 ? "1. 上传立绘" : "2. 上传头像"}
              ：
            </h1>
            <ul className="w-full steps">
              <li className={`step ${currentStep >= 1 ? "step-primary" : ""}`}></li>
              <li className={`step ${currentStep >= 2 ? "step-primary" : ""}`}></li>
            </ul>
          </div>
          {/* 桌面端按钮组 */}
          {!!completedCrop && (
            <div className="flex-shrink-0 hidden md:block">
              {isSubmiting
                ? (
                    <button className="btn btn-md loading" disabled={true} type="button"></button>
                  )
                : (
                    <div className="flex gap-2">
                      <button className="btn btn-md btn-info" onClick={handleSubmit} type="button">
                        {currentStep === 1 ? "下一步" : "创建完成"}
                      </button>
                      <button className="btn btn-md btn-outline" onClick={handleDownload} type="button">
                        下载图像
                      </button>
                    </div>
                  )}
            </div>
          )}
        </div>
        <div className="divider my-0"></div>
        <div className="flex flex-col md:flex-row gap-8 justify-center">
          {/* 原始图片裁剪区域 */}
          <div className="w-full md:w-1/2 p-2 gap-4 flex flex-col items-center">
            {!!imgSrc && (
              <>
                <h2 className="text-xl font-bold">裁剪预览</h2>
                <div className="w-full rounded-lg flex items-center justify-center">
                  <ReactCrop
                    crop={crop}
                    onChange={onCropChange}
                    onComplete={onCropComplete}
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
              </>
            )}
          </div>
          {/* 裁剪预览和操作按钮 */}
          {!!completedCrop && (
            <div className="w-full md:w-2/3 p-2 gap-4 flex flex-col items-center">
              {
                currentStep !== 1
                  ? (
                      <AvatarPreview
                        previewCanvasRef={previewCanvasRef}
                        currentAvatarUrl={currentAvatarUrl}
                        characterName="角色名"
                      />
                    )
                  : (
                      <>
                        <h2 className="text-xl font-bold">渲染预览</h2>
                        <div className="w-full h-full bg-info/30 rounded-lg p-4 flex flex-col gap-4">
                          <RenderPreview
                            previewCanvasRef={previewCanvasRef}
                            transform={transform}
                            characterName="角色名"
                            dialogContent="对话内容"
                          />
                          <TransformControl
                            transform={transform}
                            setTransform={setTransform}
                            previewCanvasRef={previewCanvasRef}
                          />
                        </div>
                      </>
                    )

              }

            </div>
          )}
        </div>

        {/* 移动端按钮组 - 底部固定 */}
        {!!completedCrop && (
          <div className="mt-6 pt-4 border-t border-base-300 md:hidden">
            {isSubmiting
              ? (
                  <button className="btn btn-lg loading w-full" disabled={true} type="button"></button>
                )
              : (
                  <div className="flex flex-col gap-2 w-full">
                    <button className="btn btn-lg btn-info w-full" onClick={handleSubmit} type="button">
                      {currentStep === 1 ? "下一步" : "创建完成"}
                    </button>
                    <button className="btn btn-lg btn-outline w-full" onClick={handleDownload} type="button">
                      下载图像
                    </button>
                  </div>
                )}
          </div>
        )}
      </PopWindow>
    </div>
  );
}

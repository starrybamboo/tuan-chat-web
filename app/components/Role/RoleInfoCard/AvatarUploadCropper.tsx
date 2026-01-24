import type { Transform } from "../sprite/TransformControl";
// 导入必要的类型和组件
import type { CropMode } from "@/utils/imgCropper/useCropPreview";

import React, { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ReactCrop } from "react-image-crop";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { PopWindow } from "@/components/common/popWindow";
import { isMobileScreen } from "@/utils/getScreenSize";
import { canvasPreview, createCenteredSquareCrop, createFullImageCrop, getCroppedImageFile, useCropPreview } from "@/utils/imgCropper";
import { UploadUtils } from "@/utils/UploadUtils";
import { AvatarPreview } from "../Preview/AvatarPreview";
import { RenderPreview } from "../Preview/RenderPreview";
import { TransformControl } from "../sprite/TransformControl";
import "react-image-crop/dist/ReactCrop.css";

function createDefaultTransform(): Transform {
  return {
    scale: 1,
    positionX: 0,
    positionY: 0,
    alpha: 1,
    rotation: 0,
  };
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
  // 上传场景：1.聊天室,2.表情包，3.角色差分 4.模组图片
  scene: 1 | 2 | 3 | 4;
  // 数据更新回调函数
  mutate?: (data: any) => void;
  // 外层div的className
  wrapperClassName?: string;
  // 内层div的className
  triggerClassName?: string;
  // 外部传入的文件（用于拖拽上传）
  externalFiles?: File[] | null;
  // 外部文件批次标识（用于防止重复处理）
  externalFilesBatchId?: number;
  // 外部文件处理完成回调（用于清理）
  onExternalFilesHandled?: () => void;
}

/**
 * 带裁剪功能的图片上传组件
 * 支持图片上传、预览、裁剪和保存功能
 */
export function CharacterCopper({
  setDownloadUrl,
  setCopperedDownloadUrl,
  children,
  fileName,
  scene,
  mutate,
  triggerClassName,
  wrapperClassName,
  externalFiles,
  externalFilesBatchId,
  onExternalFilesHandled,
}: ImgUploaderWithCopperProps) {
  // 文件输入框引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 上传工具实例
  const uploadUtilsRef = useRef(new UploadUtils());
  const uploadUtils = uploadUtilsRef.current;
  // 控制弹窗的显示状态
  const [isOpen, setIsOpen] = useSearchParamsState<boolean>(`characterCopperPop`, false);

  // 图片相关状态
  const [imgSrc, setImgSrc] = useState("");

  // 存储当前选择的图片文件
  const imgFile = useRef<File>(null);

  // 存储用户最初选择的原始图片文件（未裁剪）
  const originalFileRef = useRef<File | null>(null);

  // originUrl：用户选择的原图上传得到的 URL（压缩参数使用 UploadUtils 默认值）
  const [originUrl, setOriginUrl] = useState("");
  const originUrlPromiseRef = useRef<Promise<string> | null>(null);

  // 提交状态
  const [isSubmiting, setisSubmiting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Transform控制状态
  const [transform, setTransform] = useState<Transform>(createDefaultTransform);

  // 获取当前裁剪模式（第一步为sprite全图裁剪，第二步为avatar头像裁剪）
  const getCropMode = useCallback((): CropMode => {
    return currentStep === 1 ? "sprite" : "avatar";
  }, [currentStep]);

  // 添加渲染版本号，用于通知子组件 canvas 内容已更新
  const [previewRenderKey, setPreviewRenderKey] = useState(0);

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

  // 监听裁剪完成，延迟更新渲染key以确保canvas已经绘制完成
  React.useEffect(() => {
    if (completedCrop && imgRef.current && previewCanvasRef.current && currentStep === 2) {
      const timeoutId = setTimeout(() => {
        setPreviewRenderKey(prev => prev + 1);
      }, 150); // 延迟确保防抖后的canvas绘制已完成

      return () => clearTimeout(timeoutId);
    }
  }, [completedCrop, currentStep, imgRef, previewCanvasRef]);

  /**
   * 重置所有状态到初始值
   */
  function resetAllStates() {
    setCurrentStep(1);
    setImgSrc("");
    setisSubmiting(false);
    setPreviewRenderKey(0);
    // 重置Transform状态
    setTransform(createDefaultTransform());
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

    // 清除原图与 originUrl
    originalFileRef.current = null;
    setOriginUrl("");
    originUrlPromiseRef.current = null;
  }

  // 使用防抖 Hook 更新预览画布（已集成在 useCropPreview 中）

  /**
   * 处理文件选择变化
   * 验证文件类型并预览图片
   */
  const loadImageFromFile = useCallback((file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("图片加载失败"));
      };
      img.src = url;
    });
  }, []);

  const handleSingleFile = useCallback(async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    setIsOpen(true);
    imgFile.current = file;
    originalFileRef.current = file;

    // 选择文件后立即上传 originUrl（不裁剪），用于后续在裁剪器切换回原图
    setOriginUrl("");
    originUrlPromiseRef.current = (async () => {
      try {
        const url = await uploadUtils.uploadImg(file, scene);
        setOriginUrl(url);
        return url;
      }
      catch (error) {
        console.error("originUrl 上传失败:", error);
        return "";
      }
    })();

    setCrop(undefined); // Makes crop preview update between images.
    const reader = new FileReader();
    reader.addEventListener("load", () =>
      setImgSrc(reader.result?.toString() || ""));
    reader.readAsDataURL(file);
  }, [scene, setIsOpen, setCrop, uploadUtils]);

  const uploadFileWithDefaults = useCallback(async (file: File, index: number, total: number, baseName: string, toastId: string) => {
    if (!file.type.startsWith("image/")) {
      return;
    }

    toast.loading(`正在上传头像 (${index + 1}/${total})...`, { id: toastId });

    const img = await loadImageFromFile(file);
    const fileBaseName = total > 1 ? `${baseName}-${index + 1}` : baseName;
    const { pixelCrop: spritePixelCrop } = createFullImageCrop(img.naturalWidth, img.naturalHeight);
    const spriteCanvas = document.createElement("canvas");
    await canvasPreview(img, spriteCanvas, spritePixelCrop, 1, 0, { previewMode: false });
    const spriteFile = await getCroppedImageFile(spriteCanvas, `${fileBaseName}.png`);

    const { pixelCrop: avatarPixelCrop } = createCenteredSquareCrop(img.naturalWidth, img.naturalHeight);
    const avatarCanvas = document.createElement("canvas");
    await canvasPreview(img, avatarCanvas, avatarPixelCrop, 1, 0, { previewMode: false });
    const avatarFile = await getCroppedImageFile(avatarCanvas, `${fileBaseName}-cropped.png`);

    let originUrl = "";
    try {
      originUrl = await uploadUtils.uploadImg(file, scene);
    }
    catch (error) {
      console.error("originUrl 上传失败:", error);
    }

    const [spriteUrl, avatarUrl] = await Promise.all([
      uploadUtils.uploadImg(spriteFile, scene),
      uploadUtils.uploadImg(avatarFile, scene, 60, 512),
    ]);

    mutate?.({
      avatarUrl,
      spriteUrl,
      originUrl: originUrl || undefined,
      transform: createDefaultTransform(),
    });
  }, [loadImageFromFile, mutate, scene, uploadUtils]);

  const handleFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      return;
    }
    if (imageFiles.length === 1) {
      await handleSingleFile(imageFiles[0]);
      return;
    }

    const baseName = fileName || `avatar-upload-${Date.now()}`;
    const toastId = `avatar-batch-upload-${Date.now()}`;
    setisSubmiting(true);
    try {
      let hasError = false;
      for (let i = 0; i < imageFiles.length; i += 1) {
        try {
          await uploadFileWithDefaults(imageFiles[i], i, imageFiles.length, baseName, toastId);
        }
        catch (error) {
          hasError = true;
          console.error("批量上传失败:", error);
        }
      }
      if (hasError) {
        toast.error("部分头像上传失败，请重试", { id: toastId });
      }
      else {
        toast.success("头像上传完成", { id: toastId });
      }
    }
    catch (error) {
      console.error("批量上传失败:", error);
      toast.error("头像上传失败，请重试", { id: toastId });
    }
    finally {
      setisSubmiting(false);
    }
  }, [fileName, handleSingleFile, uploadFileWithDefaults]);

  const externalFilesHandledRef = useRef<number | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      return;
    }
    void handleFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  React.useEffect(() => {
    if (!externalFiles || externalFiles.length === 0) {
      return;
    }
    if (!externalFilesBatchId) {
      return;
    }
    if (externalFilesHandledRef.current === externalFilesBatchId) {
      return;
    }
    externalFilesHandledRef.current = externalFilesBatchId;
    void handleFiles(externalFiles).finally(() => {
      onExternalFilesHandled?.();
    });
  }, [externalFiles, externalFilesBatchId, handleFiles, onExternalFilesHandled]);

  /**
   * 处理提交操作
   * 上传原始图片和裁剪后的图片
   */
  async function handleSubmit() {
    setisSubmiting(true);
    if (!imgFile.current) {
      return;
    }

    const toastId = currentStep === 2 ? `avatar-upload-${Date.now()}` : null;
    if (toastId) {
      toast.loading("正在上传头像...", { id: toastId });
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

    const shouldUploadSprite = Boolean(setDownloadUrl || mutate);
    const shouldUploadAvatar = Boolean(setCopperedDownloadUrl || mutate);

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
        if (shouldUploadSprite) {
          downloadUrl = await uploadUtils.uploadImg(fileWithNewName, scene);
          setDownloadUrl?.(downloadUrl);
        }
        if (shouldUploadAvatar) {
          const copperedImgFile = await getCroppedFile(`${fileName}-cropped.png`);
          copperedDownloadUrl = await uploadUtils.uploadImg(copperedImgFile, scene, 60, 512);
          setCopperedDownloadUrl?.(copperedDownloadUrl);
        }

        // 确保 originUrl 已经上传完成（若用户很快提交，这里会等待）
        let resolvedOriginUrl = originUrl;
        if (!resolvedOriginUrl && originUrlPromiseRef.current) {
          resolvedOriginUrl = await originUrlPromiseRef.current;
        }
        if (!resolvedOriginUrl && originalFileRef.current) {
          try {
            resolvedOriginUrl = await uploadUtils.uploadImg(originalFileRef.current, scene);
            setOriginUrl(resolvedOriginUrl);
          }
          catch (error) {
            console.error("originUrl 二次上传失败:", error);
          }
        }

        if (mutate !== undefined) {
          mutate({
            avatarUrl: copperedDownloadUrl,
            spriteUrl: downloadUrl,
            originUrl: resolvedOriginUrl || undefined,
            transform,
          });
        }
        if (toastId) {
          toast.success("头像上传成功", { id: toastId });
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
      if (toastId) {
        toast.error("头像上传失败，请重试", { id: toastId });
      }
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
        multiple
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
        <div className="max-w-4xl mx-auto">
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
              <div className="shrink-0 hidden md:block">
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
                          previewRenderKey={previewRenderKey}
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
        </div>
      </PopWindow>
    </div>
  );
}

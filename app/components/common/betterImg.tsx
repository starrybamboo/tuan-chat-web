import { useEffect, useMemo, useRef, useState } from "react";
import { ResizableImg } from "@/components/common/resizableImg";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import type { ToastWindowOptions } from "@/components/common/toastWindow/toastWindowRenderer";
import { compressImage, MEDIA_COMPRESSION_PROFILES } from "@/utils/imgCompressUtils";
import { imageUrlWithQuality } from "@/utils/mediaUrl";
import { markObservedWebgalAsset } from "@/webGAL/browserAssetCache";

/**
 * 为聊天图片保留稳定的固有尺寸，减少图片加载完成后触发的布局跳动。
 */
export function resolveBetterImgIntrinsicSize(size?: { width?: number; height?: number }) {
  const width = typeof size?.width === "number" && Number.isFinite(size.width) && size.width > 0
    ? size.width
    : undefined;
  const height = typeof size?.height === "number" && Number.isFinite(size.height) && size.height > 0
    ? size.height
    : undefined;
  return { width, height };
}

export function resolveBetterImgPreviewToastOptions(transparent: boolean): ToastWindowOptions {
  return {
    fullScreen: true,
    transparent,
    rootClassName: "z-[11000]",
  };
}

type BetterImgZoomQuality = "medium" | "high" | "original";

export function resolveBetterImgZoomSrc(
  imgSrc: string | undefined,
  fallbackObjectUrl: string | undefined,
  zoomQuality: BetterImgZoomQuality,
) {
  return fallbackObjectUrl ?? (typeof imgSrc === "string" ? imageUrlWithQuality(imgSrc, zoomQuality) : imgSrc);
}

function isFileSource(src: string | File | undefined): src is File {
  return typeof File !== "undefined" && src instanceof File;
}

export function useFileObjectUrl(src: string | File | undefined): string | undefined {
  const objectUrl = useMemo(() => {
    if (!isFileSource(src)) {
      return undefined;
    }
    return URL.createObjectURL(src);
  }, [src]);

  useEffect(() => {
    if (!objectUrl) {
      return;
    }
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  return isFileSource(src) ? objectUrl : src;
}

/**
 * 更好的img组件，点击可以显示大图，大图状态下可以缩放。
 * @param src 图片源，可以是url，也可以是一个File对象
 * @param className
 * @param onClose 可选的回调函数，如果填写了该回调函数，那么图片左上角会出现一个关闭按钮，点击后调用onClose回调函数。
 * @param size 图片的尺寸，用于优化加载体验
 * @param transparent
 * @param zoomQuality 点击预览时使用的图片质量档
 */
function BetterImg({ src, className, onClose, size, transparent = true, zoomQuality = "medium" }: {
  src: string | File | undefined;
  className?: string;
  onClose?: () => void;
  size?: { width?: number; height?: number };
  transparent?: boolean;
  zoomQuality?: BetterImgZoomQuality;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [fallbackObjectUrl, setFallbackObjectUrl] = useState<string | undefined>();
  const imgSrc = useFileObjectUrl(src);
  const displayImgSrc = fallbackObjectUrl ?? imgSrc;
  const zoomImgSrc = resolveBetterImgZoomSrc(typeof imgSrc === "string" ? imgSrc : undefined, fallbackObjectUrl, zoomQuality);
  const intrinsicSize = resolveBetterImgIntrinsicSize(size);

  useEffect(() => {
    setFallbackObjectUrl(undefined);
  }, [src]);

  useEffect(() => {
    if (!fallbackObjectUrl) {
      return;
    }
    return () => {
      URL.revokeObjectURL(fallbackObjectUrl);
    };
  }, [fallbackObjectUrl]);

  const handleLoad = () => {
    if (typeof displayImgSrc !== "string") {
      return;
    }
    markObservedWebgalAsset(displayImgSrc);
  };
  const handleError = () => {
    if (!isFileSource(src) || fallbackObjectUrl) {
      return;
    }
    void compressImage(src, MEDIA_COMPRESSION_PROFILES.image.low)
      .then((previewFile) => {
        setFallbackObjectUrl(URL.createObjectURL(previewFile));
      })
      .catch(() => {});
  };

  const openToastWindow = () => {
    toastWindow(
      onClose => <ResizableImg src={zoomImgSrc} onClose={onClose} />,
      resolveBetterImgPreviewToastOptions(transparent),
    );
  };

  return (
    <div className="relative group inline-block w-fit max-w-full">
      <button
        type="button"
        className="block max-w-full"
        onClick={openToastWindow}
      >
        <img
          ref={imgRef}
          src={displayImgSrc}
          referrerPolicy="no-referrer"
          width={intrinsicSize.width}
          height={intrinsicSize.height}
          className={`block w-auto max-w-full cursor-zoom-in object-contain hover:scale-101 ${className ?? ""}`}
          alt="img"
          onLoad={handleLoad}
          onError={handleError}
        />
      </button>

      {onClose && (
        <button
          type="button"
          className="btn btn-xs btn-circle right-0 top-0 absolute opacity-100 duration-200 origin-top-right"
          onClick={onClose}
        >
          <span className="text-xs">✕</span>
        </button>
      )}
    </div>
  );
}

export default BetterImg;

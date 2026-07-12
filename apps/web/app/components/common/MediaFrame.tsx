import type { DragEvent, KeyboardEvent, ReactNode } from "react";

import { ImageBrokenIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/common/Button";
import { MediaImage } from "@/components/common/mediaImage";
import { Skeleton } from "@/components/common/StatusPrimitives";

export type MediaAspect = "auto" | "square" | "portrait" | "landscape" | "video";
export type MediaFit = "cover" | "contain";

const MEDIA_ASPECT_CLASS: Record<MediaAspect, string> = {
  auto: "",
  square: "aspect-square",
  portrait: "aspect-3/4",
  landscape: "aspect-4/3",
  video: "aspect-video",
};

/** 生成统一媒体比例，业务只需选择语义比例。 */
export function mediaAspectClassName(aspect: MediaAspect) {
  return MEDIA_ASPECT_CLASS[aspect];
}

export type MediaFrameProps = {
  children: ReactNode;
  aspect?: MediaAspect;
  selected?: boolean;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  onPreview?: () => void;
  previewLabel?: string;
  className?: string;
};

/** 统一媒体比例、边框、选中框、加载、失败与预览入口。 */
export function MediaFrame({
  children,
  aspect = "square",
  selected = false,
  loading = false,
  error,
  onRetry,
  onPreview,
  previewLabel = "预览图片",
  className = "",
}: MediaFrameProps) {
  return (
    <figure
      data-selected={selected ? "true" : undefined}
      aria-busy={loading || undefined}
      className={[
        "group relative overflow-hidden rounded-md border bg-base-200",
        selected ? "border-info ring-2 ring-info/25" : "border-base-300",
        mediaAspectClassName(aspect),
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
      {loading
        ? <Skeleton className="absolute inset-0 size-full rounded-none" />
        : null}
      {error
        ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-base-200 p-3 text-center">
              <ImageBrokenIcon className="size-6 text-base-content/45" weight="regular" aria-hidden="true" />
              <span className="text-xs text-base-content/60">{error}</span>
              {onRetry ? <Button size="xs" variant="outline" onClick={onRetry}>重试</Button> : null}
            </div>
          )
        : null}
      {onPreview && !error
        ? (
            <button
              type="button"
              className="absolute inset-0 rounded-md opacity-0 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-info/35 group-hover:opacity-100"
              aria-label={previewLabel}
              title={previewLabel}
              onClick={onPreview}
            />
          )
        : null}
    </figure>
  );
}

export type MediaImageFrameProps = Omit<MediaFrameProps, "children" | "loading" | "error"> & {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  fit?: MediaFit;
  imageClassName?: string;
};

/** 统一图片加载过渡、失败占位、裁切和媒体框状态。 */
export function MediaImageFrame({
  src,
  fallbackSrc,
  alt,
  fit = "cover",
  imageClassName = "",
  ...frameProps
}: MediaImageFrameProps) {
  const [isLoading, setIsLoading] = useState(Boolean(src || fallbackSrc));
  const [hasError, setHasError] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    setIsLoading(Boolean(src || fallbackSrc));
    setHasError(false);
    setRetryVersion(0);
  }, [fallbackSrc, src]);

  return (
    <MediaFrame
      {...frameProps}
      loading={isLoading && !hasError}
      error={hasError ? "图片加载失败" : undefined}
      onRetry={hasError
        ? () => {
            setHasError(false);
            setIsLoading(true);
            setRetryVersion(version => version + 1);
          }
        : undefined}
    >
      {src || fallbackSrc
        ? (
            <MediaImage
              key={retryVersion}
              src={src}
              fallbackSrc={fallbackSrc}
              alt={alt}
              loadTransition
              className={`size-full ${fit === "cover" ? "object-cover" : "object-contain"} ${imageClassName}`}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />
          )
        : (
            <div className="flex size-full items-center justify-center text-base-content/35">
              <ImageBrokenIcon className="size-8" weight="regular" aria-hidden="true" />
            </div>
          )}
    </MediaFrame>
  );
}

export type UploadDropZoneProps = {
  onFiles: (files: File[]) => void;
  label?: string;
  description?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
};

/** 统一上传区域的拖入、放置、键盘、禁用和说明状态。 */
export function UploadDropZone({
  onFiles,
  label = "选择或拖入文件",
  description,
  accept,
  multiple = false,
  disabled = false,
  className = "",
}: UploadDropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const openFilePicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) {
      return;
    }
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (!disabled) {
      onFiles(Array.from(event.dataTransfer.files));
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      data-drag-state={isDragging ? "active" : "idle"}
      className={`tc-drop-target flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 p-4 text-center focus:outline-none focus:ring-2 focus:ring-info/20 ${disabled ? "cursor-not-allowed opacity-45" : ""} ${className}`}
      onClick={openFilePicker}
      onKeyDown={handleKeyDown}
      onDragEnter={handleDragEnter}
      onDragOver={event => event.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
      <UploadSimpleIcon className="size-7 text-info" weight="regular" aria-hidden="true" />
      <span className="text-sm font-medium text-base-content">{label}</span>
      {description ? <span className="text-xs leading-5 text-base-content/60">{description}</span> : null}
    </div>
  );
}

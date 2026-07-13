import type { Coordinates } from "react-advanced-cropper";

import { ArrowCounterClockwiseIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import { memo, useCallback, useEffect, useId, useRef, useState, type WheelEvent as ReactWheelEvent } from "react";
import { Cropper, ImageRestriction, type CropperRef } from "react-advanced-cropper";

import { RangeInput } from "@/components/common/FormField";

import "react-advanced-cropper/dist/style.css";

export type ZoomableCropAreaChange = (coordinates: Coordinates, image: HTMLImageElement) => void;

type ZoomableCropperProps = {
  image: string;
  aspect?: number;
  initialCoordinates?: Coordinates;
  disabled?: boolean;
  className?: string;
  onAreaChange: ZoomableCropAreaChange;
  onAreaChangeEnd?: () => void;
  onImageReady: (image: HTMLImageElement) => void;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function ZoomableCropperComponent({
  image,
  aspect,
  initialCoordinates,
  disabled = false,
  className = "",
  onAreaChange,
  onAreaChangeEnd,
  onImageReady,
}: ZoomableCropperProps) {
  const cropperRef = useRef<CropperRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const baseVisibleRatioRef = useRef(1);
  const zoomRef = useRef(MIN_ZOOM);
  const isReadyRef = useRef(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const zoomLabelId = useId();
  const shouldReduceMotion = useReducedMotion();

  const updateDisplayedZoom = useCallback((nextZoom: number) => {
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
  }, []);

  const resolveImageElement = useCallback(() => {
    return containerRef.current?.querySelector("img") ?? null;
  }, []);

  const resolveVisibleRatio = useCallback((cropper: CropperRef) => {
    const cropperImage = cropper.getImage();
    const visibleArea = cropper.getVisibleArea();
    if (!cropperImage || !visibleArea?.width || !visibleArea.height) {
      return MIN_ZOOM;
    }
    return Math.max(cropperImage.width / visibleArea.width, cropperImage.height / visibleArea.height);
  }, []);

  const initializeCropper = useCallback((cropper: CropperRef) => {
    if (isReadyRef.current) {
      return true;
    }
    const imageElement = resolveImageElement();
    if (!cropper.isLoaded() || !cropper.getState() || !imageElement) {
      return false;
    }
    onImageReady(imageElement);
    baseVisibleRatioRef.current = resolveVisibleRatio(cropper);
    isReadyRef.current = true;
    updateDisplayedZoom(MIN_ZOOM);
    return true;
  }, [onImageReady, resolveImageElement, resolveVisibleRatio, updateDisplayedZoom]);

  const emitAreaChange = useCallback((cropper: CropperRef) => {
    if (initializeCropper(cropper)) {
      const visibleRatio = resolveVisibleRatio(cropper);
      const relativeZoom = visibleRatio / baseVisibleRatioRef.current;
      const normalizedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, relativeZoom));

      // 双指缩放也统一受工具栏范围约束，避免显示值与实际画面比例脱节。
      if (Math.abs(normalizedZoom - relativeZoom) > 0.001) {
        cropper.zoomImage(normalizedZoom / relativeZoom, { transitions: false });
      }
      updateDisplayedZoom(normalizedZoom);
    }

    const coordinates = cropper.getCoordinates({ round: false });
    const imageElement = resolveImageElement();
    if (coordinates && imageElement) {
      onAreaChange(coordinates, imageElement);
    }
  }, [initializeCropper, onAreaChange, resolveImageElement, resolveVisibleRatio, updateDisplayedZoom]);

  const handleReady = useCallback((cropper: CropperRef) => {
    if (initializeCropper(cropper)) {
      emitAreaChange(cropper);
    }
  }, [emitAreaChange, initializeCropper]);

  const handleInteractionEnd = useCallback(() => {
    onAreaChangeEnd?.();
  }, [onAreaChangeEnd]);

  useEffect(() => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      const cropper = cropperRef.current;
      attempts += 1;
      if (cropper && initializeCropper(cropper)) {
        emitAreaChange(cropper);
        window.clearInterval(timer);
      }
      else if (attempts >= 200) {
        window.clearInterval(timer);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [emitAreaChange, image, initializeCropper]);

  const updateZoom = useCallback((
    nextZoom: number,
    options?: { center?: { left: number; top: number }; transitions?: boolean },
  ) => {
    const cropper = cropperRef.current;
    if (!cropper) {
      return;
    }
    const normalizedZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    const factor = normalizedZoom / Math.max(MIN_ZOOM, zoomRef.current);
    cropper.zoomImage(
      options?.center ? { factor, center: options.center } : factor,
      { transitions: options?.transitions ?? !shouldReduceMotion },
    );
    updateDisplayedZoom(normalizedZoom);
  }, [shouldReduceMotion, updateDisplayedZoom]);

  const handleWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    if (disabled || event.deltaY === 0) {
      return;
    }
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    updateZoom(zoomRef.current + (event.deltaY < 0 ? 0.1 : -0.1), {
      center: {
        left: event.clientX - bounds.left,
        top: event.clientY - bounds.top,
      },
      transitions: false,
    });
  }, [disabled, updateZoom]);

  const handleReset = useCallback(() => {
    cropperRef.current?.reset();
    updateDisplayedZoom(MIN_ZOOM);
  }, [updateDisplayedZoom]);

  return (
    <div className={`flex min-h-0 w-full flex-col gap-2 ${className}`}>
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden rounded-md bg-base-300 shadow-inner"
        onWheel={handleWheel}
      >
        <Cropper
          ref={cropperRef}
          src={image}
          className="size-full !bg-base-300"
          crossOrigin="anonymous"
          disabled={disabled}
          transitions={!shouldReduceMotion}
          imageRestriction={ImageRestriction.fitArea}
          backgroundWrapperProps={{
            scaleImage: { touch: true, wheel: false },
            moveImage: { touch: true, mouse: true },
          }}
          defaultSize={initialCoordinates
            ? { width: initialCoordinates.width, height: initialCoordinates.height }
            : undefined}
          defaultPosition={initialCoordinates
            ? { left: initialCoordinates.left, top: initialCoordinates.top }
            : undefined}
          stencilProps={{
            aspectRatio: aspect,
            handlers: true,
            lines: true,
            movable: true,
            resizable: true,
          }}
          onReady={handleReady}
          onChange={emitAreaChange}
          onInteractionEnd={handleInteractionEnd}
        />
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-md border border-base-content/10 bg-base-100 px-2 py-2 shadow-sm">
        <div className="basis-full sm:basis-auto sm:pr-1">
          <div id={zoomLabelId} className="text-xs font-medium text-base-content/80">画面缩放</div>
          <div className="text-[11px] text-base-content/50">拖动画面定位，滚轮缩放</div>
        </div>
        <div className="flex min-w-56 flex-1 items-center gap-1.5" aria-labelledby={zoomLabelId}>
          <button
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/40 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none sm:size-9"
            onClick={() => updateZoom(zoom - 0.05)}
            disabled={disabled || zoom <= MIN_ZOOM}
            title="缩小画面"
            aria-label="缩小画面"
          >
            <MinusIcon className="size-4" aria-hidden="true" />
          </button>
          <RangeInput
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            onChange={event => updateZoom(Number(event.currentTarget.value), { transitions: false })}
            className="min-w-0 flex-1"
            density="compact"
            disabled={disabled}
            aria-label="画面缩放"
            aria-valuetext={`${Math.round(zoom * 100)}%`}
          />
          <button
            type="button"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/40 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none sm:size-9"
            onClick={() => updateZoom(zoom + 0.05)}
            disabled={disabled || zoom >= MAX_ZOOM}
            title="放大画面"
            aria-label="放大画面"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
          </button>
          <output className="w-12 shrink-0 text-right text-xs tabular-nums text-base-content/70" aria-live="polite">
            {Math.round(zoom * 100)}%
          </output>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/40 disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none sm:min-h-9"
          onClick={handleReset}
          disabled={disabled}
          title="恢复进入编辑时的画面"
        >
          <ArrowCounterClockwiseIcon className="size-4" aria-hidden="true" />
          复位
        </button>
      </div>
    </div>
  );
}

export const ZoomableCropper = memo(ZoomableCropperComponent);

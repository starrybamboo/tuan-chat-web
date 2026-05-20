import { useEffect, useState } from "react";
import { Image } from "react-native";

export type ContainedRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const EMPTY_RECT: ContainedRect = { left: 0, top: 0, width: 0, height: 0 };

type ContainedRectState = {
  containerHeight: number;
  containerWidth: number;
  imageUrl: string;
  rect: ContainedRect;
};

function computeContainedRect(
  naturalWidth: number,
  naturalHeight: number,
  containerWidth: number,
  containerHeight: number,
): ContainedRect {
  if (containerWidth <= 0 || containerHeight <= 0 || naturalWidth <= 0 || naturalHeight <= 0) {
    return EMPTY_RECT;
  }
  const containerRatio = containerWidth / containerHeight;
  const imageRatio = naturalWidth / naturalHeight;
  let width: number;
  let height: number;
  let left: number;
  let top: number;

  if (imageRatio > containerRatio) {
    width = containerWidth;
    height = width / imageRatio;
    left = 0;
    top = (containerHeight - height) / 2;
  }
  else {
    height = containerHeight;
    width = height * imageRatio;
    left = (containerWidth - width) / 2;
    top = 0;
  }
  return { left, top, width, height };
}

export function useContainedImageRect(imageUrl: string, containerWidth: number, containerHeight: number): ContainedRect {
  const [rectState, setRectState] = useState<ContainedRectState | null>(null);

  useEffect(() => {
    if (!imageUrl || containerWidth <= 0 || containerHeight <= 0) {
      return;
    }

    let disposed = false;
    Image.getSize(
      imageUrl,
      (naturalWidth, naturalHeight) => {
        if (disposed) {
          return;
        }
        setRectState({
          containerHeight,
          containerWidth,
          imageUrl,
          rect: computeContainedRect(naturalWidth, naturalHeight, containerWidth, containerHeight),
        });
      },
      () => {
        if (disposed) {
          return;
        }
        setRectState({
          containerHeight,
          containerWidth,
          imageUrl,
          rect: EMPTY_RECT,
        });
      },
    );

    return () => {
      disposed = true;
    };
  }, [containerHeight, containerWidth, imageUrl]);

  if (
    rectState?.imageUrl !== imageUrl
    || rectState.containerWidth !== containerWidth
    || rectState.containerHeight !== containerHeight
  ) {
    return EMPTY_RECT;
  }

  return rectState.rect;
}

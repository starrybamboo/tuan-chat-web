import type { Coordinates } from "react-advanced-cropper";
import type { Crop, PixelCrop } from "react-image-crop";

type CropSource = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type ImageDimensions = {
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
};

export function createInitialCropCoordinates(
  crop: CropSource | undefined,
  sourceWidth: number | undefined,
  sourceHeight: number | undefined,
): Coordinates | undefined {
  if (!crop?.width || !crop.height || !sourceWidth || !sourceHeight) {
    return undefined;
  }
  return {
    left: Math.max(0, crop.x ?? 0),
    top: Math.max(0, crop.y ?? 0),
    width: Math.min(sourceWidth, crop.width),
    height: Math.min(sourceHeight, crop.height),
  };
}

export function createCropStateFromCoordinates(coordinates: Coordinates, image: ImageDimensions): {
  crop: Crop;
  completedCrop: PixelCrop;
} {
  const naturalWidth = Math.max(1, image.naturalWidth);
  const naturalHeight = Math.max(1, image.naturalHeight);
  const scaleX = image.width / naturalWidth;
  const scaleY = image.height / naturalHeight;
  return {
    crop: {
      unit: "%",
      x: (coordinates.left / naturalWidth) * 100,
      y: (coordinates.top / naturalHeight) * 100,
      width: (coordinates.width / naturalWidth) * 100,
      height: (coordinates.height / naturalHeight) * 100,
    },
    completedCrop: {
      unit: "px",
      x: coordinates.left * scaleX,
      y: coordinates.top * scaleY,
      width: coordinates.width * scaleX,
      height: coordinates.height * scaleY,
    },
  };
}

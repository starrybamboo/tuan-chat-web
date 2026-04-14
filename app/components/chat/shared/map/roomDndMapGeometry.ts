import type { CSSProperties } from "react";

export const MIN_GRID_DIMENSION = 1;
export const MAX_GRID_DIMENSION = 1000;

type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function clampGridDimension(value: number): number {
  if (!Number.isFinite(value)) {
    return MIN_GRID_DIMENSION;
  }
  return Math.min(MAX_GRID_DIMENSION, Math.max(MIN_GRID_DIMENSION, Math.trunc(value)));
}

export function resolveGridCellAtPoint(params: {
  clientX: number;
  clientY: number;
  rect: RectLike;
  gridRows: number;
  gridCols: number;
}) {
  const { clientX, clientY, rect, gridRows, gridCols } = params;
  if (rect.width <= 0 || rect.height <= 0 || gridRows <= 0 || gridCols <= 0) {
    return null;
  }

  const relativeX = clientX - rect.left;
  const relativeY = clientY - rect.top;
  if (relativeX < 0 || relativeY < 0 || relativeX > rect.width || relativeY > rect.height) {
    return null;
  }

  const colIndex = Math.min(gridCols - 1, Math.max(0, Math.floor((relativeX / rect.width) * gridCols)));
  const rowIndex = Math.min(gridRows - 1, Math.max(0, Math.floor((relativeY / rect.height) * gridRows)));
  return { rowIndex, colIndex };
}

export function buildGridOverlayStyle(gridRows: number, gridCols: number, gridColor: string): CSSProperties {
  const safeRows = Math.max(gridRows, 1);
  const safeCols = Math.max(gridCols, 1);
  const lineColor = `${gridColor}CC`;
  return {
    backgroundImage: [
      `linear-gradient(to right, ${lineColor} 1px, transparent 1px)`,
      `linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`,
    ].join(","),
    backgroundSize: `${100 / safeCols}% ${100 / safeRows}%`,
    boxShadow: `inset 0 0 0 1px ${lineColor}`,
  };
}

export function buildTokenPositionStyle(
  rowIndex: number,
  colIndex: number,
  gridRows: number,
  gridCols: number,
): CSSProperties {
  const safeRows = Math.max(gridRows, 1);
  const safeCols = Math.max(gridCols, 1);
  return {
    left: `${((colIndex + 0.5) / safeCols) * 100}%`,
    top: `${((rowIndex + 0.5) / safeRows) * 100}%`,
    transform: "translate(-50%, -50%)",
  };
}

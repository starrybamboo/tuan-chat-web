import type {
  V4CharGender,
  V4CharEditorRow,
} from "@/components/aiImage/types";

import {
  clamp01,
  makeStableId,
} from "@/components/aiImage/utils/base";

export function newV4CharEditorRow(options?: { gender?: V4CharGender }): V4CharEditorRow {
  return {
    id: makeStableId(),
    gender: options?.gender ?? "other",
    prompt: "",
    negativePrompt: "",
    centerX: 0.5,
    centerY: 0.5,
  };
}

const V4_CHAR_GRID_COLUMNS = ["A", "B", "C", "D", "E"] as const;
const V4_CHAR_GRID_SIZE = 5;

export type V4CharGridCell = {
  code: string;
  colIndex: number;
  rowIndex: number;
  centerX: number;
  centerY: number;
};

export const V4_CHAR_GRID_CELLS: readonly V4CharGridCell[] = Object.freeze(
  Array.from({ length: V4_CHAR_GRID_SIZE * V4_CHAR_GRID_SIZE }, (_, index) => {
    const rowIndex = Math.floor(index / V4_CHAR_GRID_SIZE);
    const colIndex = index % V4_CHAR_GRID_SIZE;
    return {
      code: `${V4_CHAR_GRID_COLUMNS[colIndex]}${rowIndex + 1}`,
      colIndex,
      rowIndex,
      centerX: (colIndex + 0.5) / V4_CHAR_GRID_SIZE,
      centerY: (rowIndex + 0.5) / V4_CHAR_GRID_SIZE,
    };
  }),
);

const V4_CHAR_GRID_CELL_MAP = new Map<string, V4CharGridCell>(
  V4_CHAR_GRID_CELLS.map(cell => [cell.code, cell]),
);

export function getV4CharGridCellByCode(code: string) {
  return V4_CHAR_GRID_CELL_MAP.get(String(code || "").trim().toUpperCase()) ?? null;
}

export function getV4CharGridCellByCenter(centerX: number, centerY: number) {
  const normalizedX = clamp01(centerX, 0.5);
  const normalizedY = clamp01(centerY, 0.5);
  const colIndex = Math.max(0, Math.min(V4_CHAR_GRID_SIZE - 1, Math.round(normalizedX * V4_CHAR_GRID_SIZE - 0.5)));
  const rowIndex = Math.max(0, Math.min(V4_CHAR_GRID_SIZE - 1, Math.round(normalizedY * V4_CHAR_GRID_SIZE - 0.5)));
  return V4_CHAR_GRID_CELLS[rowIndex * V4_CHAR_GRID_SIZE + colIndex] ?? V4_CHAR_GRID_CELLS[12];
}

export function getNextAvailableV4CharGridCell(rows: Array<Pick<V4CharEditorRow, "centerX" | "centerY">>) {
  const occupiedCodes = new Set(rows.map(row => getV4CharGridCellByCenter(row.centerX, row.centerY).code));
  return V4_CHAR_GRID_CELLS.find(cell => !occupiedCodes.has(cell.code)) ?? V4_CHAR_GRID_CELLS[V4_CHAR_GRID_CELLS.length - 1];
}

export function normalizeV4CharGridRows(rows: V4CharEditorRow[]) {
  const occupiedCodes = new Set<string>();
  let changed = false;
  const nextRows = rows.map((row) => {
    const preferredCell = getV4CharGridCellByCenter(row.centerX, row.centerY);
    const resolvedCell = occupiedCodes.has(preferredCell.code)
      ? (V4_CHAR_GRID_CELLS.find(cell => !occupiedCodes.has(cell.code)) ?? preferredCell)
      : preferredCell;
    occupiedCodes.add(resolvedCell.code);
    if (resolvedCell.centerX === row.centerX && resolvedCell.centerY === row.centerY)
      return row;
    changed = true;
    return {
      ...row,
      centerX: resolvedCell.centerX,
      centerY: resolvedCell.centerY,
    };
  });
  return changed ? nextRows : rows;
}

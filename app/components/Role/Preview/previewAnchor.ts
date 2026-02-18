import type { FigurePositionKey } from "@/types/voiceRenderTypes";
import { FIGURE_POSITION_LABELS, FIGURE_POSITION_ORDER } from "@/types/voiceRenderTypes";

export const REFERENCE_WIDTH = 2560;
export const REFERENCE_HEIGHT = 1440;

export type PreviewAnchorPosition = FigurePositionKey;

export const PREVIEW_ANCHOR_ORDER = FIGURE_POSITION_ORDER;
export const PREVIEW_ANCHOR_LABELS = FIGURE_POSITION_LABELS;

// 与聊天室实时渲染使用同一参考值，保证预览位置语义一致。
const FIGURE_SLOT_OFFSET_X_REF = 420;

const PREVIEW_ANCHOR_OFFSET_X_REF: Record<PreviewAnchorPosition, number> = {
  "left": -FIGURE_SLOT_OFFSET_X_REF * 2,
  "left-center": -FIGURE_SLOT_OFFSET_X_REF,
  "center": 0,
  "right-center": FIGURE_SLOT_OFFSET_X_REF,
  "right": FIGURE_SLOT_OFFSET_X_REF * 2,
};

export function getAnchorOffsetXRef(anchorPosition: PreviewAnchorPosition = "center"): number {
  return PREVIEW_ANCHOR_OFFSET_X_REF[anchorPosition] ?? 0;
}

import { COMPOSER_MAX_HEIGHT, COMPOSER_MIN_HEIGHT } from "../../lib/composer-layout-constants";

export function resolveComposerInputHeight(contentSizeHeight: number): number {
  if (!Number.isFinite(contentSizeHeight)) {
    return COMPOSER_MIN_HEIGHT;
  }

  // TextInput 的 contentSize.height 已包含文本布局高度，重复叠加 padding 会导致高度反馈式上涨。
  const measuredHeight = Math.ceil(contentSizeHeight);
  return Math.min(Math.max(measuredHeight, COMPOSER_MIN_HEIGHT), COMPOSER_MAX_HEIGHT);
}

export const DEFAULT_WEBGAL_RUN_SPLIT_RATIO = 0.45;
export const WEBGAL_RUN_SPLIT_HANDLE_HEIGHT = 12;

const MIN_WEBGAL_PANEL_HEIGHT = 180;
const MIN_RUN_PANEL_HEIGHT = 180;

export type WebgalRunSplitMetrics = {
  usableHeight: number;
  webgalHeight: number;
  runHeight: number;
  ratio: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampWebgalRunSplitRatio(value: number): number {
  return Number.isFinite(value) ? clamp(value, 0, 1) : DEFAULT_WEBGAL_RUN_SPLIT_RATIO;
}

export function computeWebgalRunSplitMetrics(params: {
  containerHeight: number;
  ratio: number;
}): WebgalRunSplitMetrics {
  const safeContainerHeight = Number.isFinite(params.containerHeight) ? Math.max(0, params.containerHeight) : 0;
  const usableHeight = Math.max(0, safeContainerHeight - WEBGAL_RUN_SPLIT_HANDLE_HEIGHT);

  if (usableHeight <= 0) {
    return {
      usableHeight,
      webgalHeight: 0,
      runHeight: 0,
      ratio: DEFAULT_WEBGAL_RUN_SPLIT_RATIO,
    };
  }

  const minWebgalHeight = Math.min(MIN_WEBGAL_PANEL_HEIGHT, Math.floor(usableHeight / 2));
  const minRunHeight = Math.min(MIN_RUN_PANEL_HEIGHT, Math.floor(usableHeight / 2));
  const maxWebgalHeight = Math.max(minWebgalHeight, usableHeight - minRunHeight);
  const rawWebgalHeight = Math.round(usableHeight * clampWebgalRunSplitRatio(params.ratio));
  const webgalHeight = clamp(rawWebgalHeight, minWebgalHeight, maxWebgalHeight);

  return {
    usableHeight,
    webgalHeight,
    runHeight: Math.max(0, usableHeight - webgalHeight),
    ratio: webgalHeight / usableHeight,
  };
}

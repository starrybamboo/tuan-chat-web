/** “应用裁剪”弹窗展示的确定进度与当前处理说明。 */
export type CropApplicationProgress = {
  current: number;
  total: number;
  label: string;
  detail: string;
};

/** 单张裁剪可观测的真实处理阶段。 */
export type SingleCropApplicationStage =
  | "preparing"
  | "waitingForUpload"
  | "uploading"
  | "saving"
  | "updatingPreview";

const SINGLE_CROP_PROGRESS: Record<SingleCropApplicationStage, CropApplicationProgress> = {
  preparing: {
    current: 1,
    total: 5,
    label: "正在生成裁剪图",
    detail: "正在后台处理原图",
  },
  waitingForUpload: {
    current: 2,
    total: 5,
    label: "正在等待图片上传",
    detail: "上传完成后会自动继续",
  },
  uploading: {
    current: 3,
    total: 5,
    label: "正在上传裁剪结果",
    detail: "正在同步新的头像或立绘",
  },
  saving: {
    current: 4,
    total: 5,
    label: "正在保存裁剪设置",
    detail: "正在更新角色与立绘组配置",
  },
  updatingPreview: {
    current: 5,
    total: 5,
    label: "正在更新预览",
    detail: "即将完成",
  },
};

/** 根据单张裁剪处理阶段生成弹窗状态。 */
export function createSingleCropApplicationProgress(stage: SingleCropApplicationStage) {
  return SINGLE_CROP_PROGRESS[stage];
}

/** 批量裁剪可观测的真实处理阶段。 */
export type BatchCropApplicationStage = "preparing" | "loading" | "cropping" | "uploading" | "saving";

const BATCH_STAGE_PROGRESS: Record<BatchCropApplicationStage, Pick<CropApplicationProgress, "current" | "label">> = {
  preparing: { current: 1, label: "正在准备批量裁剪" },
  loading: { current: 2, label: "正在加载图片" },
  cropping: { current: 3, label: "正在生成裁剪图" },
  uploading: { current: 4, label: "正在上传裁剪结果" },
  saving: { current: 5, label: "正在保存裁剪设置" },
};

type BatchProgressCounts = {
  completed?: number;
  itemTotal?: number;
  success?: number;
  failed?: number;
};

/** 根据批量处理阶段及条目计数生成弹窗状态。 */
export function createBatchCropApplicationProgress(
  stage: BatchCropApplicationStage,
  counts: BatchProgressCounts = {},
): CropApplicationProgress {
  const stageProgress = BATCH_STAGE_PROGRESS[stage];
  const itemTotal = Math.max(Math.floor(counts.itemTotal ?? 0), 0);
  const completed = Math.min(Math.max(Math.floor(counts.completed ?? 0), 0), itemTotal);
  const detail = itemTotal > 0
    ? `已处理 ${completed}/${itemTotal} · 成功 ${counts.success ?? 0} · 失败 ${counts.failed ?? 0}`
    : stage === "saving" ? "正在同步角色与立绘组配置" : "正在整理待处理图片";

  return {
    ...stageProgress,
    total: 5,
    detail,
  };
}

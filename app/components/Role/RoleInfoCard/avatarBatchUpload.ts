import type { UploadContext } from "./AvatarUploadCropper";

export type AvatarBatchUploadResult = {
  errorCount: number;
};

export type RunAvatarBatchUploadParams<TPayload> = {
  files: File[];
  prepareUpload: (file: File, index: number, total: number) => Promise<TPayload>;
  commitUpload: (payload: TPayload, context: UploadContext) => Promise<void>;
  onProgress?: (completed: number, total: number) => void;
  onItemError?: (error: unknown, context: UploadContext) => void;
};

type PreparedAvatarBatchUploadResult<TPayload>
  = {
    status: "fulfilled";
    value: TPayload;
  } | {
    status: "rejected";
    reason: unknown;
  };

/**
 * 批量头像上传分两阶段执行：
 * 1. 图片裁剪与媒体上传并行处理，尽快榨干单图耗时；
 * 2. 角色头像写入按原顺序串行提交，避免列表顺序漂移。
 */
export async function runAvatarBatchUpload<TPayload>({
  files,
  prepareUpload,
  commitUpload,
  onProgress,
  onItemError,
}: RunAvatarBatchUploadParams<TPayload>): Promise<AvatarBatchUploadResult> {
  const total = files.length;
  const preparedResults = files.map(async (file, index): Promise<PreparedAvatarBatchUploadResult<TPayload>> => {
    try {
      return {
        status: "fulfilled",
        value: await prepareUpload(file, index, total),
      };
    }
    catch (reason) {
      return {
        status: "rejected",
        reason,
      };
    }
  });

  let completed = 0;
  let errorCount = 0;

  for (let index = 0; index < preparedResults.length; index += 1) {
    const context: UploadContext = {
      batch: true,
      index,
      total,
    };
    const prepared = await preparedResults[index];

    if (!prepared || prepared.status !== "fulfilled") {
      errorCount += 1;
      onItemError?.(prepared?.reason, context);
      completed += 1;
      onProgress?.(completed, total);
      continue;
    }

    try {
      await commitUpload(prepared.value, context);
    }
    catch (error) {
      errorCount += 1;
      onItemError?.(error, context);
    }
    finally {
      completed += 1;
      onProgress?.(completed, total);
    }
  }

  return { errorCount };
}

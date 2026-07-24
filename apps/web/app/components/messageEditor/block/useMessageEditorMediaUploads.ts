import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { appToast } from "@/components/common/appToast/appToast";
import {
  readImageDimensions,
  readMediaDuration,
  readVideoDimensions,
} from "@/utils/media/mediaMetadata";
import { UploadUtils } from "@/utils/media/UploadUtils";

import type {
  MessageEditorInsertableBlockKind,
  MessageEditorUploadedMediaPayload,
} from "../document/messageEditorTransforms";
import type { MessageEditorMessage } from "../messageEditorTypes";

import { getMessageEditorBlockId } from "../document/messageEditorTransforms";

/** 媒体上传期间供块视图展示的本地状态。 */
export type PendingMessageEditorMediaUpload = {
  error?: string;
  file: File;
  requestId: number;
};

/** 媒体上传与元数据读取依赖，供上传管线测试和替换实现。 */
export type MessageEditorMediaUploadDependencies = {
  readImageDimensions: typeof readImageDimensions;
  readMediaDuration: typeof readMediaDuration;
  readVideoDimensions: typeof readVideoDimensions;
  uploadUtils: Pick<UploadUtils, "uploadAudioAsset" | "uploadDualImage" | "uploadFileAsset" | "uploadVideo">;
};

type UseMessageEditorMediaUploadsParams = {
  messages: MessageEditorMessage[];
  onUploaded: (blockId: string, payload: MessageEditorUploadedMediaPayload) => void;
  reportError?: (message: string) => void;
};

/**
 * 上传一个编辑器媒体文件并补齐消息需要的元数据。
 */
export async function uploadMessageEditorMediaFile(
  kind: MessageEditorInsertableBlockKind,
  file: File,
  dependencies: MessageEditorMediaUploadDependencies,
): Promise<MessageEditorUploadedMediaPayload> {
  const { uploadUtils } = dependencies;

  if (kind === "image") {
    const [uploadedImage, dimensions] = await Promise.all([
      uploadUtils.uploadDualImage(file),
      dependencies.readImageDimensions(file),
    ]);
    return {
      fileId: uploadedImage.fileId,
      fileName: file.name,
      mediaType: uploadedImage.mediaType,
      size: file.size,
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  if (kind === "file") {
    const uploadedFile = await uploadUtils.uploadFileAsset(file);
    return {
      fileId: uploadedFile.fileId,
      fileName: file.name,
      mediaType: uploadedFile.mediaType,
      size: file.size,
    };
  }

  if (kind === "audio") {
    const [uploadedAudio, second] = await Promise.all([
      uploadUtils.uploadAudioAsset(file),
      dependencies.readMediaDuration(file),
    ]);
    if (second == null) {
      throw new Error("无法读取音频时长，请换用可识别的音频文件后重试。");
    }
    return {
      fileId: uploadedAudio.fileId,
      fileName: file.name,
      mediaType: uploadedAudio.mediaType,
      size: file.size,
      second,
    };
  }

  if (kind === "video") {
    const [uploadedVideo, dimensions, second] = await Promise.all([
      uploadUtils.uploadVideo(file),
      dependencies.readVideoDimensions(file),
      dependencies.readMediaDuration(file),
    ]);
    return {
      fileId: uploadedVideo.fileId,
      fileName: file.name,
      mediaType: uploadedVideo.mediaType,
      size: file.size,
      second,
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  throw new Error("不支持该媒体类型");
}

/** 管理编辑器媒体块的上传、竞态保护、失败状态和块删除清理。 */
export function useMessageEditorMediaUploads({
  messages,
  onUploaded,
  reportError = appToast.error,
}: UseMessageEditorMediaUploadsParams) {
  const uploadUtils = useMemo(() => new UploadUtils(), []);
  const requestIdRef = useRef(0);
  const pendingUploadsRef = useRef(new Map<string, PendingMessageEditorMediaUpload>());
  const [pendingUploads, setPendingUploads] = useState<Map<string, PendingMessageEditorMediaUpload>>(new Map());

  const clear = useCallback((blockId: string) => {
    pendingUploadsRef.current.delete(blockId);
    setPendingUploads((current) => {
      if (!current.has(blockId)) {
        return current;
      }
      const next = new Map(current);
      next.delete(blockId);
      return next;
    });
  }, []);

  useEffect(() => {
    const blockIds = new Set(messages.map(getMessageEditorBlockId));
    const hasRemovedUpload = [...pendingUploadsRef.current.keys()].some(blockId => !blockIds.has(blockId));
    if (!hasRemovedUpload) {
      return;
    }

    const nextPendingUploads = new Map(
      [...pendingUploadsRef.current].filter(([blockId]) => blockIds.has(blockId)),
    );
    pendingUploadsRef.current = nextPendingUploads;
    setPendingUploads(nextPendingUploads);
  }, [messages]);

  const upload = useCallback(async (
    blockId: string,
    kind: MessageEditorInsertableBlockKind,
    file: File,
  ) => {
    const requestId = ++requestIdRef.current;
    const pendingUpload = { file, requestId } satisfies PendingMessageEditorMediaUpload;
    pendingUploadsRef.current.set(blockId, pendingUpload);
    setPendingUploads(current => new Map(current).set(blockId, pendingUpload));

    try {
      const payload = await uploadMessageEditorMediaFile(kind, file, {
        readImageDimensions,
        readMediaDuration,
        readVideoDimensions,
        uploadUtils,
      });
      if (pendingUploadsRef.current.get(blockId)?.requestId !== requestId) {
        return;
      }

      onUploaded(blockId, payload);
      clear(blockId);
    }
    catch (error) {
      if (pendingUploadsRef.current.get(blockId)?.requestId !== requestId) {
        return;
      }

      const errorMessage = (error instanceof Error ? error.message : String(error)) || "媒体上传失败";
      const failedUpload = { ...pendingUpload, error: errorMessage } satisfies PendingMessageEditorMediaUpload;
      pendingUploadsRef.current.set(blockId, failedUpload);
      setPendingUploads(current => new Map(current).set(blockId, failedUpload));
      reportError(errorMessage);
    }
  }, [clear, onUploaded, reportError, uploadUtils]);

  return {
    clear,
    pendingUploads,
    upload,
  };
}

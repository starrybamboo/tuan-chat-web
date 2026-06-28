import type { ImageCompressionPreset, MediaQuality, MediaType } from "@/utils/media/imgCompressUtils";
import type { UploadedMediaFile } from "@/utils/media/mediaUpload";

import { isAudioUploadDebugEnabled } from "@/utils/media/audioDebugFlags";
import { transcodeAudioFileToOpusOrThrow } from "@/utils/media/audioTranscodeUtils";
import { assertAudioUploadInputSizeOrThrow, buildDefaultAudioUploadTranscodeOptions } from "@/utils/media/audioUploadPolicy";
import { BUSINESS_MEDIA_QUALITY } from "@/utils/media/imgCompressUtils";
import { inferMediaTypeFromMimeType, normalizeFileMimeType } from "@/utils/media/mediaMime";
import { uploadGeneratedMediaFiles, uploadMediaFile as uploadRawMediaFile } from "@/utils/media/mediaUpload";
import { mediaFileUrl } from "@/utils/media/mediaUrl";
import { transcodeVideoFileToWebmOrThrow } from "@/utils/media/videoTranscodeUtils";

/**
 * 前端业务上传场景，沿用后端媒体服务的 scene 编码。
 */
export type MediaUploadScene = 1 | 2 | 3 | 4;

/**
 * 只需要 fileId/mediaType 的业务上传参数。
 */
export type UploadUtilsMediaFileOptions = {
  scene?: MediaUploadScene;
  signal?: AbortSignal;
};

/**
 * 需要 URL 与文件信息的业务上传参数。
 */
export type UploadMediaAssetOptions = {
  quality?: MediaQuality;
  scene?: MediaUploadScene;
};

/**
 * 图片上传后用于消息、素材等业务层消费的双地址结果。
 */
export type UploadedDualImageResult = {
  fileId: number;
  mediaType: MediaType;
  originalSize: number;
  originalUrl: string;
  url: string;
};

/**
 * 媒体上传后用于业务层消费的统一结果。
 */
export type UploadedMediaAssetResult = {
  fileId: number;
  fileName: string;
  mediaType: MediaType;
  originalUrl: string;
  size: number;
  uploadRequired: boolean;
  url: string;
};

/**
 * 业务组件的统一媒体入口。
 *
 * 职责边界：
 * - UploadUtils：面向业务，负责 scene、quality、URL、预处理、转码兜底和返回结构。
 * - mediaUpload：面向上传管线，负责派生文件、上传会话、OSS PUT、complete 和去重。
 */
export class UploadUtils {
  private static readonly videoPrepareCache = new WeakMap<File, Promise<File>>();
  private static readonly audioPrepareCache = new WeakMap<File, Map<string, Promise<File>>>();
  private static readonly defaultEnableBrowserVideoTranscode = true;

  // ========== 业务上传入口 ==========

  /**
   * 兼容只需要 fileId/mediaType 的业务调用。
   *
   * 新业务如果需要可展示 URL，优先使用 uploadImageAsset / uploadAudioAsset /
   * uploadVideo / uploadFileAsset 这些带业务语义的入口。
   */
  public async uploadMediaFile(file: File, options: UploadUtilsMediaFileOptions = {}): Promise<UploadedMediaFile> {
    return await uploadRawMediaFile(file, options);
  }

  /**
   * 上传任意媒体文件并返回业务可直接消费的 URL 与文件信息。
   */
  public async uploadMediaAsset(
    file: File,
    options: UploadMediaAssetOptions = {},
  ): Promise<UploadedMediaAssetResult> {
    return await this.uploadMediaAssetWithQuality(file, options.scene ?? 1, options.quality ?? "medium");
  }

  /**
   * 上传音频文件
   * @param file 音频文件
   * @param scene 上传场景 1.聊天室,2.表情包，3.角色差分 4.仓库图片（暂时使用场景1）
   * @param maxDuration 最大时长（秒），默认30秒
   */
  async uploadAudio(file: File, scene: MediaUploadScene = 1, maxDuration = 30): Promise<string> {
    return (await this.uploadAudioAsset(file, scene, maxDuration)).url;
  }

  async uploadAudioAsset(file: File, scene: MediaUploadScene = 1, maxDuration = 30): Promise<UploadedMediaAssetResult> {
    const normalizedInput = await normalizeFileMimeType(file, { expectedMediaType: "audio" });
    if (inferMediaTypeFromMimeType(normalizedInput.type) !== "audio") {
      throw new Error("只支持音频文件格式");
    }

    const debugEnabled = isAudioUploadDebugEnabled();
    const debugPrefix = "[tc-audio-upload]";
    let processedFile = normalizedInput;
    try {
      processedFile = await this.prepareAudioForUpload(normalizedInput, maxDuration);
    }
    catch (error) {
      console.warn("[音频上传] 转码失败，回退为原音频上传", {
        name: normalizedInput.name,
        type: normalizedInput.type,
        size: normalizedInput.size,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (debugEnabled) {
      console.warn(`${debugPrefix} upload prepared file`, {
        scene,
        input: { name: normalizedInput.name, size: normalizedInput.size, type: normalizedInput.type },
        prepared: { name: processedFile.name, size: processedFile.size, type: processedFile.type },
      });
    }

    if (debugEnabled)
      console.warn(`${debugPrefix} media-service`, { fileName: processedFile.name });

    const uploaded = await this.uploadPreparedMediaAsset(processedFile, "audio", scene, scene === 1 ? "low" : "medium");
    if (debugEnabled)
      console.warn(`${debugPrefix} downloadUrl`, uploaded.url);

    if (debugEnabled) {
      const url = uploaded.url;
      if (!/\.webm(?:\?|#|$)/i.test(url)) {
        console.warn(`${debugPrefix} unexpected downloadUrl extension (expect .webm)`, { url, fileName: processedFile.name });
      }
    }
    return uploaded;
  }

  /**
   * 上传原始音频文件（不做 Opus 转码）
   * - 用于“语音参考文件”等不适合被统一转码的场景
   */
  async uploadAudioOriginal(file: File, scene: MediaUploadScene = 1): Promise<string> {
    return (await this.uploadAudioOriginalAsset(file, scene)).originalUrl;
  }

  async uploadAudioOriginalAsset(file: File, scene: MediaUploadScene = 1): Promise<UploadedMediaAssetResult> {
    const normalizedInput = await normalizeFileMimeType(file, { expectedMediaType: "audio" });
    if (inferMediaTypeFromMimeType(normalizedInput.type) !== "audio") {
      throw new Error("只支持音频文件格式");
    }

    assertAudioUploadInputSizeOrThrow(normalizedInput.size);
    return await this.uploadMediaAssetWithQuality(normalizedInput, scene, scene === 1 ? "low" : "original");
  }

  /**
   * 上传视频文件
   * - 优先转码为 webm（压缩体积与播放兼容性）
   * - 若浏览器 FFmpeg WASM 内存越界，则回退上传原视频（保留原音轨，不做无声回退）
   */
  async uploadVideo(
    file: File,
    scene: MediaUploadScene = 1,
  ): Promise<UploadedMediaAssetResult> {
    const normalizedInput = await normalizeFileMimeType(file, { expectedMediaType: "video" });
    const normalizedVideoFile = this.normalizeVideoInputFileOrThrow(normalizedInput);

    let uploadCandidate = normalizedVideoFile;
    try {
      uploadCandidate = await this.prepareVideoForUpload(normalizedVideoFile);
    }
    catch (error) {
      if (!this.shouldFallbackToOriginalVideoUpload(error)) {
        throw error;
      }
      // 仅在 ffmpeg.wasm OOM 时回退原视频，避免直接阻断发送。
      console.warn("[视频上传] 转码出现 WASM 内存越界，回退为原视频上传（保留音轨）", {
        name: normalizedVideoFile.name,
        type: normalizedVideoFile.type,
        size: normalizedVideoFile.size,
        error: error instanceof Error ? error.message : String(error),
      });
      uploadCandidate = normalizedVideoFile;
    }

    return await this.uploadPreparedMediaAsset(uploadCandidate, "video", scene, scene === 1 ? "low" : "medium");
  }

  /**
   * 上传通用文件（用于聊天文件消息）
   */
  async uploadFile(file: File, scene: MediaUploadScene = 1): Promise<string> {
    return (await this.uploadFileAsset(file, scene)).originalUrl;
  }

  async uploadFileAsset(file: File, scene: MediaUploadScene = 1): Promise<UploadedMediaAssetResult> {
    const normalizedFile = await normalizeFileMimeType(file);
    return await this.uploadMediaAssetWithQuality(normalizedFile, scene, scene === 1 ? "low" : "original");
  }

  /**
   * 上传图片并返回 fileId、originalUrl 与按 quality 解析后的展示 URL。
   */
  async uploadImageAsset(
    file: File,
    scene: MediaUploadScene = 1,
    quality: MediaQuality = "medium",
  ): Promise<UploadedMediaAssetResult> {
    const normalizedFile = await this.normalizeImageInputOrThrow(file);
    return await this.uploadMediaAssetWithQuality(normalizedFile, scene, quality);
  }

  async uploadDualImage(
    file: File,
    scene: MediaUploadScene = 1,
  ): Promise<UploadedDualImageResult> {
    const normalizedFile = await this.normalizeImageInputOrThrow(file);
    const originalSize = file.size;
    const uploaded = await this.uploadMediaAssetWithQuality(normalizedFile, scene, "medium");
    return {
      fileId: uploaded.fileId,
      mediaType: uploaded.mediaType,
      originalSize,
      originalUrl: uploaded.originalUrl,
      url: uploaded.url,
    };
  }

  async uploadDualImageByPreset(
    file: File,
    preset: ImageCompressionPreset,
    scene: MediaUploadScene = 1,
  ): Promise<UploadedDualImageResult> {
    const normalizedFile = await this.normalizeImageInputOrThrow(file);
    const originalSize = file.size;
    const uploaded = await this.uploadMediaAssetWithQuality(normalizedFile, scene, UploadUtils.resolvePresetQuality(preset));
    return {
      fileId: uploaded.fileId,
      mediaType: uploaded.mediaType,
      originalSize,
      originalUrl: uploaded.originalUrl,
      url: uploaded.url,
    };
  }

  /**
   * 上传原始图片，不走压缩流程。
   * 适用于需要保留裁剪后无压缩版本的场景。
   */
  async uploadOriginalImg(file: File, scene: MediaUploadScene = 1): Promise<string> {
    const normalizedFile = await this.normalizeImageInputOrThrow(file);
    return (await this.uploadMediaAssetWithQuality(normalizedFile, scene, scene === 1 ? "medium" : "original")).originalUrl;
  }

  /**
   * 上传图片
   * @param file img文件
   * @param scene 上传场景1.聊天室,2.表情包，3.角色差分 4.仓库图片
   */
  async uploadImg(
    file: File,
    scene: MediaUploadScene = 1,
  ): Promise<string> {
    const normalizedFile = await this.normalizeImageInputOrThrow(file);
    return (await this.uploadMediaAssetWithQuality(normalizedFile, scene, "medium")).url;
  }

  async uploadImgByPreset(
    file: File,
    preset: ImageCompressionPreset,
    scene: MediaUploadScene = 1,
  ): Promise<string> {
    const normalizedFile = await this.normalizeImageInputOrThrow(file);
    return (await this.uploadMediaAssetWithQuality(normalizedFile, scene, UploadUtils.resolvePresetQuality(preset))).url;
  }

  // ========== 预处理与上传兜底 ==========

  public async preprocessVideoForUpload(file: File): Promise<File> {
    return await this.prepareVideoForUpload(file);
  }

  public async preprocessAudioForUpload(file: File, maxDuration = 30): Promise<File> {
    return await this.prepareAudioForUpload(file, maxDuration);
  }

  private normalizeVideoInputFileOrThrow(file: File): File {
    const extension = ((file.name || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "").trim();
    const inferredVideoMimeByExt: Record<string, string> = {
      mp4: "video/mp4",
      m4v: "video/mp4",
      mov: "video/quicktime",
      webm: "video/webm",
      mkv: "video/x-matroska",
      avi: "video/x-msvideo",
      wmv: "video/x-ms-wmv",
      flv: "video/x-flv",
      mpg: "video/mpeg",
      mpeg: "video/mpeg",
    };

    if (inferMediaTypeFromMimeType(file.type) === "video") {
      return file;
    }

    const inferredType = inferredVideoMimeByExt[extension];
    if (!inferredType) {
      throw new Error("只支持视频文件格式");
    }

    return new File([file], file.name, {
      type: inferredType,
      lastModified: file.lastModified,
    });
  }

  private shouldFallbackToOriginalVideoUpload(error: unknown): boolean {
    const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
    return message.includes("memory access out of bounds");
  }

  private isBrowserVideoTranscodeEnabled(): boolean {
    const env = import.meta.env as any;
    const envFlag = typeof env?.VITE_VIDEO_UPLOAD_ENABLE_TRANSCODE === "string"
      ? ["1", "true", "yes", "on"].includes(env.VITE_VIDEO_UPLOAD_ENABLE_TRANSCODE.toLowerCase())
      : typeof env?.VITE_VIDEO_UPLOAD_ENABLE_TRANSCODE === "boolean"
        ? env.VITE_VIDEO_UPLOAD_ENABLE_TRANSCODE
        : undefined;
    if (typeof envFlag === "boolean") {
      return envFlag;
    }

    try {
      const g = globalThis as any;
      if (typeof g?.__TC_VIDEO_UPLOAD_ENABLE_TRANSCODE === "boolean") {
        return g.__TC_VIDEO_UPLOAD_ENABLE_TRANSCODE;
      }
    }
    catch {
      // ignore
    }

    return UploadUtils.defaultEnableBrowserVideoTranscode;
  }

  private shouldBypassVideoTranscode(file: File): boolean {
    if (!this.isBrowserVideoTranscodeEnabled()) {
      return true;
    }

    const type = (file.type || "").toLowerCase();
    if (type === "video/webm")
      return true;
    return false;
  }

  private async prepareVideoForUpload(file: File): Promise<File> {
    return await UploadUtils.getOrCreatePromise(UploadUtils.videoPrepareCache, file, async () => {
      const normalizedVideoFile = await normalizeFileMimeType(file, { expectedMediaType: "video" });
      const ensuredVideoFile = this.normalizeVideoInputFileOrThrow(normalizedVideoFile);
      // 小体积常见格式优先直传，避免浏览器 ffmpeg.wasm 内存峰值导致 OOM。
      if (this.shouldBypassVideoTranscode(ensuredVideoFile)) {
        return ensuredVideoFile;
      }
      return await transcodeVideoFileToWebmOrThrow(ensuredVideoFile, {
        maxHeight: 1080,
        maxFps: 30,
        crf: 34,
      });
    });
  }

  private async prepareAudioForUpload(file: File, maxDuration = 30): Promise<File> {
    const normalizedFile = await normalizeFileMimeType(file, { expectedMediaType: "audio" });
    if (inferMediaTypeFromMimeType(normalizedFile.type) !== "audio") {
      throw new Error("只支持音频文件格式");
    }

    assertAudioUploadInputSizeOrThrow(normalizedFile.size);
    const normalizedMaxDuration = UploadUtils.normalizeAudioMaxDuration(maxDuration);
    const prepareKey = UploadUtils.buildAudioPrepareKey(normalizedMaxDuration);

    return await UploadUtils.getOrCreateNestedPromise(
      UploadUtils.audioPrepareCache,
      file,
      prepareKey,
      async () => {
        const debugEnabled = isAudioUploadDebugEnabled();
        const debugPrefix = "[tc-audio-upload]";
        if (debugEnabled) {
          console.warn(`${debugPrefix} UploadUtils.uploadAudio input`, {
            name: normalizedFile.name,
            type: normalizedFile.type,
            size: normalizedFile.size,
            maxDuration: normalizedMaxDuration > 0 ? normalizedMaxDuration : null,
          });
        }

        const transcodeOptions = buildDefaultAudioUploadTranscodeOptions(normalizedFile.size, normalizedMaxDuration);
        const processedFile = await transcodeAudioFileToOpusOrThrow(normalizedFile, transcodeOptions);
        if (debugEnabled) {
          console.warn(`${debugPrefix} processed`, {
            name: processedFile.name,
            type: processedFile.type,
            size: processedFile.size,
            transcodeOptions,
          });
        }

        return processedFile;
      },
    );
  }

  // ========== 内部支撑逻辑 ==========

  private async uploadMediaAssetWithQuality(
    file: File,
    scene: MediaUploadScene = 1,
    quality: MediaQuality = "medium",
  ): Promise<UploadedMediaAssetResult> {
    const uploaded = await uploadRawMediaFile(file, { scene });
    const sceneQuality = scene === 1
      ? (uploaded.mediaType === "image" ? "medium" : "low")
      : "original";
    const originalUrl = mediaFileUrl(uploaded.fileId, uploaded.mediaType, sceneQuality);
    return {
      fileId: uploaded.fileId,
      fileName: file.name,
      mediaType: uploaded.mediaType,
      originalUrl,
      size: file.size,
      uploadRequired: uploaded.uploadRequired,
      url: mediaFileUrl(uploaded.fileId, uploaded.mediaType, scene === 1
        ? (uploaded.mediaType === "image"
            ? UploadUtils.resolveChatroomImageUrlQuality(quality)
            : "low")
        : quality) || originalUrl,
    };
  }

  private async uploadPreparedMediaAsset(
    file: File,
    mediaType: MediaType,
    scene: MediaUploadScene = 1,
    quality: MediaQuality = "medium",
  ): Promise<UploadedMediaAssetResult> {
    const filesByQuality = UploadUtils.buildPreparedFilesByQuality(file, mediaType, scene, quality);
    const uploaded = await uploadGeneratedMediaFiles({
      original: file,
      mediaType,
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality,
    }, { scene });
    const sceneQuality = scene === 1
      ? (uploaded.mediaType === "image" ? "medium" : "low")
      : "original";
    const originalUrl = mediaFileUrl(uploaded.fileId, uploaded.mediaType, sceneQuality);
    return {
      fileId: uploaded.fileId,
      fileName: file.name,
      mediaType: uploaded.mediaType,
      originalUrl,
      size: file.size,
      uploadRequired: uploaded.uploadRequired,
      url: mediaFileUrl(uploaded.fileId, uploaded.mediaType, scene === 1
        ? (uploaded.mediaType === "image"
            ? UploadUtils.resolveChatroomImageUrlQuality(quality)
            : "low")
        : quality) || originalUrl,
    };
  }

  private async normalizeImageInputOrThrow(file: File): Promise<File> {
    const normalizedFile = await normalizeFileMimeType(file, { expectedMediaType: "image" });
    if (inferMediaTypeFromMimeType(normalizedFile.type) !== "image") {
      throw new Error("只支持图片文件格式");
    }
    return normalizedFile;
  }

  private static resolvePresetQuality(preset: ImageCompressionPreset): MediaQuality {
    return BUSINESS_MEDIA_QUALITY[preset]?.quality ?? "medium";
  }

  private static resolveChatroomImageUrlQuality(quality: MediaQuality): MediaQuality {
    if (quality === "low") {
      return quality;
    }
    return "medium";
  }

  private static buildPreparedFilesByQuality(
    file: File,
    mediaType: MediaType,
    scene: MediaUploadScene,
    quality: MediaQuality,
  ): Partial<Record<MediaQuality, File>> {
    if (scene !== 1) {
      return { original: file, low: file, medium: file };
    }
    if (mediaType === "image") {
      return { original: file, low: file, medium: file };
    }
    return { [quality]: file };
  }

  private static getOrCreateNestedPromise<T>(
    cache: WeakMap<File, Map<string, Promise<T>>>,
    file: File,
    key: string,
    create: () => Promise<T>,
  ): Promise<T> {
    const perFileCache = cache.get(file) ?? new Map<string, Promise<T>>();
    if (!cache.has(file)) {
      cache.set(file, perFileCache);
    }

    const existed = perFileCache.get(key);
    if (existed) {
      return existed;
    }

    const createdPromise = create().catch((error) => {
      const latest = perFileCache.get(key);
      if (latest === createdPromise) {
        perFileCache.delete(key);
      }
      if (perFileCache.size === 0) {
        cache.delete(file);
      }
      throw error;
    });

    perFileCache.set(key, createdPromise);
    return createdPromise;
  }

  private static getOrCreatePromise<T>(
    cache: WeakMap<File, Promise<T>>,
    file: File,
    create: () => Promise<T>,
  ): Promise<T> {
    const existed = cache.get(file);
    if (existed) {
      return existed;
    }

    const createdPromise = create().catch((error) => {
      const latest = cache.get(file);
      if (latest === createdPromise) {
        cache.delete(file);
      }
      throw error;
    });

    cache.set(file, createdPromise);
    return createdPromise;
  }

  private static normalizeAudioMaxDuration(maxDuration: number): number {
    if (!Number.isFinite(maxDuration) || maxDuration <= 0) {
      return 0;
    }
    return Math.floor(maxDuration);
  }

  private static buildAudioPrepareKey(maxDuration: number): string {
    return String(UploadUtils.normalizeAudioMaxDuration(maxDuration));
  }
}

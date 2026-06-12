import { Md5 } from "ts-md5";

import type { ImageCompressionOptions, ImageCompressionPreset, MediaQuality, MediaType } from "@/utils/imgCompressUtils";

import { isAudioUploadDebugEnabled } from "@/utils/audioDebugFlags";
import { transcodeAudioFileToOpusOrThrow } from "@/utils/audioTranscodeUtils";
import { assertAudioUploadInputSizeOrThrow, buildDefaultAudioUploadTranscodeOptions } from "@/utils/audioUploadPolicy";
import { BUSINESS_MEDIA_QUALITY, compressImage, DEFAULT_IMAGE_COMPRESSION_OPTIONS, IMAGE_COMPRESSION_PRESETS } from "@/utils/imgCompressUtils";
import { inferMediaTypeFromMimeType, normalizeFileMimeType } from "@/utils/mediaMime";
import { uploadGeneratedMediaFiles, uploadMediaFile } from "@/utils/mediaUpload";
import { mediaFileUrl } from "@/utils/mediaUrl";
import { transcodeVideoFileToWebmOrThrow } from "@/utils/videoTranscodeUtils";

type PreparedImagePayload = {
  processedFile: File;
  isGif: boolean;
};

function resolveChatroomImageUrlQuality(quality: MediaQuality): MediaQuality {
  if (quality === "low" || quality === "high") {
    return quality;
  }
  return "medium";
}

export type UploadedDualImageResult = {
  fileId: number;
  mediaType: MediaType;
  originalSize: number;
  originalUrl: string;
  url: string;
};

export type UploadedMediaAssetResult = {
  fileId: number;
  fileName: string;
  mediaType: MediaType;
  originalUrl: string;
  size: number;
  uploadRequired: boolean;
  url: string;
};

export class UploadUtils {
  private static readonly imagePrepareCache = new WeakMap<File, Map<string, Promise<PreparedImagePayload>>>();
  private static readonly videoPrepareCache = new WeakMap<File, Promise<File>>();
  private static readonly audioPrepareCache = new WeakMap<File, Map<string, Promise<File>>>();
  private static readonly defaultEnableBrowserVideoTranscode = true;

  private static resolvePresetQuality(preset: ImageCompressionPreset): MediaQuality {
    return BUSINESS_MEDIA_QUALITY[preset]?.quality ?? "medium";
  }

  private async uploadMediaAsset(
    file: File,
    scene: 1 | 2 | 3 | 4 = 1,
    quality: MediaQuality = "medium",
  ): Promise<UploadedMediaAssetResult> {
    const uploaded = await uploadMediaFile(file, { scene });
    const sceneQuality = scene === 1
      ? (uploaded.mediaType === "image" ? "high" : "low")
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
            ? resolveChatroomImageUrlQuality(quality)
            : "low")
        : quality) || originalUrl,
    };
  }

  private async uploadPreparedMediaAsset(
    file: File,
    mediaType: MediaType,
    scene: 1 | 2 | 3 | 4 = 1,
    quality: MediaQuality = "medium",
  ): Promise<UploadedMediaAssetResult> {
    const filesByQuality: Partial<Record<MediaQuality, File>> = scene === 1
      ? { [quality]: file }
      : { original: file, low: file, medium: file };
    const uploaded = await uploadGeneratedMediaFiles({
      original: file,
      mediaType,
      hasNovelAiMetadata: false,
      metadata: {},
      filesByQuality,
    }, { scene });
    const sceneQuality = scene === 1
      ? (uploaded.mediaType === "image" ? "high" : "low")
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
            ? resolveChatroomImageUrlQuality(quality)
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

  private static buildImagePrepareKey(options: ImageCompressionOptions): string {
    return JSON.stringify(options);
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

  public async preprocessImageForUpload(
    file: File,
    options: ImageCompressionOptions = DEFAULT_IMAGE_COMPRESSION_OPTIONS,
  ): Promise<File> {
    const prepared = await this.prepareImageForUpload(file, options);
    return prepared.processedFile;
  }

  public async preprocessImageForUploadByPreset(
    file: File,
    preset: ImageCompressionPreset,
  ): Promise<File> {
    return await this.preprocessImageForUpload(file, IMAGE_COMPRESSION_PRESETS[preset]);
  }

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

  private async prepareImageForUpload(
    file: File,
    options: ImageCompressionOptions = DEFAULT_IMAGE_COMPRESSION_OPTIONS,
  ): Promise<PreparedImagePayload> {
    const normalizedFile = await normalizeFileMimeType(file, { expectedMediaType: "image" });
    const prepareKey = UploadUtils.buildImagePrepareKey(options);
    return await UploadUtils.getOrCreateNestedPromise(
      UploadUtils.imagePrepareCache,
      file,
      prepareKey,
      async () => {
        let processedFile = normalizedFile;
        const originalSize = normalizedFile.size;

        const isGif = await this.isGifFile(normalizedFile);
        if (normalizedFile.type.startsWith("image/")) {
          if (isGif) {
            console.warn(`[图片上传] GIF 文件跳过压缩: ${normalizedFile.name} (${(originalSize / 1024).toFixed(2)} KB)`);
            processedFile = normalizedFile;
          }
          else {
            processedFile = await compressImage(normalizedFile, options);
            const compressedSize = processedFile.size;
            const compressionRatio = Number.parseFloat(((1 - compressedSize / originalSize) * 100).toFixed(1));
            console.warn(
              `[图片上传] 压缩完成: ${normalizedFile.name}\n`
              + `  原始大小: ${(originalSize / 1024).toFixed(2)} KB\n`
              + `  压缩后: ${(compressedSize / 1024).toFixed(2)} KB\n`
              + `  压缩率: ${compressionRatio}% ${compressionRatio > 0 ? "✅" : "⚠️"}`,
            );
          }
        }

        return { processedFile, isGif };
      },
    );
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

  /**
   * 上传音频文件
   * @param file 音频文件
   * @param scene 上传场景 1.聊天室,2.表情包，3.角色差分 4.仓库图片（暂时使用场景1）
   * @param maxDuration 最大时长（秒），默认30秒
   */
  async uploadAudio(file: File, scene: 1 | 2 | 3 | 4 = 1, maxDuration = 30): Promise<string> {
    return (await this.uploadAudioAsset(file, scene, maxDuration)).url;
  }

  async uploadAudioAsset(file: File, scene: 1 | 2 | 3 | 4 = 1, maxDuration = 30): Promise<UploadedMediaAssetResult> {
    // 检查文件类型
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
  async uploadAudioOriginal(file: File, scene: 1 | 2 | 3 | 4 = 1): Promise<string> {
    return (await this.uploadAudioOriginalAsset(file, scene)).originalUrl;
  }

  async uploadAudioOriginalAsset(file: File, scene: 1 | 2 | 3 | 4 = 1): Promise<UploadedMediaAssetResult> {
    const normalizedInput = await normalizeFileMimeType(file, { expectedMediaType: "audio" });
    if (inferMediaTypeFromMimeType(normalizedInput.type) !== "audio") {
      throw new Error("只支持音频文件格式");
    }

    assertAudioUploadInputSizeOrThrow(normalizedInput.size);
    return await this.uploadMediaAsset(normalizedInput, scene, scene === 1 ? "low" : "original");
  }

  /**
   * 上传视频文件
   * - 优先转码为 webm（压缩体积与播放兼容性）
   * - 若浏览器 FFmpeg WASM 内存越界，则回退上传原视频（保留原音轨，不做无声回退）
   */
  async uploadVideo(
    file: File,
    scene: 1 | 2 | 3 | 4 = 1,
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
  async uploadFile(file: File, scene: 1 | 2 | 3 | 4 = 1): Promise<string> {
    return (await this.uploadFileAsset(file, scene)).originalUrl;
  }

  async uploadFileAsset(file: File, scene: 1 | 2 | 3 | 4 = 1): Promise<UploadedMediaAssetResult> {
    const normalizedFile = await normalizeFileMimeType(file);
    return await this.uploadMediaAsset(normalizedFile, scene, scene === 1 ? "low" : "original");
  }

  async uploadDualImage(
    file: File,
    scene: 1 | 2 | 3 | 4 = 1,
    _options: ImageCompressionOptions = DEFAULT_IMAGE_COMPRESSION_OPTIONS,
  ): Promise<UploadedDualImageResult> {
    const normalizedFile = await this.normalizeImageInputOrThrow(file);
    const originalSize = file.size;
    const uploaded = await this.uploadMediaAsset(normalizedFile, scene, "medium");
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
    scene: 1 | 2 | 3 | 4 = 1,
  ): Promise<UploadedDualImageResult> {
    const normalizedFile = await this.normalizeImageInputOrThrow(file);
    const originalSize = file.size;
    const uploaded = await this.uploadMediaAsset(normalizedFile, scene, UploadUtils.resolvePresetQuality(preset));
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
  async uploadOriginalImg(file: File, scene: 1 | 2 | 3 | 4 = 1): Promise<string> {
    const normalizedFile = await this.normalizeImageInputOrThrow(file);
    return (await this.uploadMediaAsset(normalizedFile, scene, scene === 1 ? "medium" : "original")).originalUrl;
  }

  /**
   * 上传图片
   * @param file img文件
   * @param scene 上传场景1.聊天室,2.表情包，3.角色差分 4.仓库图片
   * @param options 压缩配置，quality 使用 0~1 小数
   */
  async uploadImg(
    file: File,
    scene: 1 | 2 | 3 | 4 = 1,
    _options: ImageCompressionOptions = DEFAULT_IMAGE_COMPRESSION_OPTIONS,
  ): Promise<string> {
    const normalizedFile = await this.normalizeImageInputOrThrow(file);
    return (await this.uploadMediaAsset(normalizedFile, scene, "medium")).url;
  }

  async uploadImgByPreset(
    file: File,
    preset: ImageCompressionPreset,
    scene: 1 | 2 | 3 | 4 = 1,
  ): Promise<string> {
    const normalizedFile = await this.normalizeImageInputOrThrow(file);
    return (await this.uploadMediaAsset(normalizedFile, scene, UploadUtils.resolvePresetQuality(preset))).url;
  }

  /**
   * 精确检测文件是否为GIF格式
   * 通过读取文件头的魔术字节来判断，比MIME类型检测更准确
   * @param file 待检测的文件
   * @returns Promise<boolean> 是否为GIF文件
   */
  private async isGifFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer || arrayBuffer.byteLength < 6) {
          resolve(false);
          return;
        }

        const uint8Array = new Uint8Array(arrayBuffer, 0, 6);

        // GIF文件头魔术字节检测
        // GIF87a: 47 49 46 38 37 61
        // GIF89a: 47 49 46 38 39 61
        const isGif87a = uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46
          && uint8Array[3] === 0x38 && uint8Array[4] === 0x37 && uint8Array[5] === 0x61;

        const isGif89a = uint8Array[0] === 0x47 && uint8Array[1] === 0x49 && uint8Array[2] === 0x46
          && uint8Array[3] === 0x38 && uint8Array[4] === 0x39 && uint8Array[5] === 0x61;

        resolve(isGif87a || isGif89a);
      };

      reader.onerror = () => resolve(false);

      // 只读取前6个字节用于检测
      const blob = file.slice(0, 6);
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * 使用 ts-md5 计算文件的 MD5 哈希值。
   * 这个库是使用 TypeScript 编写的，所以不需要额外的类型定义文件。
   * @param file 文件对象
   * @returns 返回一个 Promise，解析为文件的 MD5 哈希字符串
   */
  public calculateFileHash(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result;
        if (!(result instanceof ArrayBuffer)) {
          reject(new Error("计算文件哈希失败"));
          return;
        }

        const hash = new Md5()
          .appendByteArray(new Uint8Array(result))
          .end();

        if (typeof hash !== "string" || hash.length === 0) {
          reject(new Error("计算文件哈希失败"));
          return;
        }

        resolve(hash);
      };

      reader.onerror = () => {
        reject(reader.error ?? new Error("读取文件失败"));
      };

      reader.onabort = () => {
        reject(new Error("读取文件已取消"));
      };

      reader.readAsArrayBuffer(file);
    });
  }
}

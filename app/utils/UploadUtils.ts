import { Md5 } from "ts-md5";

import { isAudioUploadDebugEnabled } from "@/utils/audioDebugFlags";
import { transcodeAudioFileToOpusOrThrow } from "@/utils/audioTranscodeUtils";
import { assertAudioUploadInputSizeOrThrow, buildDefaultAudioUploadTranscodeOptions } from "@/utils/audioUploadPolicy";
import { compressImage } from "@/utils/imgCompressUtils";
import { transcodeVideoFileToWebmOrThrow } from "@/utils/videoTranscodeUtils";

import { tuanchat } from "../../api/instance";

type PreparedImagePayload = {
  processedFile: File;
  isGif: boolean;
};

export class UploadUtils {
  private static readonly imagePrepareCache = new WeakMap<File, Map<string, Promise<PreparedImagePayload>>>();
  private static readonly videoPrepareCache = new WeakMap<File, Promise<File>>();
  private static readonly audioPrepareCache = new WeakMap<File, Map<string, Promise<File>>>();
  private static readonly devOssUploadProxyPath = "/api/oss-upload-proxy";
  private static readonly defaultEnableBrowserVideoTranscode = true;

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

  private static buildImagePrepareKey(quality: number, maxSize: number): string {
    return `${quality}|${maxSize}`;
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

  public async preprocessImageForUpload(file: File, quality = 0.7, maxSize = 2560): Promise<File> {
    const prepared = await this.prepareImageForUpload(file, quality, maxSize);
    return prepared.processedFile;
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

    if (file.type.startsWith("video/")) {
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

  private getVideoExtension(file: File): string {
    const type = (file.type || "").toLowerCase();
    if (type === "video/webm")
      return "webm";
    if (type === "video/mp4")
      return "mp4";
    if (type === "video/quicktime")
      return "mov";
    if (type === "video/x-matroska")
      return "mkv";
    if (type === "video/x-msvideo")
      return "avi";
    if (type === "video/x-ms-wmv")
      return "wmv";
    if (type === "video/x-flv")
      return "flv";
    if (type === "video/mpeg")
      return "mpeg";

    const match = (file.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    if (match?.[1])
      return match[1];

    return "mp4";
  }

  private async prepareImageForUpload(file: File, quality = 0.7, maxSize = 2560): Promise<PreparedImagePayload> {
    const prepareKey = UploadUtils.buildImagePrepareKey(quality, maxSize);
    return await UploadUtils.getOrCreateNestedPromise(
      UploadUtils.imagePrepareCache,
      file,
      prepareKey,
      async () => {
        let processedFile = file;
        const originalSize = file.size;

        const isGif = await this.isGifFile(file);
        if (file.type.startsWith("image/")) {
          if (isGif) {
            console.warn(`[图片上传] GIF 文件跳过压缩: ${file.name} (${(originalSize / 1024).toFixed(2)} KB)`);
            processedFile = file;
          }
          else {
            processedFile = await compressImage(file, quality, maxSize);
            const compressedSize = processedFile.size;
            const compressionRatio = Number.parseFloat(((1 - compressedSize / originalSize) * 100).toFixed(1));
            console.warn(
              `[图片上传] 压缩完成: ${file.name}\n`
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
      const normalizedVideoFile = this.normalizeVideoInputFileOrThrow(file);
      // 小体积常见格式优先直传，避免浏览器 ffmpeg.wasm 内存峰值导致 OOM。
      if (this.shouldBypassVideoTranscode(normalizedVideoFile)) {
        return normalizedVideoFile;
      }
      return await transcodeVideoFileToWebmOrThrow(normalizedVideoFile, {
        maxHeight: 1080,
        maxFps: 30,
        crf: 34,
      });
    });
  }

  private async prepareAudioForUpload(file: File, maxDuration = 30): Promise<File> {
    if (!file.type.startsWith("audio/")) {
      throw new Error("只支持音频文件格式");
    }

    assertAudioUploadInputSizeOrThrow(file.size);
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
            name: file.name,
            type: file.type,
            size: file.size,
            maxDuration: normalizedMaxDuration > 0 ? normalizedMaxDuration : null,
          });
        }

        const transcodeOptions = buildDefaultAudioUploadTranscodeOptions(file.size, normalizedMaxDuration);
        const processedFile = await transcodeAudioFileToOpusOrThrow(file, transcodeOptions);
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

  private getAudioExtension(file: File): string {
    const type = (file.type || "").toLowerCase();
    if (type === "audio/mpeg")
      return "mp3";
    if (type === "audio/wav" || type === "audio/x-wav")
      return "wav";
    if (type === "audio/mp4")
      return "m4a";
    if (type === "audio/aac")
      return "aac";
    if (type === "audio/ogg")
      return "ogg";
    if (type === "audio/webm")
      return "webm";

    const match = (file.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    if (match?.[1])
      return match[1];

    return "audio";
  }

  /**
   * 上传音频文件
   * @param file 音频文件
   * @param scene 上传场景 1.聊天室,2.表情包，3.角色差分 4.仓库图片（暂时使用场景1）
   * @param maxDuration 最大时长（秒），默认30秒
   */
  async uploadAudio(file: File, scene: 1 | 2 | 3 | 4 = 1, maxDuration = 30): Promise<string> {
    // 检查文件类型
    if (!file.type.startsWith("audio/")) {
      throw new Error("只支持音频文件格式");
    }

    const debugEnabled = isAudioUploadDebugEnabled();
    const debugPrefix = "[tc-audio-upload]";
    const processedFile = await this.prepareAudioForUpload(file, maxDuration);
    if (debugEnabled) {
      console.warn(`${debugPrefix} upload prepared file`, {
        scene,
        input: { name: file.name, size: file.size, type: file.type },
        prepared: { name: processedFile.name, size: processedFile.size, type: processedFile.type },
      });
    }

    // 1. 计算文件内容的哈希值
    const hash = await this.calculateFileHash(processedFile);

    // 2. 获取文件大小
    const fileSize = processedFile.size;

    // 3. 构造新的唯一文件名：hash_size.webm（WebM 容器 + Opus 编码）
    const newFileName = `${hash}_${fileSize}.webm`;

    if (debugEnabled)
      console.warn(`${debugPrefix} oss`, { fileName: newFileName });

    const ossData = await tuanchat.ossController.getUploadUrl({
      fileName: newFileName,
      scene,
      dedupCheck: true,
    });

    if (!ossData.data?.downloadUrl) {
      throw new Error("获取下载地址失败");
    }
    if (debugEnabled)
      console.warn(`${debugPrefix} uploadUrl`, ossData.data.uploadUrl);

    if (ossData.data.uploadUrl) {
      await this.executeUpload(ossData.data.uploadUrl, processedFile);
    }
    else if (debugEnabled) {
      console.warn(`${debugPrefix} dedup hit: skip upload`, { fileName: newFileName });
    }

    if (debugEnabled)
      console.warn(`${debugPrefix} downloadUrl`, ossData.data.downloadUrl);

    if (debugEnabled) {
      const url = ossData.data.downloadUrl;
      if (!/\.webm(?:\?|#|$)/i.test(url)) {
        console.warn(`${debugPrefix} unexpected downloadUrl extension (expect .webm)`, { url, fileName: newFileName });
      }
    }
    return ossData.data.downloadUrl;
  }

  /**
   * 上传原始音频文件（不做 Opus 转码）
   * - 用于“语音参考文件”等不适合被统一转码的场景
   */
  async uploadAudioOriginal(file: File, scene: 1 | 2 | 3 | 4 = 1): Promise<string> {
    if (!file.type.startsWith("audio/")) {
      throw new Error("只支持音频文件格式");
    }

    assertAudioUploadInputSizeOrThrow(file.size);

    const hash = await this.calculateFileHash(file);
    const fileSize = file.size;
    const extension = this.getAudioExtension(file);
    const newFileName = `${hash}_${fileSize}.${extension}`;

    const ossData = await tuanchat.ossController.getUploadUrl({
      fileName: newFileName,
      scene,
      dedupCheck: true,
    });

    if (!ossData.data?.downloadUrl) {
      throw new Error("获取下载地址失败");
    }

    if (ossData.data.uploadUrl) {
      await this.executeUpload(ossData.data.uploadUrl, file);
    }

    return ossData.data.downloadUrl;
  }

  /**
   * 上传视频文件
   * - 优先转码为 webm（压缩体积与播放兼容性）
   * - 若浏览器 FFmpeg WASM 内存越界，则回退上传原视频（保留原音轨，不做无声回退）
   */
  async uploadVideo(
    file: File,
    scene: 1 | 2 | 3 | 4 = 1,
  ): Promise<{ url: string; fileName: string; size: number }> {
    const normalizedVideoFile = this.normalizeVideoInputFileOrThrow(file);

    let uploadCandidate = normalizedVideoFile;
    try {
      uploadCandidate = await this.prepareVideoForUpload(file);
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

    const hash = await this.calculateFileHash(uploadCandidate);
    const fileSize = uploadCandidate.size;
    const extension = this.getVideoExtension(uploadCandidate);
    const newFileName = `${hash}_${fileSize}.${extension}`;

    const ossData = await tuanchat.ossController.getUploadUrl({
      fileName: newFileName,
      scene,
      dedupCheck: true,
    });

    if (!ossData.data?.downloadUrl) {
      throw new Error("获取下载地址失败");
    }

    if (ossData.data.uploadUrl) {
      await this.executeUpload(ossData.data.uploadUrl, uploadCandidate);
    }

    return {
      url: ossData.data.downloadUrl,
      fileName: uploadCandidate.name,
      size: fileSize,
    };
  }

  /**
   * 上传通用文件（用于聊天文件消息）
   */
  async uploadFile(file: File, scene: 1 | 2 | 3 | 4 = 1): Promise<string> {
    const hash = await this.calculateFileHash(file);
    const fileSize = file.size;
    const extensionMatch = (file.name || "").toLowerCase().match(/\.([a-z0-9]+)$/);
    const extension = extensionMatch?.[1] || "bin";
    const newFileName = `${hash}_${fileSize}.${extension}`;

    const ossData = await tuanchat.ossController.getUploadUrl({
      fileName: newFileName,
      scene,
      dedupCheck: true,
    });

    if (!ossData.data?.downloadUrl) {
      throw new Error("获取下载地址失败");
    }

    if (ossData.data.uploadUrl) {
      await this.executeUpload(ossData.data.uploadUrl, file);
    }

    return ossData.data.downloadUrl;
  }

  /**
   * 上传图片
   * @param file img文件
   * @param scene 上传场景1.聊天室,2.表情包，3.角色差分 4.仓库图片
   * @param quality 质量
   * @param maxSize 最大的宽高（px）
   */
  async uploadImg(file: File, scene: 1 | 2 | 3 | 4 = 1, quality = 0.7, maxSize = 2560): Promise<string> {
    const { processedFile: new_file, isGif } = await this.prepareImageForUpload(file, quality, maxSize);

    // 1. 计算文件内容的 SHA-256 哈希值
    const hash = await this.calculateFileHash(new_file);

    // 2. 获取文件大小
    const fileSize = new_file.size;

    // 3. 获取文件扩展名（以实际上传文件类型为准，避免压缩回退后扩展名不一致）
    const extension = (() => {
      if (isGif) {
        return "gif";
      }

      if (new_file.type === "image/webp") {
        return "webp";
      }

      if (new_file.type === "image/jpeg") {
        return "jpg";
      }

      if (new_file.type.startsWith("image/")) {
        const subType = new_file.type.split("/")[1];
        return subType || "img";
      }

      return "img";
    })();

    // 4. 构造新的唯一文件名：hash_size.extension
    const newFileName = `${hash}_${fileSize}.${extension}`;

    const ossData = await tuanchat.ossController.getUploadUrl({
      fileName: newFileName,
      scene,
    });

    if (!ossData.data?.uploadUrl) {
      throw new Error("获取上传地址失败");
    }

    await this.executeUpload(ossData.data.uploadUrl, new_file);

    if (!ossData.data.downloadUrl) {
      throw new Error("获取下载地址失败");
    }
    return ossData.data.downloadUrl;
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
    return new Promise((resolve) => {
      const reader = new FileReader();

      // 文件读取成功时的回调
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          const hash = new Md5()
            .appendStr(e.target.result as string) // Use appendStr for string result
            .end();
          if (hash) {
            resolve(hash as string);
          }
        }
      };

      // 以字符串形式读取文件以配合 appendStr
      reader.readAsBinaryString(file);
    });
  }

  private resolveUploadTarget(url: string, file: File): {
    targetUrl: string;
    headers?: Record<string, string>;
    viaDevProxy: boolean;
  } {
    const directHeaders = file.type ? { "Content-Type": file.type } : undefined;
    if (!import.meta.env.DEV || typeof window === "undefined") {
      return {
        targetUrl: url,
        headers: directHeaders,
        viaDevProxy: false,
      };
    }

    try {
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin) {
        return {
          targetUrl: url,
          headers: directHeaders,
          viaDevProxy: false,
        };
      }
    }
    catch {
      return {
        targetUrl: url,
        headers: directHeaders,
        viaDevProxy: false,
      };
    }

    return {
      targetUrl: UploadUtils.devOssUploadProxyPath,
      headers: {
        "X-TC-OSS-Upload-Url": encodeURIComponent(url),
        ...(file.type ? { "Content-Type": file.type } : {}),
      },
      viaDevProxy: true,
    };
  }

  private async uploadWithTimeout(url: string, file: File, headers?: Record<string, string>): Promise<Response> {
    const controller = new AbortController();
    const t = globalThis.setTimeout(() => controller.abort(), 120_000);

    try {
      return await fetch(url, {
        method: "PUT",
        body: file,
        signal: controller.signal,
        headers,
      });
    }
    finally {
      globalThis.clearTimeout(t);
    }
  }

  private async executeUpload(url: string, file: File): Promise<void> {
    const { targetUrl, headers, viaDevProxy } = this.resolveUploadTarget(url, file);
    const response = await this.uploadWithTimeout(targetUrl, file, headers);
    if (!response.ok) {
      if (response.status === 413) {
        const prefix = viaDevProxy ? "文件传输失败(开发代理)" : "文件传输失败";
        throw new Error(`${prefix}: 413（请求体过大）`);
      }
      if (viaDevProxy) {
        throw new Error(`文件传输失败(开发代理): ${response.status}`);
      }
      throw new Error(`文件传输失败: ${response.status}`);
    }
  }

  /**
   * 处理音频时长，如果超过最大时长则进行截断
   * @param file 音频文件
   * @param maxDuration 最大时长（秒）
   * @returns 处理后的音频文件
   */
  private async processAudioDuration(file: File, maxDuration: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);

      audio.onloadedmetadata = async () => {
        try {
          URL.revokeObjectURL(url);

          // 如果音频时长在限制内，直接返回原文件
          if (audio.duration <= maxDuration) {
            resolve(file);
            return;
          }

          // 音频时长超过限制，需要截断
          console.warn(`音频时长 ${audio.duration.toFixed(1)}s 超过限制 ${maxDuration}s，将进行截断`);

          // 使用 Web Audio API 进行音频截断
          const truncatedFile = await this.truncateAudio(file, maxDuration);
          resolve(truncatedFile);
        }
        catch (error) {
          reject(new Error(`音频处理失败: ${error instanceof Error ? error.message : "未知错误"}`));
        }
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("音频文件加载失败，请检查文件格式"));
      };

      audio.src = url;
    });
  }

  /**
   * 使用 Web Audio API 截断音频
   * @param file 原始音频文件
   * @param maxDuration 最大时长（秒）
   * @returns 截断后的音频文件
   */
  private async truncateAudio(file: File, maxDuration: number): Promise<File> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    try {
      // 读取音频文件为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // 解码音频数据
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // 计算需要截断的样本数
      const sampleRate = audioBuffer.sampleRate;
      const maxSamples = Math.floor(maxDuration * sampleRate);

      // 创建新的音频缓冲区
      const truncatedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        maxSamples,
        sampleRate,
      );

      // 复制音频数据到新缓冲区
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const originalData = audioBuffer.getChannelData(channel);
        const truncatedData = truncatedBuffer.getChannelData(channel);

        for (let i = 0; i < maxSamples; i++) {
          truncatedData[i] = originalData[i];
        }
      }

      // 将音频缓冲区转换为 WAV 文件
      const wavBlob = this.audioBufferToWav(truncatedBuffer);

      // 创建新的文件对象
      const originalName = file.name;
      const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
      const truncatedFileName = `${nameWithoutExt}_truncated.wav`;

      return new File([wavBlob], truncatedFileName, { type: "audio/wav" });
    }
    finally {
      await audioContext.close();
    }
  }

  /**
   * 将 AudioBuffer 转换为 WAV 格式的 Blob
   * @param buffer 音频缓冲区
   * @returns WAV 格式的 Blob
   */
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2; // 16-bit
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize; // WAV header + data

    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // WAV 文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    // 写入音频数据
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" });
  }
}

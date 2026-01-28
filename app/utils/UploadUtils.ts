import { Md5 } from "ts-md5";

import { isAudioUploadDebugEnabled } from "@/utils/audioDebugFlags";
import { transcodeAudioFileToOpusOrThrow } from "@/utils/audioTranscodeUtils";
import { compressImage } from "@/utils/imgCompressUtils";

import { tuanchat } from "../../api/instance";

export class UploadUtils {
  /**
   * 上传音频文件
   * @param file 音频文件
   * @param scene 上传场景 1.聊天室,2.表情包，3.角色差分 4.模组图片（暂时使用场景1）
   * @param maxDuration 最大时长（秒），默认30秒
   */
  async uploadAudio(file: File, scene: 1 | 2 | 3 | 4 = 1, maxDuration = 30): Promise<string> {
    // 检查文件类型
    if (!file.type.startsWith("audio/")) {
      throw new Error("只支持音频文件格式");
    }

    // 保护：避免超大文件导致浏览器内存/wasm 失败（转码需要把输入放入 wasm FS）
    const maxInputBytes = 30 * 1024 * 1024; // 30MB
    if (file.size > maxInputBytes) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      throw new Error(`音频文件过大（${mb}MB），已阻止上传（上限 30MB）`);
    }

    // 统一转码压缩为 Opus（不兼容 Safari）；失败则阻止上传
    const debugEnabled = isAudioUploadDebugEnabled();
    const debugPrefix = "[tc-audio-upload]";
    if (debugEnabled)
      console.warn(`${debugPrefix} UploadUtils.uploadAudio input`, { name: file.name, type: file.type, size: file.size, maxDuration, scene });

    const execTimeoutMs = maxDuration > 0
      ? Math.max(60_000, Math.min(240_000, Math.floor(maxDuration * 4_000)))
      : Math.max(120_000, Math.min(600_000, Math.floor((file.size / 1024 / 1024) * 20_000)));

    const processedFile = await transcodeAudioFileToOpusOrThrow(file, {
      maxDurationSec: maxDuration,
      loadTimeoutMs: 45_000,
      execTimeoutMs,
      // 目标：尽量比输入更小（否则按“阻止上传”策略处理）
      // 太小的文件可能被容器开销反噬，跳过严格约束避免误伤
      preferSmallerThanBytes: file.size >= 48 * 1024 ? file.size : undefined,
    });
    if (debugEnabled)
      console.warn(`${debugPrefix} processed`, { name: processedFile.name, type: processedFile.type, size: processedFile.size });

    // 1. 计算文件内容的哈希值
    const hash = await this.calculateFileHash(processedFile);

    // 2. 获取文件大小
    const fileSize = processedFile.size;

    // 3. 构造新的唯一文件名：hash_size.ogg（Ogg 容器 + Opus 编码）
    const newFileName = `${hash}_${fileSize}.ogg`;

    if (debugEnabled)
      console.warn(`${debugPrefix} oss`, { fileName: newFileName });

    const ossData = await tuanchat.ossController.getUploadUrl({
      fileName: newFileName,
      scene,
    });

    if (!ossData.data?.uploadUrl) {
      throw new Error("获取上传地址失败");
    }
    if (debugEnabled)
      console.warn(`${debugPrefix} uploadUrl`, ossData.data.uploadUrl);

    await this.executeUpload(ossData.data.uploadUrl, processedFile);

    if (!ossData.data.downloadUrl) {
      throw new Error("获取下载地址失败");
    }
    if (debugEnabled)
      console.warn(`${debugPrefix} downloadUrl`, ossData.data.downloadUrl);

    if (debugEnabled) {
      const url = ossData.data.downloadUrl;
      if (!/\.ogg(?:\?|#|$)/i.test(url)) {
        console.warn(`${debugPrefix} unexpected downloadUrl extension (expect .ogg)`, { url, fileName: newFileName });
      }
    }
    return ossData.data.downloadUrl;
  }

  /**
   * 上传图片
   * @param file img文件
   * @param scene 上传场景1.聊天室,2.表情包，3.角色差分 4.模组图片
   * @param quality 质量
   * @param maxSize 最大的宽高（px）
   */
  async uploadImg(file: File, scene: 1 | 2 | 3 | 4 = 1, quality = 0.7, maxSize = 2560): Promise<string> {
    let new_file = file;
    const originalSize = file.size;

    const isGif = await this.isGifFile(file);
    // 对于图片文件进行处理
    if (file.type.startsWith("image/")) {
      // 精确检测GIF文件，优先使用文件头检测
      if (isGif) {
        console.warn(`[图片上传] GIF 文件跳过压缩: ${file.name} (${(originalSize / 1024).toFixed(2)} KB)`);
        new_file = file;
      }
      else {
        // 其他图片格式进行压缩
        new_file = await compressImage(file, quality, maxSize);
        const compressedSize = new_file.size;
        const compressionRatio = Number.parseFloat(((1 - compressedSize / originalSize) * 100).toFixed(1));
        console.warn(
          `[图片上传] 压缩完成: ${file.name}\n`
          + `  原始大小: ${(originalSize / 1024).toFixed(2)} KB\n`
          + `  压缩后: ${(compressedSize / 1024).toFixed(2)} KB\n`
          + `  压缩率: ${compressionRatio}% ${compressionRatio > 0 ? "✅" : "⚠️"}`,
        );
      }
    }

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

  private async executeUpload(url: string, file: File): Promise<void> {
    const controller = new AbortController();
    const t = globalThis.setTimeout(() => controller.abort(), 120_000);

    let response: Response;
    try {
      response = await fetch(url, {
        method: "PUT",
        body: file,
        signal: controller.signal,
        headers: {
          "Content-Type": file.type,
          "x-oss-acl": "public-read",
        },
      });
    }
    finally {
      globalThis.clearTimeout(t);
    }

    if (!response.ok) {
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

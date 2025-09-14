import { Md5 } from "ts-md5";

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

    // 检查并截断音频时长
    const processedFile = await this.processAudioDuration(file, maxDuration);

    // 1. 计算文件内容的哈希值
    const hash = await this.calculateFileHash(processedFile);

    // 2. 获取文件大小
    const fileSize = processedFile.size;

    // 3. 安全地获取文件扩展名
    const extension = processedFile.name.split(".").pop() || "wav"; // 音频默认使用 wav

    // 4. 构造新的唯一文件名：hash_size.extension
    const newFileName = `${hash}_${fileSize}.${extension}`;

    const ossData = await tuanchat.ossController.getUploadUrl({
      fileName: newFileName,
      scene,
    });

    if (!ossData.data?.uploadUrl) {
      throw new Error("获取上传地址失败");
    }

    await this.executeUpload(ossData.data.uploadUrl, processedFile);

    if (!ossData.data.downloadUrl) {
      throw new Error("获取下载地址失败");
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
    if (file.type.startsWith("image/")) {
      new_file = await compressImage(file, quality, maxSize);
    }

    // 1. 计算文件内容的 SHA-256 哈希值
    const hash = await this.calculateFileHash(new_file);

    // 2. 获取文件大小
    const fileSize = new_file.size;

    // 3. 安全地获取文件扩展名
    const extension = new_file.name.split(".").pop() || "bin"; // 使用 'bin' 作为无扩展名时的备用

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
   * 使用 ts-md5 计算文件的 MD5 哈希值。
   * 这个库是使用 TypeScript 编写的，所以不需要额外的类型定义文件。
   * @param file 文件对象
   * @returns 返回一个 Promise，解析为文件的 MD5 哈希字符串
   */
  private calculateFileHash(file: File): Promise<string> {
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
    const response = await fetch(url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
        "x-oss-acl": "public-read",
      },
    });

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

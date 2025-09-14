import type { InferRequest } from "@/tts/apis";

import { createTTSApi } from "@/tts/apis";
import { checkGameExist, terreApis } from "@/webGAL/index";

import type { ChatMessageResponse, RoleAvatar } from "../../api";

import { getAsyncMsg, uploadFile } from "./fileOperator";

// 创建 TTS API 实例，从环境变量获取 URL
const TTS_API_URL = import.meta.env.VITE_TTS_API_URL || "http://localhost:9000";
export const ttsApi = createTTSApi(TTS_API_URL);

type Game = {
  name: string;
  description: string;
};

type RendererContext = {
  lineNumber: number;
  text: string;
};

export class SceneEditor {
  private game: Game = {
    name: "Default Game",
    description: "This is a default game",
  };

  // scene to rendererContext
  private rendererContexts: Map<string, RendererContext> = new Map<string, RendererContext>();

  private syncSocket: WebSocket;

  constructor(spaceId: number) {
    this.game = {
      name: ` preview_${spaceId}`,
      description: `This is game preview of ${spaceId}`,
    };
    this.syncSocket = new WebSocket(import.meta.env.VITE_TERRE_WS);
  }

  // 创建webgal实例
  public async initRender(): Promise<void> {
    if (await checkGameExist(this.game.name)) {
      return;
    }
    await terreApis.manageGameControllerCreateGame({
      gameDir: this.game.name,
      gameName: this.game.name,
      templateDir: "WebGAL Black",
    });
  }

  /**
   * webgal的编辑器中，x轴的宽度为2560，y轴的宽度为1440
   * rotation的单位居然是弧度制！真他妈的反人类啊！
   */
  private roleAvatarToTransformString(avatar: RoleAvatar): string {
    // Convert angle to radians (avatar.spriteRotation is in degrees)
    const rotationRad = avatar.spriteRotation
      ? (avatar.spriteRotation * Math.PI / 180)
      : 0;

    // Create the transform object
    const transform = {
      position: {
        x: avatar.spriteXPosition ?? 0,
        y: avatar.spriteYPosition ?? 0,
      },
      scale: {
        x: avatar.spriteScale ?? 1,
        y: avatar.spriteScale ?? 1,
      },
      alpha: avatar.spriteTransparency ?? 1,
      rotation: rotationRad,
    };

    // Convert to JSON string
    return `-transform=${JSON.stringify(transform)}`;
  }

  /**
   * 添加一段对话到webgal中
   * @param roleName 角色名
   * @param avatar
   * @param text 文本
   * @param sceneName
   * @param leftSpriteName 左边立绘的文件名，如果设置为 空字符串，那么会取消这个位置立绘的显示。设置为undefined，则对这个位置的立绘不做任何改变
   * @param rightSpriteName 右边立绘的文件名，规则同上
   * @param vocal 语音文件名
   */
  public async addDialog(
    roleName: string,
    avatar: RoleAvatar | undefined,
    text: string,
    sceneName: string,
    leftSpriteName?: string | undefined,
    rightSpriteName?: string | undefined,
    vocal?: string | undefined,
  ): Promise<void> {
    const transform = avatar ? this.roleAvatarToTransformString(avatar) : "";
    if (leftSpriteName) {
      await this.addLineToRenderer(
        `changeFigure:${leftSpriteName.length > 0 ? `${leftSpriteName}` : ""} -left ${transform} -next;`,
        sceneName,
      );
    }
    if (rightSpriteName) {
      await this.addLineToRenderer(
        `changeFigure:${rightSpriteName.length > 0 ? `${rightSpriteName}` : ""} -right ${transform} -next;`,
        sceneName,
      );
    }
    await this.addLineToRenderer(
      `${roleName}: ${text} ${vocal ? `-${vocal}` : ""}`,
      sceneName,
    );
  }

  public asyncRender(scene: string): void {
    const msg = getAsyncMsg(`${scene}.txt`, this.rendererContexts.get(scene)?.lineNumber ?? 0);
    this.syncSocket.send(JSON.stringify(msg));
  }

  public async uploadSprites(url: string, spritesName: string): Promise<string> {
    const path = `games/${this.game.name}/game/figure/`;
    // 提取URL中的文件后缀
    const fileExtension = url.split(".").pop() || "webp";
    return uploadFile(url, path, `${spritesName}.${fileExtension}`);
  }

  // 上传背景图片，直接使用url当作fileName
  public async uploadBackground(url: string): Promise<string> {
    const path = `games/${this.game.name}/game/background/`;
    return await uploadFile(url, path);
  }

  public async addLineToRenderer(line: string, sceneName: string): Promise<void> {
    if (!line.trim())
      return; // 跳过空消息

    if (!this.rendererContexts.get(sceneName)) {
      this.rendererContexts.set(sceneName, {
        lineNumber: 0,
        text: "",
      });
    }
    const renderContext = this.rendererContexts.get(sceneName)!;
    renderContext.text = renderContext.text
      ? `${renderContext!.text}\n${line}`
      : line;

    renderContext!.lineNumber += 1;

    await editScene(this.game.name, sceneName, renderContext.text);
  }

  // 简单的字符串哈希函数
  private simpleHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash * 33) ^ char;
    }
    // 转换为无符号32位整数，并转为16位十六进制
    return (hash >>> 0).toString(16).padStart(8, "0")
      + ((hash * 0x811C9DC5) >>> 0).toString(16).padStart(8, "0");
  }

  /**
   * 生成语音 - 基于新的 TTS API
   * @param message 聊天消息
   * @param refVocal 参考音频文件
   * @param options TTS 生成选项
   * @returns Promise<{ success: boolean; fileName?: string; audioBase64?: string; error?: string }>
   */
  public async generateVocal(
    message: ChatMessageResponse,
    refVocal: File,
    options: {
      emotionMode?: number;
      emotionWeight?: number;
      emotionText?: string;
      emotionVector?: number[];
      temperature?: number;
      topP?: number;
      maxTokensPerSegment?: number;
    } = {},
  ): Promise<{ success: boolean; fileName?: string; audioBase64?: string; error?: string }> {
    const text = message.message.content;
    const {
      emotionMode = 0, // 默认与音色参考音频相同
      emotionWeight = 0.8,
      emotionText,
      emotionVector,
      temperature = 0.8,
      topP = 0.8,
      maxTokensPerSegment = 120,
    } = options;

    // 使用hash作为文件名
    const identifyString = `tts_${text}_${refVocal.name}_${emotionMode}`;
    const hash = this.simpleHash(identifyString);
    const fileName = `${hash}.wav`;

    try {
      // 将文件转换为 base64
      const refAudioBase64 = await this.fileToBase64(refVocal);

      // 创建 TTS 请求
      const ttsRequest: InferRequest = {
        text,
        prompt_audio_base64: refAudioBase64,
        emo_mode: emotionMode,
        emo_weight: emotionWeight,
        emo_text: emotionText,
        emo_vector: emotionVector,
        emo_random: false,
        temperature,
        top_p: topP,
        max_text_tokens_per_segment: maxTokensPerSegment,
        return_audio_base64: true, // 返回 base64 编码的音频
      };

      // 调用 TTS API
      const response = await ttsApi.infer(ttsRequest);

      if (response.code === 0 && response.data?.audio_base64) {
        return {
          success: true,
          fileName,
          audioBase64: response.data.audio_base64,
        };
      }
      else {
        return {
          success: false,
          error: response.msg || "TTS 生成失败",
        };
      }
    }
    catch (error) {
      console.error("语音生成失败:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 将文件转换为 base64 格式
   * @param file 文件对象
   * @returns Promise<string> base64 字符串
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // 移除 data URL 前缀，只保留 base64 部分
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 将 base64 音频上传到 WebGAL
   * @param audioBase64 base64 编码的音频
   * @param fileName 文件名
   * @returns Promise<string | undefined> 成功返回文件名
   */
  private async uploadAudioToWebGAL(audioBase64: string, fileName: string): Promise<string | undefined> {
    try {
      // 将 base64 转换为 Blob
      const byteCharacters = atob(audioBase64);
      const byteNumbers = Array.from({ length: byteCharacters.length }, (_, i) => byteCharacters.charCodeAt(i));
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: "audio/wav" });

      // 创建临时 URL
      const audioUrl = URL.createObjectURL(audioBlob);

      try {
        // 上传到 WebGAL
        const uploadedFileName = await uploadFile(
          audioUrl,
          `games/${this.game.name}/game/vocal/`,
          fileName,
        );

        // 清理临时 URL
        URL.revokeObjectURL(audioUrl);
        return uploadedFileName;
      }
      catch (uploadError) {
        console.error("音频文件上传到 WebGAL 失败:", uploadError);
        URL.revokeObjectURL(audioUrl);
        return undefined;
      }
    }
    catch (error) {
      console.error("音频文件处理失败:", error);
      return undefined;
    }
  }

  /**
   * 上传语音文件
   * @param message
   * @param refVocal
   * @param options 生成选项
   */
  public async uploadVocal(
    message: ChatMessageResponse,
    refVocal?: File,
    options: {
      emotionMode?: number;
      emotionWeight?: number;
      emotionText?: string;
      emotionVector?: number[];
    } = {},
  ): Promise<string | undefined> {
    const text = message.message.content;

    // 使用hash作为文件名, 用于避免重复生成语音
    const identifyString = `tts_${text}_${refVocal?.name || "default"}_${options.emotionMode || 0}_${refVocal?.name}`;
    const hash = this.simpleHash(identifyString);
    const fileName = `${hash}.wav`;

    if (!refVocal)
      return;

    // 检查文件是否已存在
    // if (await checkFileExist(`games/${this.game.name}/game/vocal/`, fileName)) {
    //   return fileName;
    // }

    try {
      // 生成语音
      const result = await this.generateVocal(message, refVocal, options);

      if (result.success && result.audioBase64) {
        // 上传到 WebGAL
        const uploadedFileName = await this.uploadAudioToWebGAL(result.audioBase64, fileName);

        if (uploadedFileName) {
          console.log("语音生成并上传完成，文件名:", uploadedFileName);
          return uploadedFileName;
        }
        else {
          console.error("语音文件上传失败");
          return undefined;
        }
      }
      else {
        console.error("语音生成失败:", result.error);
        return undefined;
      }
    }
    catch (error) {
      console.error("语音生成过程中发生错误:", error);
      return undefined;
    }
  }
}

export async function editScene(game: string, scene: string, content: string) {
  const path = `games/${game}/game/scene/${scene}.txt`;
  await terreApis.manageGameControllerEditTextFile({ path, textFile: content });
}

/**
 * 生成语音的简化接口，基于新的 TTS API
 * @param text 要生成语音的文本
 * @param refVocal 参考音频文件
 * @param options 生成选项
 * @returns Promise<{ success: boolean; audioUrl?: string; error?: string }>
 */
export async function generateSpeechSimple(
  text: string,
  refVocal: File,
  options: {
    emotionMode?: number;
    emotionWeight?: number;
    emotionText?: string;
    emotionVector?: number[];
    maxTokensPerSegment?: number;
  } = {},
): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
  const {
    emotionMode = 0, // 默认与音色参考音频相同
    emotionWeight = 0.8,
    emotionText,
    emotionVector,
    maxTokensPerSegment = 120,
  } = options;

  try {
    // 将文件转换为 base64
    const refAudioBase64 = await fileToBase64(refVocal);

    // 创建 TTS 请求
    const ttsRequest: InferRequest = {
      text,
      prompt_audio_base64: refAudioBase64,
      emo_mode: emotionMode,
      emo_weight: emotionWeight,
      emo_text: emotionText,
      emo_vector: emotionVector,
      emo_random: false,
      temperature: 0.8,
      top_p: 0.8,
      max_text_tokens_per_segment: maxTokensPerSegment,
      return_audio_base64: true,
    };

    // 调用 TTS API
    const response = await ttsApi.infer(ttsRequest);

    if (response.code === 0 && response.data?.audio_base64) {
      // 将 base64 转换为 Blob URL
      const audioUrl = base64ToAudioUrl(response.data.audio_base64);
      return { success: true, audioUrl };
    }
    else {
      return { success: false, error: response.msg || "TTS 生成失败" };
    }
  }
  catch (error) {
    console.error("生成语音失败:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "未知错误",
    };
  }
}

/**
 * 将文件转换为 base64 格式
 * @param file 文件对象
 * @returns Promise<string> base64 字符串
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data URL 前缀，只保留 base64 部分
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 将 base64 音频转换为可播放的 URL
 * @param base64 base64 编码的音频
 * @param mimeType MIME 类型
 * @returns 音频 URL
 */
function base64ToAudioUrl(base64: string, mimeType: string = "audio/wav"): string {
  const byteCharacters = atob(base64);
  const byteNumbers = Array.from({ length: byteCharacters.length }, (_, i) => byteCharacters.charCodeAt(i));
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return URL.createObjectURL(blob);
}

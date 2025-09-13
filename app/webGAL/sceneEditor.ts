import { sleep } from "ahooks/es/utils/testingHelpers";

import type { GenerationParams, TTSRequest } from "@/tts";

import { createDefaultGenerationParams, EmoControlMethod, ttsApi } from "@/tts";
import { checkGameExist, terreApis } from "@/webGAL/index";

import type { ChatMessageResponse, RoleAvatar } from "../../api";

import { checkFileExist, getAsyncMsg, uploadFile } from "./fileOperator";

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
   * 异步生成语音 - 基于新的 TTS API
   * @param message 聊天消息
   * @param refVocal 参考音频文件
   * @param options TTS 生成选项
   * @returns Promise<{ success: boolean; fileName?: string; jobId?: string; error?: string }>
   */
  public async generateVocalAsync(
    message: ChatMessageResponse,
    refVocal: File,
    options: {
      emotionControl?: EmoControlMethod;
      emotionWeight?: number;
      emotionText?: string;
      generationParams?: Partial<GenerationParams>;
      maxTokensPerSegment?: number;
    } = {},
  ): Promise<{ success: boolean; fileName?: string; jobId?: string; error?: string }> {
    const text = message.message.content;
    const {
      emotionControl = EmoControlMethod.REFERENCE,
      emotionWeight = 0.8,
      emotionText,
      generationParams = {},
      maxTokensPerSegment = 120,
    } = options;

    // 使用hash作为文件名
    const identifyString = `tts_${text}_${refVocal.name}_${emotionControl}_async`;
    const hash = this.simpleHash(identifyString);
    const fileName = `${hash}.wav`;

    try {
      // 1. 上传参考音频
      const uploadResult = await ttsApi.uploadFile(refVocal);
      if (!uploadResult.fileId) {
        return { success: false, error: "参考音频上传失败" };
      }

      // 2. 创建异步 TTS 请求
      const ttsRequest: TTSRequest = {
        promptFileId: uploadResult.fileId,
        text,
        emoControlMethod: emotionControl,
        emoWeight: emotionWeight,
        emoText: emotionText,
        emoRandom: false,
        generation: { ...createDefaultGenerationParams(), ...generationParams },
        maxTextTokensPerSegment: maxTokensPerSegment,
        async_mode: true, // 异步模式
      };

      // 3. 创建 TTS 任务
      const response = await ttsApi.createTTS(ttsRequest);

      if (typeof response === "object" && "jobId" in response) {
        return {
          success: true,
          jobId: response.jobId,
          fileName, // 预期的文件名
        };
      }
      else {
        return { success: false, error: "创建 TTS 任务失败，未收到 jobId" };
      }
    }
    catch (error) {
      console.error("异步语音生成失败:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "未知错误",
      };
    }
  }

  /**
   * 检查并下载异步生成的语音文件
   * @param jobId TTS 任务 ID
   * @param expectedFileName 期望的文件名
   * @returns Promise<string | undefined> 成功返回文件名，失败返回 undefined
   */
  public async downloadAsyncVocal(jobId: string, expectedFileName: string): Promise<string | undefined> {
    try {
      // 1. 检查任务状态
      const status = await ttsApi.getTTSStatus(jobId);

      if (status.status !== "succeeded") {
        console.log(`TTS 任务 ${jobId} 状态: ${status.status}, 进度: ${status.progress}%`);
        return undefined;
      }

      if (!status.audioUrl) {
        console.error(`TTS 任务 ${jobId} 已完成但没有音频 URL`);
        return undefined;
      }

      // 2. 下载音频文件
      const audioBlob = await ttsApi.downloadFile(status.audioUrl.split("/").pop()!);
      const audioUrl = URL.createObjectURL(audioBlob);

      try {
        // 3. 上传到 WebGAL
        const uploadedFileName = await uploadFile(
          audioUrl,
          `games/${this.game.name}/game/vocal/`,
          expectedFileName,
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
      console.error(`检查异步语音任务 ${jobId} 失败:`, error);
      return undefined;
    }
  }

  /**
   * 上传语音文件
   * @param message
   * @param refVocal
   */
  public async uploadVocal(message: ChatMessageResponse, refVocal?: File): Promise<string | undefined> {
    const text = message.message.content;

    // 使用hash作为文件名, 用于避免重复生成语音
    const identifyString = `tts_${text}_${refVocal?.name || "default"}`;
    const hash = this.simpleHash(identifyString);
    const fileName = `${hash}.wav`;

    if (!refVocal)
      return;

    // 检查文件是否已存在
    if (await checkFileExist(`games/${this.game.name}/game/vocal/`, fileName)) {
      return fileName;
    }
    const result = await this.generateVocalAsync(message, refVocal);
    if (result.success && result.jobId) {
      console.log("异步任务已创建，任务ID:", result.jobId);
      console.log("预期文件名:", result.fileName);

      // 一段语音最多等5分钟
      for (let i = 0; i < 150; i++) {
        const fileName = await this.downloadAsyncVocal(result.jobId!, result.fileName!);
        if (fileName) {
          console.log("异步语音生成完成，文件名:", fileName);
          return fileName;
        }
        await sleep(2000);
      }
    }
    else {
      console.error("异步任务创建失败:", result.error);
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
    emotionControl?: EmoControlMethod;
    maxTokensPerSegment?: number;
  } = {},
): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
  const {
    emotionControl = EmoControlMethod.NONE,
    maxTokensPerSegment = 120,
  } = options;

  try {
    // 1. 上传参考音频
    const uploadResult = await ttsApi.uploadFile(refVocal);
    if (!uploadResult.fileId) {
      return { success: false, error: "参考音频上传失败" };
    }

    // 2. 创建 TTS 请求（同步模式）
    const ttsRequest: TTSRequest = {
      promptFileId: uploadResult.fileId,
      text,
      emoControlMethod: emotionControl,
      emoWeight: 0.8,
      emoRandom: false,
      generation: createDefaultGenerationParams(),
      maxTextTokensPerSegment: maxTokensPerSegment,
      async_mode: false, // 同步模式
    };

    // 3. 生成语音
    const response = await ttsApi.createTTS(ttsRequest);

    if (response instanceof Blob) {
      const audioUrl = URL.createObjectURL(response);
      return { success: true, audioUrl };
    }
    else {
      return { success: false, error: "TTS API 返回格式异常" };
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

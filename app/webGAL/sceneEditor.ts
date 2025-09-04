import { checkGameExist, terreApis } from "@/webGAL/index";

import type { ChatMessageResponse, RoleAvatar } from "../../api";

import { tuanchat } from "../../api/instance";
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
      ? (Number.parseFloat(avatar.spriteRotation) * Math.PI / 180)
      : 0;

    // Create the transform object
    const transform = {
      position: {
        x: avatar.spriteXPosition ? Number.parseFloat(avatar.spriteXPosition) : 0,
        y: avatar.spriteYPosition ? Number.parseFloat(avatar.spriteYPosition) : 0,
      },
      scale: {
        x: avatar.spriteScale ? Number.parseFloat(avatar.spriteScale) : 1,
        y: avatar.spriteScale ? Number.parseFloat(avatar.spriteScale) : 1,
      },
      alpha: avatar.spriteTransparency ? Number.parseFloat(avatar.spriteTransparency) : 1,
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

  // return the file name
  public async uploadVocal(message: ChatMessageResponse): Promise<string | undefined> {
    const modelName = "鸣潮";
    const speakerName = "散华";
    const emotion = "中立_neutral";
    const text = message.message.content;

    // 使用hash作为文件名, 用于避免重复生成语音
    const identifyString = `${modelName}_${speakerName}_${emotion}_${text}`;
    const hash = this.simpleHash(identifyString);
    const fileName = `${hash}.wav`;
    if (await checkFileExist(`games/${this.game.name}/game/vocal/`, fileName)) {
      return fileName;
    }

    const response = await tuanchat.ttsController.textToVoiceHobbyist({
      accessToken: "86737b862a54e0de7b32a4b1ff48cd5f",
      modelName,
      speakerName,
      emotion,
      text,
    });
    const vocalUrl = response?.downloadUrl;
    if (vocalUrl) {
      return await uploadFile(vocalUrl, `games/${this.game.name}/game/vocal/`, fileName);
    }
    return undefined;
  }
}

export async function editScene(game: string, scene: string, content: string) {
  const path = `games/${game}/game/scene/${scene}.txt`;
  await terreApis.manageGameControllerEditTextFile({ path, textFile: content });
}

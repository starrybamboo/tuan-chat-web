import type { RenderProps } from "@/components/chat/window/renderWindow";

import { checkGameExist, terreApis } from "@/webGAL/index";

import type { ChatMessageResponse } from "../../api";

import { tuanchat } from "../../api/instance";
import { checkFileExist, getAsyncMsg, uploadFile } from "./fileOperator";
import { editScene } from "./game";

type Game = {
  name: string;
  description: string;
};

type RendererContext = {
  lineNumber: number;
  text: string;
};

export class Renderer {
  private roomId: number = 0;
  private game: Game = {
    name: "Default Game",
    description: "This is a default game",
  };

  private rendererContext: RendererContext = {
    lineNumber: 0,
    text: "",
  };

  private renderProps: RenderProps;

  private syncSocket: WebSocket;

  constructor(roomId: number, renderProp: RenderProps) {
    this.roomId = roomId;
    this.game = {
      // name: `preview_${roomId}_${getCurTimeStamp()}`,
      name: ` preview_${roomId}`,
      description: `This is game preview of ${roomId}`,
    };
    this.renderProps = renderProp;
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
    // readTextFile(this.game.name, "scene/start.txt").then((data) => {
    //   this.rendererContext.text = data;
    //   this.rendererContext.lineNumber = data.split("\n").length;
    // });
  }

  /**
   * 添加一段对话到webgal中
   * @param roleName 角色名
   * @param text 文本
   * @param leftSpriteName 左边立绘的文件名，如果设置为 空字符串，那么会取消这个位置立绘的显示。设置为undefined，则对这个位置的立绘不做任何改变
   * @param rightSpriteName 右边立绘的文件名，规则同上
   * @param vocal 语音文件名
   */
  public async addDialog(
    roleName: string,
    text: string,
    leftSpriteName?: string | undefined,
    rightSpriteName?: string | undefined,
    vocal?: string | undefined,
  ): Promise<void> {
    if (leftSpriteName) {
      await this.addLineToRenderer(`changeFigure:${leftSpriteName.length > 0 ? `${leftSpriteName}.png` : ""} -left -next;`);
    }
    if (rightSpriteName) {
      await this.addLineToRenderer(`changeFigure:${rightSpriteName.length > 0 ? `${rightSpriteName}.png` : ""} -right -next;`);
    }
    await this.addLineToRenderer(`${roleName}: ${text} ${vocal ? `-${vocal}` : ""}`);
  }

  public asyncRender(): void {
    const msg = getAsyncMsg("start.txt", this.rendererContext.lineNumber);
    this.syncSocket.send(JSON.stringify(msg));
  }

  public async uploadSprites(url: string, spritesName: string): Promise<void> {
    const path = `games/${this.game.name}/game/figure/`;
    // 提取URL中的文件后缀
    const fileExtension = url.split(".").pop() || "png";
    await uploadFile(url, path, `${spritesName}.${fileExtension}`);
    console.log(`Uploaded sprites ${spritesName}.${fileExtension} to ${path}`);
  }

  // 上传背景图片，直接使用url当作fileName
  public async uploadBackground(url: string): Promise<string> {
    const path = `games/${this.game.name}/game/background/`;
    return await uploadFile(url, path);
  }

  public async addLineToRenderer(line: string): Promise<void> {
    if (!line.trim())
      return; // 跳过空消息

    this.rendererContext.text = this.rendererContext.text
      ? `${this.rendererContext.text}\n${line}`
      : line;

    this.rendererContext.lineNumber += 1;

    await editScene(this.game.name, "start", this.rendererContext.text);
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

import type { RenderProps } from "@/components/chat/window/renderWindow";

import { getCurTimeStamp } from "@/utils/dataUtil";
import { terreApis } from "@/webGAL/index";

import type { ChatMessageResponse } from "../../api";

import { tuanchat } from "../../api/instance";
import { getAsyncMsg, uploadFile } from "./fileOperator";
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
      name: `preview_${roomId}_${getCurTimeStamp()}`,
      description: `This is game preview of ${roomId}`,
    };
    this.renderProps = renderProp;
    this.syncSocket = new WebSocket(import.meta.env.VITE_TERRE_WS);
  }

  public async initRender(): Promise<void> {
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

  public async addDialog(
    roleName: string,
    text: string,
    leftSpriteName?: string | undefined,
    rightSpriteName?: string | undefined,
    vocal?: string | undefined,
  ): Promise<void> {
    const spritePos = this.renderProps.spritePosition;
    if (leftSpriteName) {
      await this.addLineToRenderer(`changeFigure:${leftSpriteName}.png -${spritePos} -next;`);
    }
    else {
      await this.addLineToRenderer(`changeFigure: -${spritePos} -next;`);
    }
    // if (rightSpriteName) {
    //   await this.addLineToRenderer(`changeFigure:${rightSpriteName}.png -right -next;`);
    // }
    // else {
    //   await this.addLineToRenderer(`changeFigure: -right -next;`);
    // }
    await this.addLineToRenderer(`${roleName}: ${text} ${vocal ? `-${vocal}` : ""}`);
  }

  public asyncRender(): void {
    const msg = getAsyncMsg("start.txt", this.rendererContext.lineNumber);
    this.syncSocket.send(JSON.stringify(msg));
  }

  public async uploadSprites(url: string, spritesName: string): Promise<void> {
    const path = `games/${this.game.name}/game/figure/`;
    await uploadFile(url, path, `${spritesName}.png`);
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

  // return the file name
  public async uploadVocal(message: ChatMessageResponse): Promise<string | undefined> {
    const response = await tuanchat.ttsController.textToVoiceHobbyist({
      accessToken: "86737b862a54e0de7b32a4b1ff48cd5f",
      modelName: "鸣潮",
      speakerName: "散华",
      emotion: "中立_neutral",
      text: message.message.content,
    });
    const vocalUrl = response?.downloadUrl;
    if (vocalUrl) {
      return await uploadFile(vocalUrl, `games/${this.game.name}/game/vocal/`);
    }
    return undefined;
  }
}

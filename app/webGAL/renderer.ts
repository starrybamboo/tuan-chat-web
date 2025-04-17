import type { ChatMessageResponse } from "../../api";

import { tuanchat } from "../../api/instance";
import { checkGameExist, getAsycMsg, readTextFile, uploadFile, uploadImage } from "./fileOperator";
import { createPreview, editScene } from "./game";

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

  private syncSocket: WebSocket;

  constructor(roomId: number) {
    this.roomId = roomId;
    this.game = {
      name: `preview_${roomId}`,
      description: `This is game preview of ${roomId}`,
    };
    this.syncSocket = new WebSocket(import.meta.env.VITE_TERRE_WS);
  }

  public async initRender(): Promise<void> {
    checkGameExist(this.game.name).then((exist) => {
      if (!exist) {
        createPreview(this.roomId);
      }
      else {
        readTextFile(this.game.name, "scene/start.txt").then((data) => {
          this.rendererContext.text = data;
          this.rendererContext.lineNumber = data.split("\n").length;
        });
      }
    });
  }

  public async addDialog(roleId: number, roleName: string, avatarId: number, text: string, vocal?: string | undefined): Promise<void> {
    // 确保sprites名称与ChatRenderer中的格式匹配
    const spritesName = `role_${roleId}_sprites_${avatarId}`;
    await this.addLineToRenderer(`changeFigure:${spritesName}.png -left -next;`);
    await this.addLineToRenderer(`${roleName}: ${text} ${vocal ? `-${vocal}` : ""}`);
    this.rendererContext.lineNumber += 2;
  }

  public asycRender(): void {
    const msg = getAsycMsg("start.txt", this.rendererContext.lineNumber);
    this.syncSocket.send(JSON.stringify(msg));
  }

  public async uploadSprites(url: string, spritesName: string): Promise<void> {
    const path = `games/${this.game.name}/game/figure/`;
    return await uploadImage(url, path, `${spritesName}.png`);
  }

  private async addLineToRenderer(line: string): Promise<void> {
    if (!line.trim())
      return; // 跳过空消息

    this.rendererContext.text = this.rendererContext.text
      ? `${this.rendererContext.text}\n${line}`
      : line;

    await editScene(this.game.name, "start", this.rendererContext.text);
  }

  private async getVocalUrl(message: ChatMessageResponse): Promise<string | undefined> {
    const response = await tuanchat.ttsController.textToVoiceHobbyist({
      accessToken: "86737b862a54e0de7b32a4b1ff48cd5f",
      modelName: "鸣潮",
      speakerName: "散华",
      emotion: "中立_neutral",
      text: message.message.content,
    },
    );
    return response?.downloadUrl;
  };

  // return the file name
  public async uploadVocal(message: ChatMessageResponse): Promise<string | undefined> {
    const vocalUrl = await this.getVocalUrl(message);
    if (vocalUrl) {
      return await uploadFile(vocalUrl, `games/${this.game.name}/game/vocal/`);
    }
    return undefined;
  }
}

import type { RenderProps } from "@/components/chat/window/renderWindow";

import { Renderer } from "@/webGAL/renderer";

import type { ChatMessageResponse, Message, RoleResponse } from "../../api";

import { tuanchat } from "../../api/instance";

/**
 * 核心render组件
 */

export class ChatRenderer {
  private MAX_VOCAL: number = 5;

  private roomId: number;
  private renderer: Renderer;
  private uploadedSpritesNameSet: Set<string> = new Set<string>();
  private roleMap: Map<number, RoleResponse> = new Map();
  private renderProps: RenderProps;

  constructor(roomId: number, renderProp: RenderProps) {
    this.roomId = roomId;
    this.renderProps = renderProp;
    this.renderer = new Renderer(roomId, renderProp);
  }

  public async initializeRenderer(): Promise<void> {
    await this.renderer.initRender();
    await this.fetchAndProcessAllData();
  }

  private async fetchAndProcessAllData(): Promise<void> {
    try {
      // 获取所有消息
      const messagesResponse = await tuanchat.chatController.getAllMessage(this.roomId);
      if (!messagesResponse.success || !messagesResponse.data) {
        throw new Error("Failed to fetch messages");
      }
      // 获取所有的角色信息
      for (const message of messagesResponse.data) {
        const roleId = message.message.roleId;
        if (this.roleMap.has(roleId)) {
          continue;
        }
        const roleQuery = await tuanchat.roleController.getRole(roleId);
        if (roleQuery.success && roleQuery.data) {
          this.roleMap.set(roleId, roleQuery.data);
        }
      }
      await this.renderMessages(messagesResponse.data);
    }
    catch (error) {
      console.error("Error initializing chat renderer:", error);
      throw error;
    }
  }

  private getSpriteName(roleId: number | undefined, avatarId: number | undefined): string | undefined {
    if (!roleId || !avatarId)
      return undefined;
    return `role_${roleId}_sprites_${avatarId}`;
  }

  private async uploadSprite(message: Message) {
    const spritesName = this.getSpriteName(message.roleId, message.avatarId);
    if (!spritesName || this.uploadedSpritesNameSet.has(spritesName)) {
      return;
    }
    const spriteUrl = (await tuanchat.avatarController.getRoleAvatar(message.avatarId)).data?.spriteUrl;
    if (spriteUrl) {
      await this.renderer.uploadSprites(spriteUrl, spritesName);
      this.uploadedSpritesNameSet.add(spritesName);
    }
  }

  /**
   * 对于过长的文本，尽可能按照标点拆分
   * @param content 要渲染的文本
   * @param maxLength 每一个拆分的最大长度
   * @private
   */
  private splitContent(content: string, maxLength = 80) {
    const segments = [];
    let start = 0;

    const splitChars = /[.,!?;:；：，。、！？\s…—]/;

    while (start < content.length) {
      const end = start + maxLength;

      // 如果剩余字符不足 maxLength，直接取剩余部分
      if (end >= content.length) {
        segments.push(content.slice(start));
        break;
      }

      // 反向查找最近的分割符号
      let splitPoint = -1;
      for (let i = end; i > start; i--) {
        if (splitChars.test(content[i])) {
          splitPoint = i;
          break;
        }
      }

      // 如果没有找到分割点，则强制在 maxLength 处分割
      if (splitPoint === -1) {
        splitPoint = end;
      }

      segments.push(content.slice(start, splitPoint + 1));
      start = splitPoint + 1;
    }
    return segments;
  }

  /**
   * 一个聊天记录一个聊天记录地渲染，并在这个过程中自动检测不存在的语音或者立绘等并进行上传
   */
  private async renderMessages(messages: ChatMessageResponse[]): Promise<void> {
    try {
      // 过滤调掉不是文本类型的消息，并排序
      const sortedMessages = messages
        .filter(msg => msg.message)
        .sort((a, b) => a.message.position - b.message.position);

      // 最多生成几段音频 仅供在tts api不足的情况下进行限制
      let maxVocal = this.renderProps.useVocal ? this.MAX_VOCAL : 0;
      // let recentMessages: (Message | undefined)[] = [undefined, undefined];
      // let lastSpeakSide: 0 | 1 = 1;

      for (const messageResponse of sortedMessages) {
        const { message } = messageResponse;
        if (message.messageType === 2) {
          const imageMessage = message.extra?.imageMessage;
          if (imageMessage && imageMessage.background) {
            const bgFileName = await this.renderer.uploadBackground(imageMessage.url);
            await this.renderer.addLineToRenderer(`changeBg:${bgFileName}`);
          }
        }
        else if (message.messageType === 1) {
          if (message.content.startsWith("%")) {
            await this.renderer.addLineToRenderer(message.content.slice(1));
            continue;
          }
          await this.uploadSprite(message);
          const role = this.roleMap.get(message.roleId);

          // 以下处理是为了防止被webGal判断为新一段的对话
          const processedContent = message.content
            .replace(/\n/g, " ") // 替换换行符为空格
            .replace(/;/g, "；") // 替换英文分号为中文分号
            .replace(/:/g, "："); // 替换英文冒号为中文冒号

          if (role && role.roleName && message.content && message.content !== "") {
            // 多立绘
            // const curRoleId = message.roleId;
            // if (curRoleId === recentMessages[0]?.roleId) {
            //   lastSpeakSide = 0;
            //   recentMessages = [message, recentMessages[1]];
            // }
            // else if (curRoleId === recentMessages[1]?.roleId) {
            //   lastSpeakSide = 1;
            //   recentMessages = [recentMessages[0], message];
            // }
            // else {
            //   recentMessages = lastSpeakSide === 0 ? [recentMessages[0], message] : [message, recentMessages[1]];
            //   lastSpeakSide = lastSpeakSide === 0 ? 1 : 0;
            // }

            // 每80个字符分割一次
            const contentSegments = this.splitContent(processedContent);
            // 为每个分割后的段落创建对话
            for (const segment of contentSegments) {
              // 生成语音
              let vocalFileName: string | undefined;
              // 不是系统角色，且不是空行，且不是指令，则生成语音
              if (maxVocal > 0 && message.roleId !== 0 && segment !== "" && !message.content.startsWith(".") && !message.content.startsWith("。") && !message.content.startsWith("%")) {
                // 将聊天内容替换为 segment
                vocalFileName = await this.renderer.uploadVocal({ ...messageResponse, message: { ...messageResponse.message, content: segment } });
                maxVocal--;
              }
              else {
                vocalFileName = undefined;
              }
              await this.renderer.addDialog(
                role.roleName,
                segment, // 使用分割后的段落
                this.getSpriteName(message.roleId, message.avatarId),
                undefined,
                // recentMessages[0] ? this.getSpriteName(recentMessages[0].roleId, recentMessages[0].avatarId) : undefined,
                // recentMessages[1] ? this.getSpriteName(recentMessages[1].roleId, recentMessages[1].avatarId) : undefined,
                vocalFileName,
              );
            }
            // 每添加一条消息后进行短暂延时，避免消息处理过快
            await new Promise(resolve => setTimeout(resolve, 15));
          }
        }
      }
      // 完成后同步渲染
      this.renderer.asyncRender();
    }
    catch (error) {
      console.error("Error rendering messages:", error);
      throw error;
    }
  }
}

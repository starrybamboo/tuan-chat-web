import { Renderer } from "@/webGAL/renderer";

import type { ChatMessageResponse, Message, RoleAvatar, UserRole } from "../../api";

import { tuanchat } from "../../api/instance";

export class ChatRenderer {
  private roomId: number;
  private renderer: Renderer;
  private roleAvatarMap: Map<number, RoleAvatar[]> = new Map();
  private roleMap: Map<number, UserRole> = new Map();

  constructor(roomId: number) {
    this.roomId = roomId;
    this.renderer = new Renderer(roomId);
  }

  public async initializeRenderer(): Promise<void> {
    await this.renderer.initRender();
    await this.fetchAndProcessAllData();
  }

  private async fetchAndProcessAllData(): Promise<void> {
    try {
      // 1. 获取所有消息
      const messagesResponse = await tuanchat.chatController.getAllMessage(this.roomId);
      if (!messagesResponse.success || !messagesResponse.data) {
        throw new Error("Failed to fetch messages");
      }

      // 2. 获取所有角色
      const rolesResponse = await tuanchat.groupRoleController.groupRole(this.roomId);
      if (!rolesResponse.success || !rolesResponse.data) {
        throw new Error("Failed to fetch roles");
      }

      // 3. 为每个角色获取头像
      for (const role of rolesResponse.data) {
        if (role.roleId) {
          const avatarsResponse = await tuanchat.avatarController.getRoleAvatars(role.roleId);
          if (avatarsResponse.success && avatarsResponse.data) {
            this.roleAvatarMap.set(role.roleId, avatarsResponse.data);
          }
          this.roleMap.set(role.roleId, role);
        }
      }

      // 4. 上传所有精灵图
      await this.uploadAllSprites();

      // 5. 按顺序渲染所有消息
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

  private async uploadAllSprites(): Promise<void> {
    const uploadPromises: Promise<void>[] = [];

    this.roleAvatarMap.forEach((avatars, roleId) => {
      avatars.forEach((avatar) => {
        if (avatar.spriteUrl) {
          const spritesName = this.getSpriteName(roleId, avatar.avatarId);
          uploadPromises.push(this.renderer.uploadSprites(avatar.spriteUrl, spritesName || ""));
        }
      });
    });

    await Promise.all(uploadPromises);
  }

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

  private async renderMessages(messages: ChatMessageResponse[]): Promise<void> {
    try {
      // 过滤调掉不是文本类型的消息，并排序
      const sortedMessages = messages
        .filter(msg => msg.message && msg.message.messageID != null)
        .sort((a, b) => a.message.position - b.message.position);

      // 最多生成几段音频 仅供在tts api不足的情况下进行限制
      let maxVocal = 0;
      // 左边显示的立绘对应的message（只用到roleId和avatarId）
      // const leftMessage: Message | undefined = undefined;
      // // 同理
      // const rightMessage: Message | undefined = undefined;
      let recentMessages: (Message | undefined)[] = [undefined, undefined];
      let lastSpeakSide: 0 | 1 = 1;

      for (const messageResponse of sortedMessages) {
        const { message } = messageResponse;
        if (message.messageType !== 1) {
          return;
        }
        const role = this.roleMap.get(message.roleId);

        // 以下处理是为了防止被webGal判断为新一段的对话
        const processedContent = message.content
          .replace(/\n/g, " ") // 替换换行符为空格
          .replace(/;/g, "；") // 替换英文分号为中文分号
          .replace(/:/g, "："); // 替换英文冒号为中文冒号

        if (role && role.roleName && message.content && message.content !== "") {
          const curRoleId = message.roleId;
          if (curRoleId === recentMessages[0]?.roleId) {
            lastSpeakSide = 0;
            recentMessages = [message, recentMessages[1]];
          }
          else if (curRoleId === recentMessages[1]?.roleId) {
            lastSpeakSide = 1;
            recentMessages = [recentMessages[0], message];
          }
          else {
            recentMessages = lastSpeakSide === 0 ? [recentMessages[0], message] : [message, recentMessages[1]];
            lastSpeakSide = lastSpeakSide === 0 ? 1 : 0;
          }

          // 每80个字符分割一次
          const contentSegments = this.splitContent(processedContent);
          // 为每个分割后的段落创建对话
          for (const segment of contentSegments) {
            // 生成语音
            let vocalFileName: string | undefined;
            // 不是系统角色，且不是空行，且不是指令，则生成语音
            if (maxVocal > 0 && message.roleId !== 0 && segment !== "" && !message.content.startsWith(".") && !message.content.startsWith("。")) {
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
              recentMessages[0] ? this.getSpriteName(recentMessages[0].roleId, recentMessages[0].avatarId) : undefined,
              recentMessages[1] ? this.getSpriteName(recentMessages[1].roleId, recentMessages[1].avatarId) : undefined,
              vocalFileName,
            );
          }
          // 每添加一条消息后进行短暂延时，避免消息处理过快
          await new Promise(resolve => setTimeout(resolve, 15));
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

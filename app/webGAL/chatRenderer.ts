import { Renderer } from "@/webGAL/renderer";

import type { ChatMessageResponse, RoleAvatar, UserRole } from "../../api";

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

  private async uploadAllSprites(): Promise<void> {
    const uploadPromises: Promise<void>[] = [];

    this.roleAvatarMap.forEach((avatars, roleId) => {
      avatars.forEach((avatar) => {
        if (avatar.spriteUrl) {
          const spritesName = `role_${roleId}_sprites_${avatar.avatarId}`;
          uploadPromises.push(this.renderer.uploadSprites(avatar.spriteUrl, spritesName));
        }
      });
    });

    await Promise.all(uploadPromises);
  }

  private async renderMessages(messages: ChatMessageResponse[]): Promise<void> {
    try {
      // 使用 messageID 排序，确保所有消息都有效
      const sortedMessages = messages
        .filter(msg => msg.message && msg.message.messageID != null)
        .sort((a, b) => Number(a.message.messageID) - Number(b.message.messageID));

      console.log(`Processing ${sortedMessages.length} messages`); // 添加日志

      for (const messageResponse of sortedMessages) {
        const { message } = messageResponse;
        const role = this.roleMap.get(message.roleId);

        if (role && role.roleName) {
          await this.renderer.addDialog(
            message.roleId,
            role.roleName,
            message.avatarId || 0,
            message.content || "",
          );

          // 每添加一条消息后进行短暂延时，避免消息处理过快
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        else {
          console.warn(`Missing role info for roleId: ${message.roleId}`);
        }
      }

      // 完成后同步渲染
      this.renderer.asycRender();
    }
    catch (error) {
      console.error("Error rendering messages:", error);
      throw error;
    }
  }
}

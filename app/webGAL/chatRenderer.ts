import type { RenderProcess, RenderProps } from "@/components/chat/window/renderWindow";

import { SceneEditor } from "@/webGAL/sceneEditor";

import type { Message, RoleAvatar, Room } from "../../api";

import { tuanchat } from "../../api/instance";

/**
 * 核心render组件
 */

export class ChatRenderer {
  private readonly spaceId: number;
  private roomMap: Record<string, Array<number>> = {};
  private sceneEditor: SceneEditor;
  private uploadedSpritesFileNameMap = new Map<number, string>(); // avatarId -> spriteFileName
  private roleAvatarsMap = new Map<number, RoleAvatar>(); // 渲染时候获取的avatar信息
  private roleMap: Map<number, UserRole> = new Map();
  private renderProps: RenderProps;
  private rooms: Room[] = [];
  private renderedRoomNumber = 0;
  private readonly onRenderProcessChange: (process: RenderProcess) => void; // 渲染进度的回调函数

  constructor(spaceId: number, renderProp: RenderProps, onRenderProcessChange: (process: RenderProcess) => void) {
    this.spaceId = spaceId;
    this.renderProps = renderProp;
    this.onRenderProcessChange = onRenderProcessChange;
    this.sceneEditor = new SceneEditor(this.spaceId);
  }

  public async initializeRenderer(): Promise<void> {
    await this.sceneEditor.initRender();
    this.onRenderProcessChange({ message: "开始渲染" });

    this.rooms = (await tuanchat.roomController.getUserRooms(this.spaceId)).data ?? [];

    const spaceInfo = await tuanchat.spaceController.getSpaceInfo(this.spaceId);
    const roomMap = spaceInfo?.data?.roomMap;
    this.roomMap = roomMap || {};

    const renderedRooms: Room[] = []; // 成功渲染的房间
    for (let i = 0; i < this.rooms.length; i++) {
      try {
        const room = this.rooms[i];
        this.onRenderProcessChange({
          percent: i * 100 / this.rooms.length,
          message: `渲染房间 ${room.name}`,
          subMessage: "处理消息中",
        });
        const success = await this.renderMessages(room);
        if (success) {
          renderedRooms.push(room);
          await this.sceneEditor.addLineToRenderer("changeScene:start.txt", this.getSceneName(room));
        }
        this.renderedRoomNumber = i + 1;
      }
      catch (e) { console.error(e); }
    }

    const branchSentence = this.getBranchSentence(renderedRooms,
      // .filter(room => this.roomMap[room.roomId!] === undefined || this.roomMap[room.roomId!].length === 0),
    );
    await this.sceneEditor.addLineToRenderer(branchSentence, "start");
  }

  /**
   * 生成webgal中的branchSentence
   * @param rooms 要跳转的房间列表
   * @private
   */
  private getBranchSentence(rooms: Room[]): string {
    if (rooms.length === 0)
      return "choose:返回初始节点:start.txt";
    return `choose:${
      rooms
        .map(room => `${room.name?.split("\n").join("")}:${this.getSceneName(room)}.txt`)
        .join("|")
    }`;
  }

  private async fetchAvatar(avatarId: number): Promise<RoleAvatar | null> {
    // 获取立绘信息
    let avatar: RoleAvatar | undefined = this.roleAvatarsMap.get(avatarId);
    if (!avatar) {
      avatar = (await tuanchat.avatarController.getRoleAvatar(avatarId)).data;
      if (avatar) {
        this.roleAvatarsMap.set(avatarId, avatar);
      }
    }
    return avatar || null;
  }

  private async fetchRole(roleId: number): Promise<UserRole | null> {
    // 获取角色信息
    let role: UserRole | undefined = this.roleMap.get(roleId);
    if (!role) {
      role = (await tuanchat.roleController.getRole(roleId)).data;
      if (role) {
        this.roleMap.set(roleId, role);
      }
    }
    return role || null;
  }

  /**
   * 从avatarId获取储存在webgal引擎内的立绘名称, 不带文件后缀
   * @param roleId
   * @param avatarId
   * @private
   */
  private getSpriteName(roleId: number | undefined, avatarId: number | undefined): string | undefined {
    if (!roleId || !avatarId)
      return undefined;
    return `role_${roleId}_sprites_${avatarId}`;
  }

  /**
   * 由Room生成场景名
   */
  private getSceneName(room: Room) {
    return `${room.name?.split("\n").join("")}_${room.roomId}`;
  }

  /**
   * @param message
   * @private
   * @returns filename
   */
  private async uploadSprite(message: Message): Promise<string | null> {
    const avatar = await this.fetchAvatar(message.avatarId);
    const spriteUrl = avatar?.spriteUrl || avatar?.avatarUrl;
    const spriteName = this.getSpriteName(message.roleId, message.avatarId);
    if (!spriteName || !spriteUrl || !avatar?.avatarId) {
      return null;
    }
    const fileName = await this.sceneEditor.uploadSprites(spriteUrl, spriteName);
    this.uploadedSpritesFileNameMap.set(avatar.avatarId, fileName);
    return fileName;
  }

  /**
   * 获取立绘在webgal中的fileName，如果没有，则上传立绘并返回fileName
   * @param message
   * @private
   * @returns filename
   */
  private async getAndUploadSprite(message: Message): Promise<string | null> {
    if (this.uploadedSpritesFileNameMap.has(message.avatarId)) {
      return this.uploadedSpritesFileNameMap.get(message.avatarId) ?? null;
    }
    return this.uploadSprite(message);
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
  private async renderMessages(room: Room): Promise<boolean> {
    const messagesResponse = await tuanchat.chatController.getAllMessage(room.roomId!);
    const messages = messagesResponse.data ?? [];

    if (messages.length === 0)
      return false;
    const sceneName = this.getSceneName(room);
    await this.sceneEditor.addLineToRenderer("changeBg:none -next", sceneName);
    await this.sceneEditor.addLineToRenderer("changeFigure:none -next", sceneName);

    try {
      // 过滤调掉不是文本类型的消息，并排序
      const sortedMessages = messages
        .filter(msg => msg.message)
        .sort((a, b) => a.message.position - b.message.position);

      // 立绘的状态
      const spriteState = new Set<string>();

      const skipRegex = this.renderProps.skipRegex ? new RegExp(this.renderProps.skipRegex) : null;

      for (let i = 0; i < sortedMessages.length; i++) {
        const messageResponse = sortedMessages[i];
        const message = messageResponse.message;
        this.onRenderProcessChange({
          percent: ((this.renderedRoomNumber + (i + 1) / messages.length) / this.rooms.length) * 100,
          subMessage: `已渲染消息数 (${i}/${messages.length})`,
        });

        // 使用正则表达式过滤
        if (skipRegex && skipRegex.test(message.content))
          continue;

        // 获取回复的消息, 会对立绘位置作特殊处理
        const repliedMessage = message.replyMessageId
          ? messages.find(m => m.message.messageId === message.replyMessageId)?.message
          : null;

        // 处理背景图片的消息
        if (message.messageType === 2) {
          const imageMessage = message.extra?.imageMessage;
          if (imageMessage && imageMessage.background) {
            const bgFileName = await this.sceneEditor.uploadBackground(imageMessage.url);
            await this.sceneEditor.addLineToRenderer(`changeBg:${bgFileName}`, sceneName);
          }
        }

        // 处理一般的对话
        else if (message.messageType === 1) {
          // %开头的对话意味着webgal指令，直接写入scene文件内
          if (message.content.startsWith("%")) {
            await this.sceneEditor.addLineToRenderer(message.content.slice(1), sceneName);
            continue;
          }

          const role = await this.fetchRole(message.roleId);

          // 以下处理是为了防止被webGal判断为新一段的对话
          const processedContent = message.content
            .replace(/\n/g, " ") // 替换换行符为空格
            .replace(/;/g, "；") // 替换英文分号为中文分号
            .replace(/:/g, "："); // 替换英文冒号为中文冒号

          if (role && message.content && message.content !== "") {
            // 每80个字符分割一次
            const contentSegments = this.splitContent(processedContent);
            const roleAudios = this.renderProps.roleAudios;
            // 为每个分割后的段落创建对话
            for (const segment of contentSegments) {
              // 生成语音
              let vocalFileName: string | undefined;
              // 不是系统角色，且不是空行，且不是指令，则生成语音
              if (message.roleId !== 0
                && message.roleId !== 2 // 骰娘的id
                && segment !== ""
                && !message.content.startsWith(".")
                && !message.content.startsWith("。")
                && !message.content.startsWith("%")) {
                // 将聊天内容替换为 segment
                vocalFileName = await this.sceneEditor.uploadVocal({
                  ...messageResponse,
                  message: { ...messageResponse.message, content: segment },
                }, roleAudios ? roleAudios[message.roleId] : undefined); ;
              }
              else {
                vocalFileName = undefined;
              }

              const messageSpriteName = (await this.getAndUploadSprite(message)) ?? undefined;
              const repliedSpriteName = repliedMessage
                ? (await this.getAndUploadSprite(repliedMessage)) ?? undefined
                : undefined;
              const noNeedChangeSprite
                  = repliedSpriteName
                    ? (spriteState.has(messageSpriteName || "") && spriteState.has(repliedSpriteName))
                    : (spriteState.has(messageSpriteName || ""));
              const avatar = await this.fetchAvatar(message.avatarId);
              await this.sceneEditor.addDialog(
                role.roleName ?? "未命名角色",
                avatar || undefined,
                segment, // 使用分割后的段落
                sceneName,
                noNeedChangeSprite ? undefined : messageSpriteName,
                noNeedChangeSprite ? undefined : repliedSpriteName,
                vocalFileName,
              );
              if (!noNeedChangeSprite) {
                spriteState.clear();
                if (messageSpriteName)
                  spriteState.add(messageSpriteName);
                if (repliedSpriteName)
                  spriteState.add(repliedSpriteName);
              }
            }
          }
        }
      }

      const branchRoomIds = this.roomMap[room.roomId!] ?? [];
      const branchRooms = this.rooms.filter(
        targetRoom => branchRoomIds.includes(targetRoom.roomId!),
      );
      const branchSentence = this.getBranchSentence(branchRooms);
      await this.sceneEditor.addLineToRenderer(branchSentence, sceneName);

      return true;
    }
    catch (error) {
      console.error("Error rendering messages:", error);
      throw error;
    }
  }
}

import type { RenderInfo, RenderProcess, RenderProps } from "@/components/chat/window/renderWindow";

import { SceneEditor } from "@/webGAL/sceneEditor";

import type { Message, RoleAvatar, Room, UserRole } from "../../api";

import { tuanchat } from "../../api/instance";

/**
 * 核心render组件
 */

export class ChatRenderer {
  private readonly spaceId: number;
  private readonly roomMap: Record<string, Array<number>> = {};
  private sceneEditor: SceneEditor;
  private readonly renderInfo: RenderInfo;
  private readonly totalMessageNumber: number;
  private renderedMessageNumber = 0;
  private uploadedSpritesFileNameMap = new Map<number, string>(); // avatarId -> spriteFileName
  private uploadedMiniAvatarsFileNameMap = new Map<number, string>(); // avatarId -> miniAvatarFileName
  private roleAvatarsMap = new Map<number, RoleAvatar>(); // 渲染时候获取的avatar信息
  private avatarMap: Map<number, RoleAvatar> = new Map(); // avatarId -> avatar
  private voiceFileMap = new Map<number, File>(); // roleId -> File;
  private roleMap: Map<number, UserRole> = new Map();
  private renderProps: RenderProps;
  private readonly rooms: Room[] = [];
  private readonly onRenderProcessChange: (process: RenderProcess) => void; // 渲染进度的回调函数

  constructor(
    spaceId: number,
    renderProp: RenderProps,
    renderInfo: RenderInfo,
    onRenderProcessChange: (process: RenderProcess) => void,
  ) {
    this.spaceId = spaceId;
    this.renderProps = renderProp;
    this.onRenderProcessChange = onRenderProcessChange;
    this.sceneEditor = new SceneEditor(this.spaceId);
    this.renderInfo = renderInfo;

    this.rooms = this.renderInfo.rooms;
    this.roleMap = new Map(renderInfo.roles.map(role => [role.roleId, role]));
    const spaceInfo = this.renderInfo.space;
    this.roomMap = spaceInfo.roomMap || {};

    let totalMessageNumber = 0;
    for (const messages of Object.values(renderInfo.chatHistoryMap)) {
      totalMessageNumber += messages.length;
    }
    this.totalMessageNumber = totalMessageNumber;
  }

  public async initializeRenderer(): Promise<void> {
    await this.sceneEditor.initRender();
    this.onRenderProcessChange({ message: "获取参考音频中" });

    if (this.renderProps.useVocal) {
      const voiceMap = new Map<number, File>();
      // 先从 roleAudios 获取音频文件
      if (this.renderInfo.roleAudios) {
        for (const [roleId, refVocal] of Object.entries(this.renderInfo.roleAudios)) {
          voiceMap.set(Number(roleId), refVocal);
        }
      }
      // 如果 roleAudios 中没有，则尝试从 role.voiceUrl 获取
      for (const [roleId, role] of this.roleMap) {
        if (!voiceMap.has(roleId)) { // 排除系统角色和骰娘
          try {
            if (role.voiceUrl) {
              // 从 voiceUrl 获取文件
              const response = await fetch(role.voiceUrl);
              if (response.ok) {
                const blob = await response.blob();
                const file = new File(
                  [blob],
                  role.voiceUrl.split("/").pop() ?? `${roleId}_ref_vocal.wav`,
                  { type: blob.type || "audio/wav" },
                );
                voiceMap.set(roleId, file);
              }
            }
          }
          catch (error) {
            console.warn(`Failed to fetch voice for role ${roleId}:`, error);
          }
        }
      }
      this.voiceFileMap = voiceMap;
    }

    this.onRenderProcessChange({ message: "开始渲染" });

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
      }
      catch (e) { console.error(e); }
    }

    const branchSentence = this.getBranchSentence(renderedRooms,
      // .filter(room => this.roomMap[room.roomId!] === undefined || this.roomMap[room.roomId!].length === 0),
    );
    await this.sceneEditor.addLineToRenderer(branchSentence, "start");
  }

  private updateRenderProcess() {
    this.onRenderProcessChange({
      percent: this.renderedMessageNumber * 100 / this.totalMessageNumber,
      subMessage: `已渲染消息数 (${this.renderedMessageNumber}/${this.totalMessageNumber})`,
    });
  }

  /**
   * 生成webgal中的branchSentence
   * @param rooms 要跳转的房间列表
   * @private
   */
  private getBranchSentence(rooms: Room[]): string {
    const filteredRooms = rooms.filter(room => this.rooms.some(r => r.roomId === room.roomId));
    if (filteredRooms.length === 0)
      return "choose:返回初始节点:start.txt";
    return `choose:${
      filteredRooms
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

  /**
   * 保底获取角色信息，避免角色信息丢失
   * @param roleId
   * @private
   */
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
   * 将情感标题对象转换为八维情感向量数组
   * @param avatarTitle 情感nVector标题对象，键为情感名称，值为字符串格式的数值
   * @returns 按照API要求顺序排列的八维情感向量数组
   */
  private convertAvatarTitleToEmotionVector(avatarTitle: Record<string, string>): number[] {
    // 定义情感向量的标准顺序（与API接口一致）
    const emotionOrder = ["喜", "怒", "哀", "惧", "厌恶", "低落", "惊喜", "平静"];

    // 最大允许总和
    const MAX_SUM = 0.5;

    // 按照标准顺序提取对应的数值并转换为number类型
    let emotionVector = emotionOrder.map((emotion) => {
      const value = avatarTitle[emotion];
      const numValue = value
        ? Number.parseFloat(value) * 0.5 // 乘以0.5, 拉高了会严重失真
        : 0.0;
      // 确保单个值在合理范围内 (0.0 - 1.4)
      return Math.max(0.0, Math.min(1.4, numValue));
    });

    // 计算当前总和
    const currentSum = emotionVector.reduce((sum, val) => sum + val, 0);

    // 如果总和超过最大值，进行归一化
    if (currentSum > MAX_SUM) {
      const scaleFactor = MAX_SUM / currentSum;
      emotionVector = emotionVector.map(val => val * scaleFactor);
    }

    // 处理浮点数精度问题，保留4位小数
    emotionVector = emotionVector.map(val => Math.round(val * 10000) / 10000);

    return emotionVector;
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

  private async getAndUploadMiniAvatar(message: Message): Promise<string | null> {
    if (this.uploadedMiniAvatarsFileNameMap.has(message.avatarId)) {
      return this.uploadedMiniAvatarsFileNameMap.get(message.avatarId) ?? null;
    }

    const avatar = await this.fetchAvatar(message.avatarId);
    const avatarUrl = avatar?.avatarUrl;
    if (!avatarUrl || !message.roleId || !message.avatarId) {
      return null;
    }

    const miniAvatarName = `role_${message.roleId}_mini_${message.avatarId}`;
    // Reuse sceneEditor.uploadSprites as it uploads to figure folder
    const fileName = await this.sceneEditor.uploadSprites(avatarUrl, miniAvatarName);
    this.uploadedMiniAvatarsFileNameMap.set(message.avatarId, fileName);
    return fileName;
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
    const messages = this.renderInfo.chatHistoryMap[room.roomId!] ?? [];

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
        this.renderedMessageNumber++;
        this.updateRenderProcess();

        if (message.status === 1)
          continue;
        // 使用正则表达式过滤
        if (skipRegex && skipRegex.test(message.content))
          continue;

        // 获取回复的消息, 会对立绘位置作特殊处理
        const repliedMessage = message.replyMessageId
          ? messages.find(m => m.message.messageId === message.replyMessageId)?.message
          : null;

        // 处理背景图片的消息
        if (message.messageType === 2) {
          const imageMessage = message.extra?.imageMessage || (message.extra?.url ? message.extra : null);
          if (imageMessage && imageMessage.background) {
            const bgFileName = await this.sceneEditor.uploadBackground(imageMessage.url);
            await this.sceneEditor.addLineToRenderer(`changeBg:${bgFileName}`, sceneName);
          }
        }

        // 处理 BGM：优先识别 soundMessage(purpose==='bgm') 或 content 标记
        else if (
          (message.extra?.soundMessage || (message.messageType === 7 && message.extra?.url))
          && ((typeof message.content === "string" && message.content.includes("[播放BGM]"))
            || message.extra?.soundMessage?.purpose === "bgm"
            || (message.messageType === 7 && message.extra?.purpose === "bgm"))
        ) {
          let soundMsg = message.extra?.soundMessage;
          if (!soundMsg && message.messageType === 7 && message.extra?.url) {
            soundMsg = message.extra;
          }
          const url = soundMsg?.url;
          if (url) {
            const bgmFileName = await this.sceneEditor.uploadBgm(url);
            let command = `bgm:${bgmFileName}`;
            const vol = soundMsg?.volume;
            if (vol !== undefined) {
              command += ` -vol:${vol}`;
            }
            command += " -next";
            await this.sceneEditor.addLineToRenderer(command, sceneName);
          }
        }

        // 处理特效消息 (Type 8)
        else if (message.messageType === 8) {
          const effectMessage = message.extra?.effectMessage;
          if (effectMessage && effectMessage.effectName) {
            let command: string;
            if (effectMessage.effectName === "none") {
              // 清除特效：使用 pixiInit 初始化，消除所有已应用的效果
              command = "pixiInit -next";
            }
            else {
              // 应用特效：pixiPerform:rain -next
              command = `pixiPerform:${effectMessage.effectName} -next`;
            }
            await this.sceneEditor.addLineToRenderer(command, sceneName);
          }
        }

        // 处理一般的对话（包括普通文本和黑屏文字）
        else if (message.messageType === 1 || message.messageType === 9) {
          // %开头的对话意味着webgal指令，直接写入scene文件内
          if (message.content.startsWith("%")) {
            await this.sceneEditor.addLineToRenderer(message.content.slice(1), sceneName);
            continue;
          }

          // 判断消息类型：黑屏文字（messageType === 9）
          const isIntroText = message.messageType === 9;
          // 判断是否为旁白：roleId <= 0
          const isNarrator = message.roleId <= 0;

          const role = await this.fetchRole(message.roleId);
          const roleAvatar = await this.fetchAvatar(message.avatarId);

          // 获取消息级别的语音渲染设置
          const voiceRenderSettings = (message.webgal as any)?.voiceRenderSettings;
          const messageEmotionVector = voiceRenderSettings?.emotionVector;
          const messageFigurePosition = voiceRenderSettings?.figurePosition || "left";

          // 获取自定义角色名和黑屏文字的 -hold 设置
          const customRoleName = (message.webgal as any)?.customRoleName as string | undefined;
          const introHold = (message.webgal as any)?.introHold as boolean ?? false;

          // 以下处理是为了防止被webGal判断为新一段的对话
          const processedContent = message.content
            .replace(/\n/g, " ") // 替换换行符为空格
            .replace(/;/g, "；") // 替换英文分号为中文分号
            .replace(/:/g, "："); // 替换英文冒号为中文冒号

          // 根据消息类型生成不同的指令
          if (isIntroText) {
            // 黑屏文字（intro）：intro:文字|换行文字|换行文字;
            // 清除立绘
            await this.sceneEditor.addLineToRenderer("changeFigure:none -left -next", sceneName);
            await this.sceneEditor.addLineToRenderer("changeFigure:none -center -next", sceneName);
            await this.sceneEditor.addLineToRenderer("changeFigure:none -right -next", sceneName);
            // 使用 | 作为换行分隔符
            const introContent = processedContent.replace(/ +/g, "|");
            const holdPart = introHold ? " -hold" : "";
            await this.sceneEditor.addLineToRenderer(`intro:${introContent}${holdPart}`, sceneName);
          }
          else if (isNarrator) {
            // 旁白：冒号前留空，如 :这是一句旁白;
            // 旁白不显示立绘和小头像
            await this.sceneEditor.addLineToRenderer(`miniAvatar:none`, sceneName);
            await this.sceneEditor.addLineToRenderer(`:${processedContent}`, sceneName);
          }
          else if (role && message.content && message.content !== "") {
            // 优先使用自定义角色名
            const displayRoleName = customRoleName || role.roleName || "未命名角色";
            // 每80个字符分割一次
            const contentSegments = this.splitContent(processedContent);
            // 为每个分割后的段落创建对话
            for (const segment of contentSegments) {
              // 生成语音
              let vocalFileName: string | undefined;
              // 不是系统角色，且不是空行，且不是指令，则生成语音
              if (this.renderProps.useVocal
                && message.roleId !== 0
                && message.roleId !== 2 // 骰娘的id
                && segment !== ""
                && !message.content.startsWith(".")
                && !message.content.startsWith("。")
                && !message.content.startsWith("%")) {
                // 构建 TTS 选项 - 优先使用消息级别的情感向量
                const ttsOptions: any = {
                  engine: this.renderProps.ttsEngine,
                  emotionVector: messageEmotionVector
                    ?? this.convertAvatarTitleToEmotionVector(roleAvatar?.avatarTitle ?? {}),
                };

                // 如果选择 GPT-SoVITS 引擎,添加相关配置
                if (this.renderProps.ttsEngine === "gpt-sovits" && this.renderProps.gptSovitsConfig) {
                  ttsOptions.apiUrl = this.renderProps.gptSovitsConfig.apiUrl;
                  ttsOptions.refAudioPath = this.renderProps.gptSovitsConfig.refAudioPath;
                  ttsOptions.promptText = this.renderProps.gptSovitsConfig.promptText;
                  ttsOptions.promptLang = this.renderProps.gptSovitsConfig.promptLang;
                  ttsOptions.textLang = this.renderProps.gptSovitsConfig.textLang;
                }

                // 将聊天内容替换为 segment
                vocalFileName = await this.sceneEditor.uploadVocal(
                  {
                    ...messageResponse,
                    message: { ...messageResponse.message, content: segment },
                  },
                  this.voiceFileMap.get(message.roleId),
                  ttsOptions,
                );
              }
              else {
                vocalFileName = undefined;
              }

              const messageSpriteName = (await this.getAndUploadSprite(message)) ?? undefined;
              const miniAvatarName = this.renderProps.useMiniAvatar
                ? ((await this.getAndUploadMiniAvatar(message)) ?? "")
                : undefined;
              const repliedSpriteName = repliedMessage
                ? (await this.getAndUploadSprite(repliedMessage)) ?? undefined
                : undefined;
              const noNeedChangeSprite
                  = repliedSpriteName
                    ? (spriteState.has(messageSpriteName || "") && spriteState.has(repliedSpriteName))
                    : (spriteState.has(messageSpriteName || ""));
              const avatar = await this.fetchAvatar(message.avatarId);
              await this.sceneEditor.addDialog(
                displayRoleName,
                avatar || undefined,
                segment, // 使用分割后的段落
                sceneName,
                noNeedChangeSprite ? undefined : messageSpriteName,
                noNeedChangeSprite ? undefined : repliedSpriteName,
                vocalFileName,
                messageFigurePosition, // 传递立绘位置
                miniAvatarName,
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

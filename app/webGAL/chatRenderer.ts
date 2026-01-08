import type { RenderInfo, RenderProcess, RenderProps } from "@/components/chat/window/renderWindow";
import type { FigureAnimationSettings } from "@/types/voiceRenderTypes";

import { SceneEditor } from "@/webGAL/sceneEditor";

import type { Message, RoleAvatar, Room, UserRole } from "../../api";

import { tuanchat } from "../../api/instance";

/**
 * 核心render组件
 */

export class ChatRenderer {
  private readonly spaceId: number;
  private readonly roomMap: Record<number, RoomLink[]> = {};
  private readonly startRoomId?: number;
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

  // eslint-disable-next-line regexp/no-super-linear-backtracking
  private static readonly TARGET_PATTERN = /^(\d+)(.*)$/s;

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
    const normalizedRoomMap = this.normalizeRoomMap(spaceInfo.roomMap);
    this.roomMap = normalizedRoomMap.links;
    this.startRoomId = normalizedRoomMap.startRoomId;

    let totalMessageNumber = 0;
    for (const messages of Object.values(renderInfo.chatHistoryMap)) {
      totalMessageNumber += messages.length;
    }
    this.totalMessageNumber = totalMessageNumber;
  }

  private parseRoomLink(raw: unknown): RoomLink | null {
    if (raw == null)
      return null;
    const value = typeof raw === "number" ? String(raw) : String(raw ?? "").trim();
    if (value.length === 0)
      return null;
    const match = ChatRenderer.TARGET_PATTERN.exec(value);
    if (!match)
      return null;
    const targetId = Number(match[1]);
    if (Number.isNaN(targetId))
      return null;
    const conditionRaw = match[2]?.trim();
    return {
      targetId,
      condition: conditionRaw || undefined,
    };
  }

  private normalizeWhenCondition(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed)
      return "";
    if (trimmed.startsWith("-when="))
      return trimmed.slice("-when=".length).trim();
    return trimmed;
  }

  private normalizeRoomMap(roomMap: unknown): { links: Record<number, RoomLink[]>; startRoomId?: number } {
    const result: { links: Record<number, RoomLink[]>; startRoomId?: number } = { links: {} };
    if (!roomMap || typeof roomMap !== "object")
      return result;

    Object.entries(roomMap as Record<string, unknown>).forEach(([key, value]) => {
      if (key === "start") {
        const startValue = Array.isArray(value) ? value[0] : undefined;
        const startId = typeof startValue === "number" ? startValue : Number(startValue);
        if (!Number.isNaN(startId))
          result.startRoomId = startId;
        return;
      }

      const roomId = Number(key);
      if (Number.isNaN(roomId))
        return;
      const rawTargets = Array.isArray(value) ? value : [];
      const dedupeMap = new Map<string, RoomLink>();
      (rawTargets as unknown[]).forEach((entry) => {
        const parsed = this.parseRoomLink(entry);
        if (!parsed)
          return;
        const dedupeKey = `${parsed.targetId}|${parsed.condition ?? ""}`;
        if (!dedupeMap.has(dedupeKey))
          dedupeMap.set(dedupeKey, parsed);
      });

      const links = Array.from(dedupeMap.values()).sort((a, b) => {
        if (a.targetId !== b.targetId)
          return a.targetId - b.targetId;
        const condA = a.condition ?? "";
        const condB = b.condition ?? "";
        return condA.localeCompare(condB);
      });
      result.links[roomId] = links;
    });

    return result;
  }

  private buildWorkflowTailForRoom(sourceRoomId: number): string[] {
    const links = this.roomMap[sourceRoomId] ?? [];
    const targetRoomMap = new Map<number, Room>();
    this.rooms.forEach((r) => {
      if (r.roomId != null)
        targetRoomMap.set(r.roomId, r);
    });

    const available = links
      .map(link => ({ link, room: targetRoomMap.get(link.targetId) }))
      .filter((x): x is { link: RoomLink; room: Room } => Boolean(x.room));

    if (available.length === 0)
      return ["choose:返回初始节点:start.txt;"]; // 保底

    if (available.length === 1 && !available[0].link.condition?.trim()) {
      return [`changeScene:${this.getSceneName(available[0].room)}.txt;`];
    }

    const lines: string[] = [];

    // 先生成条件自动跳转：jumpLabel -> label -> changeScene
    const conditional = available
      .map(({ link, room }, index) => ({ link, room, index, cond: this.normalizeWhenCondition(link.condition ?? "") }))
      .filter(x => x.cond.length > 0);

    conditional.forEach(({ room, index, cond }) => {
      const label = `__wf_${sourceRoomId}_${room.roomId}_${index}`;
      lines.push(`jumpLabel:${label} -when=${cond};`);
    });

    // 再给一个可视化的兜底选择：条件分支会按条件展示/允许点击
    const chooseOptions = available.map(({ link, room }) => {
      const name = (room.name ?? `房间${room.roomId}`).replace(/\n/g, "");
      const scene = `${this.getSceneName(room)}.txt`;
      const cond = this.normalizeWhenCondition(link.condition ?? "");
      if (cond.length > 0)
        return `(${cond})[${cond}]->${name}:${scene}`;
      return `${name}:${scene}`;
    });
    lines.push(`choose:${chooseOptions.join("|")};`);

    conditional.forEach(({ room, index }) => {
      const label = `__wf_${sourceRoomId}_${room.roomId}_${index}`;
      lines.push(";");
      lines.push(`label:${label};`);
      lines.push(`changeScene:${this.getSceneName(room)}.txt;`);
    });

    return lines;
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
    const avatarId = message.avatarId;
    if (typeof avatarId !== "number" || Number.isNaN(avatarId) || avatarId <= 0) {
      return null;
    }

    const avatar = await this.fetchAvatar(avatarId);
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
    const avatarId = message.avatarId;
    if (typeof avatarId !== "number" || Number.isNaN(avatarId) || avatarId <= 0) {
      return null;
    }

    if (this.uploadedSpritesFileNameMap.has(avatarId)) {
      return this.uploadedSpritesFileNameMap.get(avatarId) ?? null;
    }
    return this.uploadSprite(message);
  }

  private async getAndUploadMiniAvatar(message: Message): Promise<string | null> {
    const avatarId = message.avatarId;
    const roleId = message.roleId;
    if (typeof avatarId !== "number" || Number.isNaN(avatarId) || avatarId <= 0) {
      return null;
    }
    if (typeof roleId !== "number" || Number.isNaN(roleId) || roleId <= 0) {
      return null;
    }

    if (this.uploadedMiniAvatarsFileNameMap.has(avatarId)) {
      return this.uploadedMiniAvatarsFileNameMap.get(avatarId) ?? null;
    }

    const avatar = await this.fetchAvatar(avatarId);
    const avatarUrl = avatar?.avatarUrl;
    if (!avatarUrl) {
      return null;
    }

    const miniAvatarName = `role_${roleId}_mini_${avatarId}`;
    // Reuse sceneEditor.uploadSprites as it uploads to figure folder
    const fileName = await this.sceneEditor.uploadSprites(avatarUrl, miniAvatarName);
    this.uploadedMiniAvatarsFileNameMap.set(avatarId, fileName);
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
          const imageMessage = message.extra?.imageMessage;
          if (imageMessage) {
            if (imageMessage.background) {
              const bgFileName = await this.sceneEditor.uploadBackground(imageMessage.url);
              await this.sceneEditor.addLineToRenderer(`changeBg:${bgFileName}`, sceneName);
            }
            // 处理解锁CG
            const unlockCg = (message.webgal as any)?.unlockCg;
            if (unlockCg) {
              const cgFileName = await this.sceneEditor.uploadBackground(imageMessage.url);
              const cgName = imageMessage.fileName ? imageMessage.fileName.split(".")[0] : "CG";
              await this.sceneEditor.addLineToRenderer(`unlockCg:${cgFileName} -name=${cgName}`, sceneName);
            }
          }
        }

        // 处理音频消息（BGM 或 音效）
        else if (message.extra?.soundMessage || (message.messageType === 7 && (message.extra as any)?.url)) {
          let soundMsg = message.extra?.soundMessage;
          if (!soundMsg && message.messageType === 7 && (message.extra as any)?.url) {
            soundMsg = message.extra as any;
          }

          const url = soundMsg?.url;
          if (url) {
            // 判断是 BGM 还是音效
            const isMarkedBgm = (typeof message.content === "string" && message.content.includes("[播放BGM]")) || soundMsg?.purpose === "bgm";
            const isMarkedSE = (typeof message.content === "string" && message.content.includes("[播放音效]")) || soundMsg?.purpose === "se";

            if (isMarkedBgm) {
              // 处理 BGM
              const bgmFileName = await this.sceneEditor.uploadBgm(url);
              let command = `bgm:${bgmFileName}`;
              const vol = (soundMsg as any)?.volume;
              if (vol !== undefined) {
                command += ` -volume=${vol}`;
              }
              command += " -next";
              await this.sceneEditor.addLineToRenderer(command, sceneName);
            }
            else if (isMarkedSE) {
              // 处理音效（playEffect）
              const seFileName = await this.sceneEditor.uploadSoundEffect(url);
              let command = `playEffect:${seFileName}`;
              const vol = (soundMsg as any)?.volume;
              if (vol !== undefined) {
                command += ` -volume=${vol}`;
              }
              // 支持循环音效（通过 loopId）
              const loopId = (soundMsg as any)?.loopId;
              if (loopId) {
                command += ` -id=${loopId}`;
              }
              command += " -next";
              await this.sceneEditor.addLineToRenderer(command, sceneName);
            }
            // 如果既不是 BGM 也不是音效，则跳过
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

        // WebGAL 指令消息：直接写入 scene
        else if (message.messageType === 10) {
          if (message.content?.trim()) {
            await this.sceneEditor.addLineToRenderer(message.content.trim(), sceneName);
          }
        }

        // 处理一般的对话（包括普通文本和黑屏文字）
        else if (message.messageType === 1 || message.messageType === 9) {
          // 判断消息类型：黑屏文字（messageType === 9）
          const isIntroText = message.messageType === 9;
          const roleId = message.roleId ?? 0;
          const avatarId = message.avatarId ?? 0;

          // 判断是否为旁白：roleId <= 0
          const isNarrator = roleId <= 0;

          const role = roleId > 0 ? await this.fetchRole(roleId) : undefined;
          const roleAvatar = avatarId > 0 ? await this.fetchAvatar(avatarId) : undefined;

          // 获取消息级别的语音渲染设置
          const voiceRenderSettings = (message.webgal as any)?.voiceRenderSettings;
          const messageEmotionVector = voiceRenderSettings?.emotionVector;
          const messageFigurePosition = voiceRenderSettings?.figurePosition || "left";
          const figureAnimation = voiceRenderSettings?.figureAnimation as FigureAnimationSettings | undefined;

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
                && !message.content.startsWith("。")) {
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
                  this.voiceFileMap.get(message.roleId ?? -1),
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
              const avatar = (typeof message.avatarId === "number" && message.avatarId > 0)
                ? await this.fetchAvatar(message.avatarId)
                : undefined;
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

              // 处理立绘动画（在立绘显示后）
              // 只在第一个段落时处理动画，避免重复
              if (figureAnimation && segment === contentSegments[0]) {
                const animTarget = `fig-${messageFigurePosition}`; // 根据立绘位置自动推断目标

                // 设置进出场动画（setTransition）
                if (figureAnimation.enterAnimation || figureAnimation.exitAnimation) {
                  const enterPart = figureAnimation.enterAnimation ? ` -enter=${figureAnimation.enterAnimation}` : "";
                  const exitPart = figureAnimation.exitAnimation ? ` -exit=${figureAnimation.exitAnimation}` : "";
                  await this.sceneEditor.addLineToRenderer(`setTransition: -target=${animTarget}${enterPart}${exitPart}`, sceneName);
                }

                // 执行一次性动画（setAnimation）
                if (figureAnimation.animation) {
                  await this.sceneEditor.addLineToRenderer(`setAnimation:${figureAnimation.animation} -target=${animTarget} -next`, sceneName);
                }
              }

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

      const tailLines = this.buildWorkflowTailForRoom(room.roomId!);
      for (const line of tailLines) {
        await this.sceneEditor.addLineToRenderer(line, sceneName);
      }

      return true;
    }
    catch (error) {
      console.error("Error rendering messages:", error);
      throw error;
    }
  }
}

type RoomLink = {
  targetId: number;
  condition?: string;
};

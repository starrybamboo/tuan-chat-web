import { checkGameExist, terreApis } from "@/webGAL/index";

/**
 * WebGAL 实时渲染管理器
 * 用于将聊天室消息实时投递到 WebGAL 进行渲染预览
 *
 * 工作流程：
 * 1. 以 Space 为单位创建游戏（realtime_{spaceId}）
 * 2. 以 Room 为单位创建场景（{房间名}_{roomId}.txt）
 * 3. 初始化时导入历史消息到对应场景
 * 4. 增量更新：新消息来时只更新对应房间的场景内容
 */
import type { ChatMessageResponse, RoleAvatar, Room, UserRole } from "../../api";

import { getAsyncMsg, getFileExtensionFromUrl, uploadFile } from "./fileOperator";

type RendererContext = {
  lineNumber: number;
  text: string;
};

type InitProgress = {
  phase: "idle" | "creating_game" | "uploading_sprites" | "uploading_backgrounds" | "creating_scenes" | "ready";
  current: number;
  total: number;
  message: string;
};

export class RealtimeRenderer {
  private static instance: RealtimeRenderer | null = null;
  private syncSocket: WebSocket | null = null;
  private isConnected = false;
  private spaceId: number;
  private gameName: string;
  private currentRoomId: number | null = null;
  private sceneContextMap = new Map<number, RendererContext>(); // roomId -> context
  private uploadedSpritesMap = new Map<number, string>(); // avatarId -> fileName
  private uploadedBackgroundsMap = new Map<string, string>(); // url -> fileName
  private roleMap = new Map<number, UserRole>();
  private avatarMap = new Map<number, RoleAvatar>();
  private roomMap = new Map<number, Room>(); // roomId -> Room
  private onStatusChange?: (status: "connected" | "disconnected" | "error") => void;
  private onProgressChange?: (progress: InitProgress) => void;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: string[] = [];
  private currentSpriteStateMap = new Map<number, Set<string>>(); // roomId -> 当前场景显示的立绘
  private messageLineMap = new Map<string, number>(); // `${roomId}_${messageId}` -> lineNumber (消息在场景中的行号)

  private constructor(spaceId: number) {
    this.spaceId = spaceId;
    this.gameName = `realtime_${spaceId}`;
  }

  /**
   * 获取单例实例
   */
  public static getInstance(spaceId: number): RealtimeRenderer {
    if (!RealtimeRenderer.instance || RealtimeRenderer.instance.spaceId !== spaceId) {
      RealtimeRenderer.instance?.dispose();
      RealtimeRenderer.instance = new RealtimeRenderer(spaceId);
    }
    return RealtimeRenderer.instance;
  }

  /**
   * 销毁实例
   */
  public static destroyInstance(): void {
    RealtimeRenderer.instance?.dispose();
    RealtimeRenderer.instance = null;
  }

  /**
   * 设置状态变化回调
   */
  public setStatusCallback(callback: (status: "connected" | "disconnected" | "error") => void): void {
    this.onStatusChange = callback;
  }

  /**
   * 设置进度变化回调
   */
  public setProgressCallback(callback: (progress: InitProgress) => void): void {
    this.onProgressChange = callback;
  }

  private updateProgress(progress: Partial<InitProgress>): void {
    this.onProgressChange?.({
      phase: "idle",
      current: 0,
      total: 0,
      message: "",
      ...progress,
    });
  }

  /**
   * 获取房间的场景名（不含 .txt 后缀）
   */
  private getSceneName(roomId: number): string {
    const room = this.roomMap.get(roomId);
    const roomName = room?.name?.replace(/\n/g, "").replace(/[/\\:*?"<>|]/g, "_") || `room`;
    return `${roomName}_${roomId}`;
  }

  /**
   * 初始化渲染器（仅创建游戏和场景）
   */
  public async init(): Promise<boolean> {
    try {
      this.updateProgress({ phase: "creating_game", message: "正在创建游戏..." });

      // 检查游戏是否存在
      const gameExists = await checkGameExist(this.gameName);
      console.warn(`[RealtimeRenderer] 游戏 ${this.gameName} 存在: ${gameExists}`);

      // 创建游戏实例（如果不存在）
      if (!gameExists) {
        console.warn(`[RealtimeRenderer] 正在创建游戏: ${this.gameName}`);
        try {
          await terreApis.manageGameControllerCreateGame({
            gameDir: this.gameName,
            gameName: this.gameName,
            templateDir: "WebGAL Black",
          });
          console.warn(`[RealtimeRenderer] 游戏创建成功`);
        }
        catch (createError) {
          console.error(`[RealtimeRenderer] 使用模板创建游戏失败:`, createError);
          // 如果创建失败，尝试不使用模板创建
          console.warn(`[RealtimeRenderer] 尝试不使用模板创建游戏`);
          try {
            await terreApis.manageGameControllerCreateGame({
              gameDir: this.gameName,
              gameName: this.gameName,
            });
          }
          catch {
            console.warn(`[RealtimeRenderer] 无法通过 API 创建游戏，将手动创建目录结构`);
            // 手动创建必要的目录结构
            await this.createGameDirectories();
          }
        }
      }

      // 初始化场景
      await this.initScene();

      // 全量预加载立绘资源
      await this.preloadSprites();

      // 连接 WebSocket
      this.connectWebSocket();

      this.updateProgress({ phase: "ready", message: "初始化完成" });
      return true;
    }
    catch (error) {
      console.error("[RealtimeRenderer] 初始化失败:", error);
      this.onStatusChange?.("error");
      return false;
    }
  }

  /**
   * 全量预加载所有角色的立绘资源
   */
  private async preloadSprites(): Promise<void> {
    const avatars = Array.from(this.avatarMap.values());
    if (avatars.length === 0) {
      console.warn("[RealtimeRenderer] 没有头像需要预加载");
      return;
    }

    this.updateProgress({
      phase: "uploading_sprites",
      current: 0,
      total: avatars.length,
      message: `正在预加载立绘 (0/${avatars.length})`,
    });

    for (let i = 0; i < avatars.length; i++) {
      const avatar = avatars[i];
      if (!avatar.avatarId)
        continue;

      const spriteUrl = avatar.spriteUrl || avatar.avatarUrl;
      if (spriteUrl) {
        try {
          // 查找对应的角色ID
          let roleId = 0;
          for (const [rid, role] of this.roleMap) {
            if (role.avatarId === avatar.avatarId) {
              roleId = rid;
              break;
            }
          }

          await this.uploadSprite(avatar.avatarId, spriteUrl, roleId);
          console.warn(`[RealtimeRenderer] 预加载立绘 ${i + 1}/${avatars.length}: ${avatar.avatarId}`);
        }
        catch (error) {
          console.error(`[RealtimeRenderer] 预加载立绘失败:`, error);
        }
      }

      this.updateProgress({
        phase: "uploading_sprites",
        current: i + 1,
        total: avatars.length,
        message: `正在预加载立绘 (${i + 1}/${avatars.length})`,
      });
    }
  }

  /**
   * 手动创建游戏目录结构
   */
  private async createGameDirectories(): Promise<void> {
    try {
      // 创建 games/<gameName> 目录
      await terreApis.manageGameControllerMkDir({
        source: `/public/games`,
        name: this.gameName,
      });
      console.warn(`[RealtimeRenderer] 创建游戏目录: ${this.gameName}`);

      // 创建 game 子目录
      await terreApis.manageGameControllerMkDir({
        source: `/public/games/${this.gameName}`,
        name: "game",
      });

      // 创建 scene 子目录
      await terreApis.manageGameControllerMkDir({
        source: `/public/games/${this.gameName}/game`,
        name: "scene",
      });

      // 创建 figure 子目录（用于存放立绘）
      await terreApis.manageGameControllerMkDir({
        source: `/public/games/${this.gameName}/game`,
        name: "figure",
      });

      // 创建 background 子目录
      await terreApis.manageGameControllerMkDir({
        source: `/public/games/${this.gameName}/game`,
        name: "background",
      });

      // 创建基础的 config.txt
      await terreApis.manageGameControllerEditTextFile({
        path: `games/${this.gameName}/game/config.txt`,
        textFile: `Game_name:${this.gameName};\nDescription:实时渲染预览;\nGame_key:;\nPackage_name:;\nTitle_img:;`,
      });

      console.warn(`[RealtimeRenderer] 游戏目录结构创建完成`);
    }
    catch (error) {
      console.error(`[RealtimeRenderer] 创建目录结构失败:`, error);
      throw error;
    }
  }

  /**
   * 设置房间信息并创建对应的场景
   */
  public setRooms(rooms: Room[]): void {
    rooms.forEach(room => this.roomMap.set(room.roomId!, room));
  }

  /**
   * 初始化指定房间的场景文件
   */
  public async initRoomScene(roomId: number): Promise<void> {
    const sceneName = this.getSceneName(roomId);
    const path = `games/${this.gameName}/game/scene/${sceneName}.txt`;
    const initialContent = "changeBg:none -next;\nchangeFigure:none -next;";

    try {
      await terreApis.manageGameControllerEditTextFile({ path, textFile: initialContent });
      this.sceneContextMap.set(roomId, { lineNumber: 2, text: initialContent });
      this.currentSpriteStateMap.set(roomId, new Set());
      console.warn(`[RealtimeRenderer] 房间场景初始化成功: ${sceneName}`);
    }
    catch (error) {
      console.error(`[RealtimeRenderer] 房间场景初始化失败: ${sceneName}`, error);
      throw error;
    }
  }

  /**
   * 初始化所有房间的场景并生成入口 start.txt
   */
  private async initScene(): Promise<void> {
    const rooms = Array.from(this.roomMap.values());

    if (rooms.length === 0) {
      // 如果没有房间，创建一个默认场景
      console.warn(`[RealtimeRenderer] 没有房间信息，创建默认场景`);
      const path = `games/${this.gameName}/game/scene/start.txt`;
      await terreApis.manageGameControllerEditTextFile({
        path,
        textFile: "changeBg:none -next;\nchangeFigure:none -next;",
      });
      return;
    }

    this.updateProgress({
      phase: "creating_scenes",
      current: 0,
      total: rooms.length,
      message: `正在创建房间场景 (0/${rooms.length})`,
    });

    // 为每个房间创建场景
    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      if (room.roomId) {
        await this.initRoomScene(room.roomId);
      }
      this.updateProgress({
        phase: "creating_scenes",
        current: i + 1,
        total: rooms.length,
        message: `正在创建房间场景 (${i + 1}/${rooms.length})`,
      });
    }

    // 生成 start.txt 入口场景（选择房间）
    const branchOptions = rooms
      .filter(room => room.roomId)
      .map(room => `${room.name?.replace(/\n/g, "") || "房间"}:${this.getSceneName(room.roomId!)}.txt`)
      .join("|");

    const startContent = branchOptions
      ? `choose:${branchOptions};`
      : "changeBg:none;";

    await terreApis.manageGameControllerEditTextFile({
      path: `games/${this.gameName}/game/scene/start.txt`,
      textFile: startContent,
    });

    console.warn(`[RealtimeRenderer] 入口场景创建成功，包含 ${rooms.length} 个房间选项`);
  }

  /**
   * 切换当前活动的房间
   */
  public async switchRoom(roomId: number): Promise<void> {
    if (!this.sceneContextMap.has(roomId)) {
      // 如果该房间场景不存在，创建它
      await this.initRoomScene(roomId);
    }
    this.currentRoomId = roomId;
    // 发送场景切换同步
    this.sendSyncMessage(roomId);
  }

  /**
   * 连接 WebSocket
   */
  private connectWebSocket(): void {
    if (this.syncSocket?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = import.meta.env.VITE_TERRE_WS;
    if (!wsUrl) {
      console.error("VITE_TERRE_WS 未配置");
      this.onStatusChange?.("error");
      return;
    }

    try {
      this.syncSocket = new WebSocket(wsUrl);

      this.syncSocket.onopen = () => {
        console.warn("WebGAL 实时渲染 WebSocket 已连接");
        this.isConnected = true;
        this.onStatusChange?.("connected");

        // 发送队列中的消息
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          if (msg)
            this.syncSocket?.send(msg);
        }
      };

      this.syncSocket.onclose = () => {
        console.warn("WebGAL 实时渲染 WebSocket 已断开");
        this.isConnected = false;
        this.onStatusChange?.("disconnected");

        // 自动重连
        this.scheduleReconnect();
      };

      this.syncSocket.onerror = (error) => {
        console.error("WebGAL WebSocket 错误:", error);
        this.onStatusChange?.("error");
      };
    }
    catch (error) {
      console.error("WebSocket 连接失败:", error);
      this.onStatusChange?.("error");
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = setTimeout(() => {
      console.warn("尝试重连 WebGAL WebSocket...");
      this.connectWebSocket();
    }, 3000);
  }

  /**
   * 发送同步消息到指定房间的场景
   */
  private sendSyncMessage(roomId: number): void {
    const sceneName = this.getSceneName(roomId);
    const context = this.sceneContextMap.get(roomId);
    if (!context) {
      console.warn(`[RealtimeRenderer] 房间 ${roomId} 的场景上下文不存在`);
      return;
    }

    const msg = getAsyncMsg(`${sceneName}.txt`, context.lineNumber);
    const msgStr = JSON.stringify(msg);

    if (this.isConnected && this.syncSocket?.readyState === WebSocket.OPEN) {
      this.syncSocket.send(msgStr);
    }
    else {
      this.messageQueue.push(msgStr);
    }
  }

  /**
   * 添加一行到指定房间的场景
   */
  private async appendLine(roomId: number, line: string, syncToFile: boolean = true): Promise<void> {
    if (!line.trim())
      return;

    let context = this.sceneContextMap.get(roomId);
    if (!context) {
      // 如果场景不存在，先创建
      await this.initRoomScene(roomId);
      context = this.sceneContextMap.get(roomId)!;
    }

    context.text = context.text
      ? `${context.text}\n${line}`
      : line;
    context.lineNumber += 1;

    if (syncToFile) {
      await this.syncContextToFile(roomId);
    }
  }

  private async syncContextToFile(roomId: number): Promise<void> {
    const context = this.sceneContextMap.get(roomId);
    if (!context)
      return;

    const sceneName = this.getSceneName(roomId);
    const path = `games/${this.gameName}/game/scene/${sceneName}.txt`;
    await terreApis.manageGameControllerEditTextFile({
      path,
      textFile: context.text,
    });
  }

  /**
   * 设置角色信息缓存
   */
  public setRoleCache(roles: UserRole[]): void {
    roles.forEach(role => this.roleMap.set(role.roleId, role));
  }

  /**
   * 设置头像信息缓存
   */
  public setAvatarCache(avatars: RoleAvatar[]): void {
    avatars.forEach((avatar) => {
      if (avatar.avatarId) {
        this.avatarMap.set(avatar.avatarId, avatar);
      }
    });
  }

  /**
   * 将 RoleAvatar 转换为 transform 字符串
   */
  private roleAvatarToTransformString(avatar: RoleAvatar): string {
    const rotationRad = avatar.spriteRotation
      ? (avatar.spriteRotation * Math.PI / 180)
      : 0;

    const transform = {
      position: {
        x: avatar.spriteXPosition ?? 0,
        y: avatar.spriteYPosition ?? 0,
      },
      scale: {
        x: avatar.spriteScale ?? 1,
        y: avatar.spriteScale ?? 1,
      },
      alpha: avatar.spriteTransparency ?? 1,
      rotation: rotationRad,
    };

    return `-transform=${JSON.stringify(transform)}`;
  }

  /**
   * 上传立绘
   */
  private async uploadSprite(avatarId: number, spriteUrl: string, roleId: number): Promise<string | null> {
    if (this.uploadedSpritesMap.has(avatarId)) {
      return this.uploadedSpritesMap.get(avatarId) || null;
    }

    try {
      const path = `games/${this.gameName}/game/figure/`;
      const fileExtension = getFileExtensionFromUrl(spriteUrl, "webp");
      const spriteName = `role_${roleId}_sprites_${avatarId}`;
      const fileName = await uploadFile(spriteUrl, path, `${spriteName}.${fileExtension}`);
      this.uploadedSpritesMap.set(avatarId, fileName);
      return fileName;
    }
    catch (error) {
      console.error("上传立绘失败:", error);
      return null;
    }
  }

  /**
   * 上传背景
   */
  private async uploadBackground(url: string): Promise<string | null> {
    if (this.uploadedBackgroundsMap.has(url)) {
      return this.uploadedBackgroundsMap.get(url) || null;
    }

    try {
      const path = `games/${this.gameName}/game/background/`;
      const fileExtension = getFileExtensionFromUrl(url, "webp");
      // 使用 URL 的 hash 作为唯一文件名
      const urlHash = url.split("/").pop()?.split("?")[0] || Date.now().toString();
      const bgName = `bg_${urlHash.replace(/[^a-z0-9]/gi, "_")}`;
      const fileName = await uploadFile(url, path, `${bgName}.${fileExtension}`);
      this.uploadedBackgroundsMap.set(url, fileName);
      return fileName;
    }
    catch (error) {
      console.error("上传背景失败:", error);
      return null;
    }
  }

  /**
   * 获取立绘文件名（如果未上传则上传）
   */
  private async getAndUploadSprite(avatarId: number, roleId: number): Promise<string | null> {
    // 已上传的直接返回
    if (this.uploadedSpritesMap.has(avatarId)) {
      return this.uploadedSpritesMap.get(avatarId) || null;
    }

    // 获取头像信息
    const avatar = this.avatarMap.get(avatarId);
    if (!avatar)
      return null;

    const spriteUrl = avatar.spriteUrl || avatar.avatarUrl;
    if (!spriteUrl)
      return null;

    return this.uploadSprite(avatarId, spriteUrl, roleId);
  }

  /**
   * 渲染一条消息到指定房间
   * @param message 消息
   * @param roomId 房间ID
   * @param syncToFile 是否同步到文件
   * @param autoJump 是否自动跳转到最新行（默认 true）
   */
  public async renderMessage(message: ChatMessageResponse, roomId?: number, syncToFile: boolean = true, autoJump: boolean = true): Promise<void> {
    const msg = message.message;
    const targetRoomId = roomId ?? msg.roomId ?? this.currentRoomId;

    if (!targetRoomId) {
      console.warn("[RealtimeRenderer] 无法确定目标房间ID");
      return;
    }

    // 确保该房间的场景已初始化
    if (!this.sceneContextMap.has(targetRoomId)) {
      await this.initRoomScene(targetRoomId);
    }

    // 获取该房间的立绘状态
    let spriteState = this.currentSpriteStateMap.get(targetRoomId);
    if (!spriteState) {
      spriteState = new Set();
      this.currentSpriteStateMap.set(targetRoomId, spriteState);
    }

    // 跳过已撤回消息
    if (msg.status === 1)
      return;

    // 处理背景图片消息
    if (msg.messageType === 2) {
      const imageMessage = msg.extra?.imageMessage;
      if (imageMessage && imageMessage.background) {
        const bgFileName = await this.uploadBackground(imageMessage.url);
        if (bgFileName) {
          await this.appendLine(targetRoomId, `changeBg:${bgFileName} -next;`, syncToFile);
          if (syncToFile && autoJump)
            this.sendSyncMessage(targetRoomId);
        }
      }
      return;
    }

    // 跳过非文本消息
    if (msg.messageType !== 1)
      return;

    // 跳过空消息
    if (!msg.content?.trim())
      return;

    // 跳过 WebGAL 指令消息（以 % 开头）
    if (msg.content.startsWith("%")) {
      await this.appendLine(targetRoomId, msg.content.slice(1), syncToFile);
      if (syncToFile && autoJump)
        this.sendSyncMessage(targetRoomId);
      return;
    }

    // 获取角色信息
    const role = this.roleMap.get(msg.roleId);
    const roleName = role?.roleName || `角色${msg.roleId}`;

    // 获取头像信息
    const avatar = this.avatarMap.get(msg.avatarId);

    // 获取立绘文件名
    const spriteFileName = await this.getAndUploadSprite(msg.avatarId, msg.roleId);

    // 处理立绘显示 - 只有当立绘未显示时才添加 changeFigure 指令
    if (spriteFileName && !spriteState.has(spriteFileName)) {
      const transform = avatar ? this.roleAvatarToTransformString(avatar) : "";
      await this.appendLine(targetRoomId, `changeFigure:${spriteFileName} -left ${transform} -next;`, syncToFile);
      spriteState.clear();
      spriteState.add(spriteFileName);
    }

    // 处理文本内容
    const processedContent = msg.content
      .replace(/\n/g, " ")
      .replace(/;/g, "；")
      .replace(/:/g, "：");

    // 添加对话行
    await this.appendLine(targetRoomId, `${roleName}: ${processedContent}`, syncToFile);

    // 记录消息 ID 和行号的映射（用于跳转）
    const context = this.sceneContextMap.get(targetRoomId);
    if (context && msg.messageId) {
      this.messageLineMap.set(`${targetRoomId}_${msg.messageId}`, context.lineNumber);
    }

    // 发送同步消息到 WebGAL（仅当 autoJump 为 true 时）
    if (syncToFile && autoJump) {
      this.sendSyncMessage(targetRoomId);
    }
  }

  /**
   * 批量渲染历史消息
   */
  public async renderHistory(messages: ChatMessageResponse[], roomId?: number): Promise<void> {
    const targetRoomId = roomId ?? this.currentRoomId;
    if (!targetRoomId)
      return;

    // 批量处理消息，不进行文件同步和 WebSocket 同步
    for (const message of messages) {
      await this.renderMessage(message, targetRoomId, false);
    }

    // 最后统一同步文件和发送 WebSocket 指令
    await this.syncContextToFile(targetRoomId);
    this.sendSyncMessage(targetRoomId);
  }

  /**
   * 清除指定房间的背景
   */
  public async clearBackground(roomId?: number): Promise<void> {
    const targetRoomId = roomId ?? this.currentRoomId;
    if (!targetRoomId) {
      console.warn("[RealtimeRenderer] 无法确定目标房间ID");
      return;
    }

    // 确保该房间的场景已初始化
    if (!this.sceneContextMap.has(targetRoomId)) {
      await this.initRoomScene(targetRoomId);
    }

    await this.appendLine(targetRoomId, "changeBg:none -next;", true);
    this.sendSyncMessage(targetRoomId);
  }

  /**
   * 清空指定房间的场景并重新初始化
   */
  public async resetScene(roomId?: number): Promise<void> {
    if (roomId) {
      await this.initRoomScene(roomId);
      this.currentSpriteStateMap.set(roomId, new Set());
      this.sendSyncMessage(roomId);
    }
    else {
      // 重置所有房间
      await this.initScene();
      this.currentSpriteStateMap.clear();
    }
  }

  /**
   * 获取指定房间的预览 URL
   */
  public getPreviewUrl(roomId?: number): string {
    const terreUrl = import.meta.env.VITE_TERRE_URL || "http://localhost:3001";
    if (roomId) {
      const sceneName = this.getSceneName(roomId);
      return `${terreUrl}/games/${this.gameName}/index.html?scene=${sceneName}.txt`;
    }
    return `${terreUrl}/games/${this.gameName}/index.html`;
  }

  /**
   * 获取连接状态
   */
  public isReady(): boolean {
    return this.isConnected;
  }

  /**
   * 获取游戏名称
   */
  public getGameName(): string {
    return this.gameName;
  }

  /**
   * 刷新指定房间的场景
   * 用于在不开启实时同步的情况下，手动让 WebGAL 重新加载场景文件
   * @param roomId 房间 ID（可选，默认使用当前房间）
   * @param jumpToEnd 是否跳转到场景末尾（默认 true）
   * @returns 是否刷新成功
   */
  public refreshScene(roomId?: number, jumpToEnd: boolean = true): boolean {
    const targetRoomId = roomId ?? this.currentRoomId;
    if (!targetRoomId) {
      console.warn("[RealtimeRenderer] 无法确定目标房间ID");
      return false;
    }

    const context = this.sceneContextMap.get(targetRoomId);
    if (!context) {
      console.warn(`[RealtimeRenderer] 房间 ${targetRoomId} 的场景上下文不存在`);
      return false;
    }

    const sceneName = this.getSceneName(targetRoomId);
    const lineNumber = jumpToEnd ? context.lineNumber : 1;
    // 使用 forceReload = true 强制 WebGAL 重新加载场景
    const msg = getAsyncMsg(`${sceneName}.txt`, lineNumber, true);
    const msgStr = JSON.stringify(msg);

    if (this.isConnected && this.syncSocket?.readyState === WebSocket.OPEN) {
      this.syncSocket.send(msgStr);
      return true;
    }
    else {
      console.warn("[RealtimeRenderer] WebSocket 未连接，无法刷新场景");
      return false;
    }
  }

  /**
   * 获取场景的当前行数
   * @param roomId 房间 ID
   */
  public getSceneLineCount(roomId?: number): number {
    const targetRoomId = roomId ?? this.currentRoomId;
    if (!targetRoomId)
      return 0;
    const context = this.sceneContextMap.get(targetRoomId);
    return context?.lineNumber ?? 0;
  }

  /**
   * 跳转到指定消息
   * @param messageId 消息 ID
   * @param roomId 房间 ID（可选，默认使用当前房间）
   * @returns 是否跳转成功
   */
  public jumpToMessage(messageId: number, roomId?: number): boolean {
    const targetRoomId = roomId ?? this.currentRoomId;
    if (!targetRoomId) {
      console.warn("[RealtimeRenderer] 无法确定目标房间ID");
      return false;
    }

    const key = `${targetRoomId}_${messageId}`;
    const lineNumber = this.messageLineMap.get(key);

    if (lineNumber === undefined) {
      console.warn(`[RealtimeRenderer] 消息 ${messageId} 未找到对应的行号`);
      return false;
    }

    const sceneName = this.getSceneName(targetRoomId);
    const msg = getAsyncMsg(`${sceneName}.txt`, lineNumber);
    const msgStr = JSON.stringify(msg);

    if (this.isConnected && this.syncSocket?.readyState === WebSocket.OPEN) {
      this.syncSocket.send(msgStr);
      return true;
    }
    else {
      console.warn("[RealtimeRenderer] WebSocket 未连接，无法跳转");
      return false;
    }
  }

  /**
   * 销毁资源
   */
  public dispose(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.syncSocket) {
      this.syncSocket.close();
      this.syncSocket = null;
    }
    this.isConnected = false;
    this.onStatusChange = undefined;
  }
}

export default RealtimeRenderer;

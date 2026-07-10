export type RealtimeTTSConfig = {
  /** 是否启用 TTS */
  enabled: boolean;
  /** TTS 引擎：目前仅支持 IndexTTS */
  engine?: "index";
  /** TTS API 地址（如 http://localhost:9000） */
  apiUrl?: string;
  /** 情感模式: 0=同音色参考,1=情感参考音频,2=情感向量,3=情感描述文本 */
  emotionMode?: number;
  /** 情感权重 */
  emotionWeight?: number;
  /** 温度 */
  temperature?: number;
  /** top_p */
  topP?: number;
  /** 单段最大 token 数 */
  maxTokensPerSegment?: number;
};

export type RealtimeGameConfig = {
  /** 未设置标题背景图 URL 时，是否将群聊头像同步为标题背景图（Title_img） */
  coverFromRoomAvatarEnabled: boolean;
  /** 标题背景图 URL（Title_img，优先于“标题背景图使用群聊头像”） */
  titleImageUrl: string;
  /** 标题背景图媒体文件 ID */
  titleImageFileId?: number;
  /** 标题背景图原图 URL（本地打包优先使用） */
  originalTitleImageUrl: string;
  /** 标题背景图原图媒体文件 ID */
  originalTitleImageFileId?: number;
  /** 未设置启动图 URL 时，是否将群聊头像同步为启动图（Game_Logo） */
  startupLogoFromRoomAvatarEnabled: boolean;
  /** 启动图 URL（Game_Logo，优先于“启动图使用群聊头像”） */
  startupLogoUrl: string;
  /** 启动图媒体文件 ID */
  startupLogoFileId?: number;
  /** 启动图原图 URL（本地打包优先使用） */
  originalStartupLogoUrl: string;
  /** 启动图原图媒体文件 ID */
  originalStartupLogoFileId?: number;
  /** 是否将群聊头像同步为游戏图标（icons/*） */
  gameIconFromRoomAvatarEnabled: boolean;
  /** 是否将空间名称+spaceId 同步为游戏名（Game_name） */
  gameNameFromRoomNameEnabled: boolean;
  /** 游戏简介（Description） */
  description: string;
  /** 游戏包名（Package_name） */
  packageName: string;
  /** 底层模板（tuanchat=团剧共创，black=WebGAL Black） */
  baseTemplate: "black" | "tuanchat";
  /** 是否开启紧急回避（Show_panic） */
  showPanicEnabled: boolean;
  /** 是否允许玩家打开完整设置（Allow_Full_Settings） */
  allowOpenFullSettings: boolean;
  /** 是否启用角色发言聚焦（Enable_Speaker_Focus） */
  speakerFocusEnabled: boolean;
  /** 默认语言（Default_Language） */
  defaultLanguage: "" | "zh_CN" | "zh_TW" | "en" | "ja" | "fr" | "de";
  /** 是否开启鉴赏模式（Enable_Appreciation） */
  enableAppreciation: boolean;
  /** 是否开启打字音（TypingSoundEnabled） */
  typingSoundEnabled: boolean;
  /** 默认角色立绘入场时长（Figure_Default_Enter_Duration） */
  figureDefaultEnterDuration: number;
  /** 默认角色立绘出场时长（Figure_Default_Exit_Duration） */
  figureDefaultExitDuration: number;
  /** 默认角色立绘入场动画 JSON 名（Figure_Default_Enter_Animation） */
  figureDefaultEnterAnimation: string;
  /** 默认角色立绘出场动画 JSON 名（Figure_Default_Exit_Animation） */
  figureDefaultExitAnimation: string;
  /** 打字音播放间隔（每隔多少个字符播放一次） */
  typingSoundInterval: number;
  /** 标点符号额外停顿（毫秒） */
  typingSoundPunctuationPause: number;
  /** 打字音效文件 URL（将上传同步为 TypingSoundSe） */
  typingSoundSeUrl: string;
  /** 打字音效媒体文件 ID */
  typingSoundSeFileId?: number;
  /** 打字音效媒体类型 */
  typingSoundSeMediaType?: string;
};

export const DEFAULT_REALTIME_GAME_CONFIG: RealtimeGameConfig = {
  coverFromRoomAvatarEnabled: true,
  titleImageUrl: "",
  originalTitleImageUrl: "",
  startupLogoFromRoomAvatarEnabled: false,
  startupLogoUrl: "",
  originalStartupLogoUrl: "",
  gameIconFromRoomAvatarEnabled: true,
  gameNameFromRoomNameEnabled: true,
  description: "",
  packageName: "",
  baseTemplate: "tuanchat",
  showPanicEnabled: false,
  allowOpenFullSettings: true,
  speakerFocusEnabled: true,
  defaultLanguage: "",
  enableAppreciation: true,
  typingSoundEnabled: false,
  figureDefaultEnterDuration: 0,
  figureDefaultExitDuration: 300,
  figureDefaultEnterAnimation: "tuanchat/default-enter",
  figureDefaultExitAnimation: "tuanchat/default-exit",
  typingSoundInterval: 1.5,
  typingSoundPunctuationPause: 100,
  typingSoundSeUrl: "",
};

export function normalizeFigureDefaultTransitionDuration(value: unknown): number {
  const raw = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(raw)) {
    return 100;
  }
  return Math.max(0, Math.min(5000, Math.floor(raw)));
}

export function normalizeFigureDefaultTransitionAnimation(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const normalized = value.trim();
  return normalized || fallback;
}

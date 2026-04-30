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
  /** 标题背景图原图 URL（本地打包优先使用） */
  originalTitleImageUrl: string;
  /** 未设置启动图 URL 时，是否将群聊头像同步为启动图（Game_Logo） */
  startupLogoFromRoomAvatarEnabled: boolean;
  /** 启动图 URL（Game_Logo，优先于“启动图使用群聊头像”） */
  startupLogoUrl: string;
  /** 启动图原图 URL（本地打包优先使用） */
  originalStartupLogoUrl: string;
  /** 是否将群聊头像同步为游戏图标（icons/*） */
  gameIconFromRoomAvatarEnabled: boolean;
  /** 是否将空间名称+spaceId 同步为游戏名（Game_name） */
  gameNameFromRoomNameEnabled: boolean;
  /** 游戏简介（Description） */
  description: string;
  /** 游戏包名（Package_name） */
  packageName: string;
  /** 底层模板（none=默认模板，black=WebGAL Black） */
  baseTemplate: "none" | "black";
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
  /** 打字音播放间隔（每隔多少个字符播放一次） */
  typingSoundInterval: number;
  /** 标点符号额外停顿（毫秒） */
  typingSoundPunctuationPause: number;
  /** 打字音效文件 URL（将上传同步为 TypingSoundSe） */
  typingSoundSeUrl: string;
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
  baseTemplate: "none",
  showPanicEnabled: false,
  allowOpenFullSettings: true,
  speakerFocusEnabled: true,
  defaultLanguage: "",
  enableAppreciation: true,
  typingSoundEnabled: false,
  typingSoundInterval: 1.5,
  typingSoundPunctuationPause: 100,
  typingSoundSeUrl: "",
};

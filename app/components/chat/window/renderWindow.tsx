import type { ChatMessageResponse, Room, Space, UserRole } from "../../../../api";

export interface RenderProps {
  spritePosition: "left" | "middle" | "right";
  useVocal: boolean;
  useMiniAvatar: boolean;
  skipRegex?: string;
  ttsEngine: "index" | "gpt-sovits";
  gptSovitsConfig?: {
    apiUrl: string;
    refAudioPath: string;
    promptText: string;
    promptLang: string;
    textLang: string;
  };
}

export interface RenderInfo {
  space: Space;
  rooms: Room[];
  roles: UserRole[];
  chatHistoryMap: Record<number, ChatMessageResponse[]>;
  roleAudios: Record<number, File>;
}

export interface RenderProcess {
  percent?: number;
  message?: string;
  subMessage?: string;
}

// 全量渲染（RenderWindow）已从产品中移除：入口、页面与实现均不再保留。
// 这里保留一个空组件，避免历史类型引用导致的构建失败；后续可直接删除该文件。
export default function RenderWindow() {
  return null;
}

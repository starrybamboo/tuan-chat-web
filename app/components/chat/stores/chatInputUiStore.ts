import { create } from "zustand";

import type { UserRole } from "../../../../api";

type ChatInputUiStore = {
  /** 输入框纯文本（包含提及显示文本） */
  plainText: string;

  /** 输入框纯文本（移除 @提及 span 后的纯文本） */
  textWithoutMentions: string;

  /** 当前输入中包含的提及角色列表 */
  mentionedRoles: UserRole[];

  setSnapshot: (snapshot: {
    plainText: string;
    textWithoutMentions: string;
    mentionedRoles: UserRole[];
  }) => void;

  reset: () => void;
};

export const useChatInputUiStore = create<ChatInputUiStore>(set => ({
  plainText: "",
  textWithoutMentions: "",
  mentionedRoles: [],

  setSnapshot: snapshot => set(snapshot),

  reset: () => set({ plainText: "", textWithoutMentions: "", mentionedRoles: [] }),
}));

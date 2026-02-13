import { create } from "zustand";

import type { UserRole } from "../../../../api";

function isSameMentionedRoles(a: UserRole[], b: UserRole[]): boolean {
  if (a === b)
    return true;
  if (a.length !== b.length)
    return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.roleId !== b[i]?.roleId)
      return false;
  }
  return true;
}

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

  setSnapshot: snapshot => set((state) => {
    if (
      state.plainText === snapshot.plainText
      && state.textWithoutMentions === snapshot.textWithoutMentions
      && isSameMentionedRoles(state.mentionedRoles, snapshot.mentionedRoles)
    ) {
      return state;
    }
    return {
      ...state,
      plainText: snapshot.plainText,
      textWithoutMentions: snapshot.textWithoutMentions,
      mentionedRoles: snapshot.mentionedRoles,
    };
  }),

  reset: () => set(state => (
    state.plainText === "" && state.textWithoutMentions === "" && state.mentionedRoles.length === 0
      ? state
      : { plainText: "", textWithoutMentions: "", mentionedRoles: [] }
  )),
}));

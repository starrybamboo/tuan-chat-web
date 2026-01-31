import type { ComponentProps } from "react";

import type RoomComposerPanel from "@/components/chat/room/roomComposerPanel";

type RoomComposerPanelProps = ComponentProps<typeof RoomComposerPanel>;

type UseRoomComposerPanelPropsParams = Omit<RoomComposerPanelProps, "placeholderText" | "inputDisabled"> & {
  composerTarget: "main" | "thread";
  threadRootMessageId?: number | null;
};

export default function useRoomComposerPanelProps({
  composerTarget,
  threadRootMessageId,
  ...props
}: UseRoomComposerPanelPropsParams): RoomComposerPanelProps {
  const { isKP, noRole, notMember, curAvatarId } = props;

  const placeholderText = (() => {
    if (notMember) {
      return "观战模式下无法发送消息";
    }
    if (noRole && !isKP) {
      return "请选择/拉入你的角色后再发送";
    }
    if (noRole && isKP) {
      return "旁白模式：输入内容…（Shift+Enter 换行，Tab 触发 AI）";
    }
    if (curAvatarId <= 0) {
      return "请选择角色立绘后发送…（Shift+Enter 换行，Tab 触发 AI）";
    }
    if (threadRootMessageId && composerTarget === "thread") {
      return "线程回复中…（Shift+Enter 换行，Tab 触发 AI）";
    }
    return "输入消息…（Shift+Enter 换行，Tab 触发 AI）";
  })();

  return {
    ...props,
    placeholderText,
    inputDisabled: notMember && noRole,
  };
}

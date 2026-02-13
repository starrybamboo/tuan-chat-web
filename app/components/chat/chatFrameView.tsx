import type { ComponentProps } from "react";
import React from "react";

import ChatFrameList from "@/components/chat/chatFrameList";
import ChatFrameOverlays from "@/components/chat/chatFrameOverlays";
import ChatFrameContextMenu from "@/components/chat/room/contextMenu/chatFrameContextMenu";

interface ChatFrameViewProps {
  listProps: ComponentProps<typeof ChatFrameList>;
  overlaysProps: ComponentProps<typeof ChatFrameOverlays>;
  contextMenuProps: ComponentProps<typeof ChatFrameContextMenu>;
}

export default function ChatFrameView({ listProps, overlaysProps, contextMenuProps }: ChatFrameViewProps) {
  return (
    <div className="h-full relative">
      <ChatFrameList {...listProps} />
      <ChatFrameOverlays {...overlaysProps} />
      {/* 右键菜单 */}
      <ChatFrameContextMenu {...contextMenuProps} />
    </div>
  );
}

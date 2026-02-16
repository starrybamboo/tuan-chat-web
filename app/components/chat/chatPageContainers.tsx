import type { ComponentProps } from "react";
import React from "react";

import ChatPageLayout from "@/components/chat/chatPageLayout";
import ChatPageModals from "@/components/chat/chatPageModals";
import ChatPageSidePanelContent from "@/components/chat/chatPageSidePanelContent";
import ChatPageContextMenu from "@/components/chat/room/contextMenu/chatPageContextMenu";
import ChatSpaceSidebar from "@/components/chat/space/chatSpaceSidebar";
import SpaceContextMenu from "@/components/chat/space/contextMenu/spaceContextMenu";

interface ChatPagePanelsProps {
  layoutProps: Omit<ComponentProps<typeof ChatPageLayout>, "mainContent" | "sidePanelContent" | "spaceSidebar" | "subWindowContent">;
  mainContent: React.ReactNode;
  subWindowContent?: React.ReactNode;
  sidePanelProps: ComponentProps<typeof ChatPageSidePanelContent>;
  spaceSidebarProps: ComponentProps<typeof ChatSpaceSidebar>;
}

export function ChatPagePanels({
  layoutProps,
  mainContent,
  subWindowContent,
  sidePanelProps,
  spaceSidebarProps,
}: ChatPagePanelsProps) {
  return (
    <ChatPageLayout
      {...layoutProps}
      spaceSidebar={<ChatSpaceSidebar {...spaceSidebarProps} />}
      sidePanelContent={<ChatPageSidePanelContent {...sidePanelProps} />}
      mainContent={mainContent}
      subWindowContent={subWindowContent}
    />
  );
}

interface ChatPageOverlaysProps {
  modalsProps: ComponentProps<typeof ChatPageModals>;
  contextMenuProps: ComponentProps<typeof ChatPageContextMenu>;
  spaceContextMenuProps: ComponentProps<typeof SpaceContextMenu>;
}

export function ChatPageOverlays({
  modalsProps,
  contextMenuProps,
  spaceContextMenuProps,
}: ChatPageOverlaysProps) {
  return (
    <>
      <ChatPageModals {...modalsProps} />
      <ChatPageContextMenu {...contextMenuProps} />
      <SpaceContextMenu {...spaceContextMenuProps} />
    </>
  );
}

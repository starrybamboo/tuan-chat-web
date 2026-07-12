import type { ComponentProps } from "react";

import React from "react";

import type { SpaceContextMenuProps } from "@/components/chat/space/contextMenu/spaceContextMenu";

import ChatPageLayout from "@/components/chat/chatPageLayout";
import ChatPageModals from "@/components/chat/chatPageModals";
import ChatPageSidePanelContent from "@/components/chat/chatPageSidePanelContent";
import ChatPageContextMenu from "@/components/chat/room/contextMenu/chatPageContextMenu";
import ChatSpaceSidebar from "@/components/chat/space/chatSpaceSidebar";

const LazySpaceContextMenu = React.lazy(() => import("@/components/chat/space/contextMenu/spaceContextMenu"));

type ChatPagePanelsProps = {
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
  const [isLeftDrawerCollapsePreview, setIsLeftDrawerCollapsePreview] = React.useState(false);
  return (
    <ChatPageLayout
      {...layoutProps}
      setIsLeftDrawerCollapsePreview={setIsLeftDrawerCollapsePreview}
      spaceSidebar={(
        <ChatSpaceSidebar
          {...spaceSidebarProps}
          isLeftDrawerCollapsePreview={isLeftDrawerCollapsePreview}
        />
      )}
      sidePanelContent={<ChatPageSidePanelContent {...sidePanelProps} />}
      mainContent={mainContent}
      subWindowContent={subWindowContent}
    />
  );
}

type ChatPageOverlaysProps = {
  modalsProps: ComponentProps<typeof ChatPageModals>;
  contextMenuProps: ComponentProps<typeof ChatPageContextMenu>;
  spaceContextMenuProps: SpaceContextMenuProps;
}

export function ChatPageOverlays({
  modalsProps,
  contextMenuProps,
  spaceContextMenuProps,
}: ChatPageOverlaysProps) {
  const [hasOpenedSpaceContextMenu, setHasOpenedSpaceContextMenu] = React.useState(Boolean(spaceContextMenuProps.contextMenu));
  React.useEffect(() => {
    if (spaceContextMenuProps.contextMenu) {
      setHasOpenedSpaceContextMenu(true);
    }
  }, [spaceContextMenuProps.contextMenu]);

  const shouldRenderSpaceContextMenu = hasOpenedSpaceContextMenu || Boolean(spaceContextMenuProps.contextMenu);

  return (
    <>
      <ChatPageModals {...modalsProps} />
      <ChatPageContextMenu {...contextMenuProps} />
      {shouldRenderSpaceContextMenu
        ? (
            <React.Suspense fallback={null}>
              <LazySpaceContextMenu {...spaceContextMenuProps} />
            </React.Suspense>
          )
        : null}
    </>
  );
}

import React, { use, useCallback, useEffect, useMemo, useRef } from "react";
import { ChatPageLayoutContext } from "@/components/chat/chatPageLayoutContext";
import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { CommentContext } from "@/components/common/comment/commentContext";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { CommunityContext } from "@/components/community/communityContext";
import { ContentPermissionContext } from "@/components/repository/detail/ContentTab/ContentPermissionContext";

export interface ToastWindowStateProps {
  isOpen: boolean;
  children: React.ReactNode;
  onClose: () => void;
  fullScreen?: boolean;
  transparent?: boolean;
  hiddenScrollbar?: boolean;
}

export function useToastWindow({
  isOpen,
  children,
  onClose,
  fullScreen = false,
  transparent = false,
  hiddenScrollbar = false,
}: ToastWindowStateProps) {
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const chatPageLayoutContext = use(ChatPageLayoutContext);
  const communityContext = use(CommunityContext);
  const contentPermission = use(ContentPermissionContext);
  const commentContext = use(CommentContext);

  const instanceRef = useRef<ReturnType<typeof toastWindow> | null>(null);
  const suppressOnCloseRef = useRef(false);
  const prevOptionsRef = useRef<{ fullScreen: boolean; transparent: boolean; hiddenScrollbar: boolean } | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleClose = useCallback(() => {
    if (suppressOnCloseRef.current) {
      suppressOnCloseRef.current = false;
      return;
    }
    onCloseRef.current();
  }, []);

  const wrappedChildren = useMemo(() => (
    <CommunityContext value={communityContext}>
      <ContentPermissionContext value={contentPermission}>
        <ChatPageLayoutContext value={chatPageLayoutContext}>
          <SpaceContext value={spaceContext}>
            <RoomContext value={roomContext}>
              <CommentContext value={commentContext}>
                {children}
              </CommentContext>
            </RoomContext>
          </SpaceContext>
        </ChatPageLayoutContext>
      </ContentPermissionContext>
    </CommunityContext>
  ), [communityContext, contentPermission, chatPageLayoutContext, spaceContext, roomContext, commentContext, children]);

  useEffect(() => {
    if (!isOpen) {
      if (instanceRef.current) {
        // Prevent re-calling onClose when state is already closing.
        suppressOnCloseRef.current = true;
        instanceRef.current.close();
        instanceRef.current = null;
      }
      prevOptionsRef.current = null;
      return;
    }

    const nextOptions = { fullScreen, transparent, hiddenScrollbar };
    const shouldReopen = !prevOptionsRef.current
      || prevOptionsRef.current.fullScreen !== nextOptions.fullScreen
      || prevOptionsRef.current.transparent !== nextOptions.transparent
      || prevOptionsRef.current.hiddenScrollbar !== nextOptions.hiddenScrollbar;

    if (!instanceRef.current || shouldReopen) {
      if (instanceRef.current) {
        suppressOnCloseRef.current = true;
        instanceRef.current.close();
      }
      instanceRef.current = toastWindow(wrappedChildren, {
        fullScreen,
        transparent,
        hiddenScrollbar,
        onclose: handleClose,
      });
    }
    else {
      instanceRef.current.update(wrappedChildren);
    }

    prevOptionsRef.current = nextOptions;
  }, [isOpen, wrappedChildren, fullScreen, transparent, hiddenScrollbar, handleClose]);

  useEffect(() => {
    return () => {
      if (instanceRef.current) {
        suppressOnCloseRef.current = true;
        instanceRef.current.close();
        instanceRef.current = null;
      }
    };
  }, []);
}

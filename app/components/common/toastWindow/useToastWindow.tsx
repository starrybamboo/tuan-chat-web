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
  showCloseButton?: boolean;
}

export function useToastWindow({
  isOpen,
  children,
  onClose,
  fullScreen = false,
  transparent = false,
  hiddenScrollbar = false,
  showCloseButton = true,
}: ToastWindowStateProps) {
  const roomContext = use(RoomContext);
  const spaceContext = use(SpaceContext);
  const chatPageLayoutContext = use(ChatPageLayoutContext);
  const communityContext = use(CommunityContext);
  const contentPermission = use(ContentPermissionContext);
  const commentContext = use(CommentContext);

  const instanceRef = useRef<ReturnType<typeof toastWindow> | null>(null);
  const suppressOnCloseRef = useRef(false);
  const prevOptionsRef = useRef<{ fullScreen: boolean; transparent: boolean; hiddenScrollbar: boolean; showCloseButton: boolean } | null>(null);
  const onCloseRef = useRef(onClose);
  const isComposingRef = useRef(false);
  const pendingUpdateRef = useRef<React.ReactNode | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (typeof window === "undefined")
      return;
    const onCompositionStart = () => {
      isComposingRef.current = true;
    };
    const onCompositionEnd = () => {
      isComposingRef.current = false;
      if (pendingUpdateRef.current && instanceRef.current) {
        instanceRef.current.update(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
    };
    window.addEventListener("compositionstart", onCompositionStart, true);
    window.addEventListener("compositionend", onCompositionEnd, true);
    return () => {
      window.removeEventListener("compositionstart", onCompositionStart, true);
      window.removeEventListener("compositionend", onCompositionEnd, true);
    };
  }, []);

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
      pendingUpdateRef.current = null;
      prevOptionsRef.current = null;
      return;
    }

    const nextOptions = { fullScreen, transparent, hiddenScrollbar, showCloseButton };
    const shouldReopen = !prevOptionsRef.current
      || prevOptionsRef.current.fullScreen !== nextOptions.fullScreen
      || prevOptionsRef.current.transparent !== nextOptions.transparent
      || prevOptionsRef.current.hiddenScrollbar !== nextOptions.hiddenScrollbar
      || prevOptionsRef.current.showCloseButton !== nextOptions.showCloseButton;

    if (!instanceRef.current || shouldReopen) {
      if (instanceRef.current) {
        suppressOnCloseRef.current = true;
        instanceRef.current.close();
      }
      instanceRef.current = toastWindow(wrappedChildren, {
        fullScreen,
        transparent,
        hiddenScrollbar,
        showCloseButton,
        onclose: handleClose,
      });
    }
    else {
      if (isComposingRef.current) {
        pendingUpdateRef.current = wrappedChildren;
      }
      else {
        instanceRef.current.update(wrappedChildren);
        pendingUpdateRef.current = null;
      }
    }

    prevOptionsRef.current = nextOptions;
  }, [isOpen, wrappedChildren, fullScreen, transparent, hiddenScrollbar, showCloseButton, handleClose]);

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

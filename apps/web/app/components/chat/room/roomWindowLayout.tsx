import type { Room } from "@tuanchat/openapi-client/models/Room";

import { motion, useReducedMotion } from "motion/react";
import React from "react";

import type { UseChatHistoryReturn } from "@/components/chat/infra/localDb/useChatHistory";
import type { RoomContentMode } from "@/components/chat/room/roomHeaderBar";

import ChatFrame from "@/components/chat/chatFrame";
import { ChatPageDocContent } from "@/components/chat/chatPageMainContent";
import RoomComposerPanel from "@/components/chat/room/roomComposerPanel";
import RoomHeaderBar from "@/components/chat/room/roomHeaderBar";
import RoomSideDrawers from "@/components/chat/room/roomSideDrawers";
import SubRoomWindow from "@/components/chat/room/subRoomWindow";
import WebgalPreviewDrawer from "@/components/chat/room/webgalPreviewDrawer";

type ChatFrameProps = React.ComponentProps<typeof ChatFrame>;
type RoomComposerPanelProps = React.ComponentProps<typeof RoomComposerPanel>;

const LazyPixiOverlay = React.lazy(() => import("@/components/chat/shared/components/pixiOverlay"));

const roomContentEnterTransition = {
  type: "tween",
  duration: 0.12,
  ease: "easeOut",
} as const;

const roomContentEnterVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 8,
    y: 4,
    scale: 0.998,
  }),
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
  },
};

export const COMBAT_VISUAL_OVERLAY_STYLE = {
  backgroundColor: "transparent",
  backgroundImage: [
    "linear-gradient(90deg, rgba(234, 179, 8, 0.24) 0, rgba(250, 204, 21, 0.14) 12px, transparent 32px, transparent calc(100% - 32px), rgba(250, 204, 21, 0.14) calc(100% - 12px), rgba(234, 179, 8, 0.24) 100%)",
    "radial-gradient(circle at center, rgba(250, 204, 21, 0.06) 0, rgba(250, 204, 21, 0.02) 46%, transparent 76%)",
    "linear-gradient(180deg, rgba(250, 204, 21, 0.08) 0, transparent 12px, transparent calc(100% - 12px), rgba(250, 204, 21, 0.08) 100%)",
  ].join(", "),
  backgroundSize: "100% 100%, 100% 100%, 100% 100%",
  backgroundPosition: "center, center, center",
  boxShadow: "inset 0 0 0 1px rgba(250, 204, 21, 0.10), inset 0 0 96px rgba(234, 179, 8, 0.08)",
} as const;

type RoomWindowLayoutProps = {
  spaceId: number;
  roomId: number;
  roomName?: string;
  room?: Room | null;
  contentMode: RoomContentMode;
  onToggleContentMode: () => void;
  canViewDocContent: boolean;
  onRequestDocImportTextPaste?: (text: string, insertAsPlainText: () => void) => void;
  chatHistory: UseChatHistoryReturn;
  toggleLeftDrawer: () => void;
  isSubWindowOpen?: boolean;
  onToggleSubWindow?: () => void;
  onCloseSubWindow?: () => void;
  backgroundUrl: string | null;
  combatVisualActive: boolean;
  displayedBgUrl: string | null;
  currentEffect: string | null;
  chatFrameProps: ChatFrameProps;
  composerPanelProps: RoomComposerPanelProps;
  hideComposer?: boolean;
  hideSecondaryPanels?: boolean;
  onClearAndReloadAllMessages?: () => void | Promise<void>;
  isReloadingAllMessages?: boolean;
}

export default function RoomWindowLayout({
  spaceId,
  roomId,
  roomName,
  room,
  contentMode,
  onToggleContentMode,
  canViewDocContent,
  onRequestDocImportTextPaste,
  chatHistory,
  toggleLeftDrawer,
  isSubWindowOpen = false,
  onToggleSubWindow,
  onCloseSubWindow,
  backgroundUrl,
  combatVisualActive,
  displayedBgUrl,
  currentEffect,
  chatFrameProps,
  composerPanelProps,
  hideComposer = false,
  hideSecondaryPanels = false,
  onClearAndReloadAllMessages,
  isReloadingAllMessages = false,
}: RoomWindowLayoutProps) {
  const shouldRenderEffectOverlay = Boolean(currentEffect && currentEffect !== "none");
  const prefersReducedMotion = useReducedMotion();
  const contentEnterDirection = contentMode === "doc" ? 1 : -1;

  React.useEffect(() => {
    if (!canViewDocContent) {
      return;
    }
    void import("@/components/messageEditor/MessageEditor");
  }, [canViewDocContent]);

  return (
    <div className="
      flex flex-col size-full shadow-sm min-h-0 relative bg-base-100
    ">
      <div
        className="
          absolute inset-0 bg-cover bg-center bg-no-repeat transition-all
          duration-500 z-0 motion-reduce:transition-none
        "
        style={{
          backgroundImage: displayedBgUrl ? `url('${displayedBgUrl}')` : "none",
          opacity: backgroundUrl ? 1 : 0,
        }}
      />
      <div
        className="
          absolute inset-0 bg-white/30
          dark:bg-base-300/40
          backdrop-blur-xs transition-opacity duration-500 z-0
          motion-reduce:transition-none
        "
        style={{
          opacity: backgroundUrl ? 1 : 0,
        }}
      />
      <div
        className="
          pointer-events-none absolute inset-0 z-0 transition-opacity
          motion-reduce:transition-none
          duration-500
        "
        style={{
          opacity: combatVisualActive ? 1 : 0,
          ...COMBAT_VISUAL_OVERLAY_STYLE,
        }}
      />

      {shouldRenderEffectOverlay && (
        <React.Suspense fallback={null}>
          <LazyPixiOverlay effectName={currentEffect} />
        </React.Suspense>
      )}

      <div className="relative z-10 flex h-full min-h-0">
        <div className="flex-1 min-w-0 flex flex-col h-full min-h-0">
          <RoomHeaderBar
            spaceId={spaceId}
            roomId={roomId}
            roomName={roomName}
            room={room}
            contentMode={contentMode}
            onToggleContentMode={onToggleContentMode}
            toggleLeftDrawer={toggleLeftDrawer}
            isSubWindowOpen={isSubWindowOpen}
            onToggleSubWindow={onToggleSubWindow}
            onCloseSubWindow={onCloseSubWindow}
            onClearAndReloadAllMessages={onClearAndReloadAllMessages}
            isReloadingAllMessages={isReloadingAllMessages}
          />
          <div className="
            flex-1 w-full bg-transparent relative min-h-0 overflow-hidden
          ">
            {contentMode === "doc"
              ? (
                  <motion.div
                    key={`doc:${roomId}`}
                    custom={contentEnterDirection}
                    variants={prefersReducedMotion ? undefined : roomContentEnterVariants}
                    initial={prefersReducedMotion ? { opacity: 0 } : "enter"}
                    animate={prefersReducedMotion ? { opacity: 1 } : "center"}
                    transition={prefersReducedMotion ? { duration: 0.08 } : roomContentEnterTransition}
                    className="
                      absolute inset-0 flex min-w-0 min-h-0 overflow-hidden
                      bg-base-100
                    "
                  >
                    <ChatPageDocContent
                      spaceId={spaceId}
                      docId={String(roomId)}
                      canViewDocs={canViewDocContent}
                      chatHistory={chatHistory}
                      onRequestImportTextPaste={onRequestDocImportTextPaste}
                      showToolbar={false}
                      tcHeaderTitle={roomName}
                      tcHeaderImageFileId={room?.avatarFileId}
                      tcHeaderImageMediaType={room?.avatarMediaType}
                    />
                  </motion.div>
                )
              : (
                  <motion.div
                    key={`room:${roomId}`}
                    custom={contentEnterDirection}
                    variants={prefersReducedMotion ? undefined : roomContentEnterVariants}
                    initial={prefersReducedMotion ? { opacity: 0 } : "enter"}
                    animate={prefersReducedMotion ? { opacity: 1 } : "center"}
                    transition={prefersReducedMotion ? { duration: 0.08 } : roomContentEnterTransition}
                    className="
                      absolute inset-0 flex min-w-0 min-h-0 bg-transparent
                    "
                  >
                    <div className="flex-1 min-w-0 flex flex-col min-h-0" data-tc-doc-ref-drop-zone>
                      <div
                        className="bg-transparent flex-1 min-w-0 min-h-0"
                      >
                        <ChatFrame
                          key={roomId}
                          {...chatFrameProps}
                        />
                      </div>

                      {!hideComposer && <RoomComposerPanel {...composerPanelProps} />}
                    </div>

                    {!hideSecondaryPanels && (
                      <RoomSideDrawers />
                    )}

                    {!hideSecondaryPanels && <WebgalPreviewDrawer />}
                  </motion.div>
                )}
          </div>
        </div>

        {contentMode === "room" && !hideSecondaryPanels && <SubRoomWindow />}
      </div>
    </div>
  );
}

export type { RoomContentMode };

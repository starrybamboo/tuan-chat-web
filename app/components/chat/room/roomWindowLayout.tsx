import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Message } from "../../../../api";
import type { GalAuthoringLocalSnapshot, GalPatchProposal } from "@/components/chat/galgameAi";
import type { RoomContentMode } from "@/components/chat/room/roomHeaderBar";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import React from "react";
import ChatFrame from "@/components/chat/chatFrame";
import { ChatPageDocContent } from "@/components/chat/chatPageMainContent";
import RoomComposerPanel from "@/components/chat/room/roomComposerPanel";
import RoomHeaderBar from "@/components/chat/room/roomHeaderBar";
import RoomSideDrawers from "@/components/chat/room/roomSideDrawers";
import SubRoomWindow from "@/components/chat/room/subRoomWindow";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";

type ChatFrameProps = React.ComponentProps<typeof ChatFrame>;
type RoomComposerPanelProps = React.ComponentProps<typeof RoomComposerPanel>;

const LazyPixiOverlay = React.lazy(() => import("@/components/chat/shared/components/pixiOverlay"));

const roomContentSwitchTransition = {
  type: "spring",
  stiffness: 420,
  damping: 36,
  mass: 0.58,
} as const;

const roomContentSwitchVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 8,
    scale: 0.998,
    filter: "blur(1px)",
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -6,
    scale: 0.999,
    filter: "blur(1px)",
  }),
};

interface RoomWindowLayoutProps {
  spaceId: number;
  roomId: number;
  roomName?: string;
  room?: Room | null;
  contentMode: RoomContentMode;
  onToggleContentMode: () => void;
  canViewDocContent: boolean;
  initialDocMessages: Message[];
  onRemoteDocMessagesSaved?: (messages: Message[]) => void | Promise<void>;
  toggleLeftDrawer: () => void;
  onCloseSubWindow?: () => void;
  backgroundUrl: string | null;
  displayedBgUrl: string | null;
  currentEffect: string | null;
  chatFrameProps: ChatFrameProps;
  composerPanelProps: RoomComposerPanelProps;
  hideComposer?: boolean;
  hideSecondaryPanels?: boolean;
  /** 点击消息区域时，输入框默认切换到哪个发送目标 */
  chatAreaComposerTarget?: "main" | "thread";
  onClearAndReloadAllMessages?: () => void | Promise<void>;
  isReloadingAllMessages?: boolean;
  galAuthoringLocalSnapshot?: GalAuthoringLocalSnapshot;
  onGalPatchProposalGenerated?: (proposal: GalPatchProposal) => void;
}

export default function RoomWindowLayout({
  spaceId,
  roomId,
  roomName,
  room,
  contentMode,
  onToggleContentMode,
  canViewDocContent,
  initialDocMessages,
  onRemoteDocMessagesSaved,
  toggleLeftDrawer,
  onCloseSubWindow,
  backgroundUrl,
  displayedBgUrl,
  currentEffect,
  chatFrameProps,
  composerPanelProps,
  hideComposer = false,
  hideSecondaryPanels = false,
  chatAreaComposerTarget = "main",
  onClearAndReloadAllMessages,
  isReloadingAllMessages = false,
  galAuthoringLocalSnapshot,
  onGalPatchProposalGenerated,
}: RoomWindowLayoutProps) {
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);
  const shouldRenderEffectOverlay = Boolean(currentEffect && currentEffect !== "none");
  const prefersReducedMotion = useReducedMotion();
  const contentSwitchDirection = contentMode === "doc" ? 1 : -1;

  React.useEffect(() => {
    if (!canViewDocContent) {
      return;
    }
    void import("@/components/messageEditor/MessageEditor");
  }, [canViewDocContent]);

  return (
    <div className="flex flex-col h-full w-full shadow-sm min-h-0 relative bg-base-100">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500 z-0"
        style={{
          backgroundImage: displayedBgUrl ? `url('${displayedBgUrl}')` : "none",
          opacity: backgroundUrl ? 1 : 0,
        }}
      />
      <div
        className="absolute inset-0 bg-white/30 dark:bg-slate-950/40 backdrop-blur-xs transition-opacity duration-500 z-0"
        style={{
          opacity: backgroundUrl ? 1 : 0,
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
            roomName={roomName}
            room={room}
            contentMode={contentMode}
            onToggleContentMode={onToggleContentMode}
            toggleLeftDrawer={toggleLeftDrawer}
            onCloseSubWindow={onCloseSubWindow}
            onClearAndReloadAllMessages={onClearAndReloadAllMessages}
            isReloadingAllMessages={isReloadingAllMessages}
          />
          <div className="flex-1 w-full bg-transparent relative min-h-0 overflow-hidden">
            <AnimatePresence initial={false} mode="wait" custom={contentSwitchDirection}>
              {contentMode === "doc"
                ? (
                    <motion.div
                      key="doc"
                      custom={contentSwitchDirection}
                      variants={prefersReducedMotion ? undefined : roomContentSwitchVariants}
                      initial={prefersReducedMotion ? { opacity: 0 } : "enter"}
                      animate={prefersReducedMotion ? { opacity: 1 } : "center"}
                      exit={prefersReducedMotion ? { opacity: 0 } : "exit"}
                      transition={prefersReducedMotion ? { duration: 0.12 } : roomContentSwitchTransition}
                      className="absolute inset-0 flex min-w-0 min-h-0 overflow-hidden bg-base-100"
                    >
                      <ChatPageDocContent
                        spaceId={spaceId}
                        docId={String(roomId)}
                        canViewDocs={canViewDocContent}
                        initialMessages={initialDocMessages}
                        onRemoteMessagesSaved={onRemoteDocMessagesSaved}
                        remoteSource="room-cache"
                        showToolbar={false}
                        tcHeaderTitle={roomName}
                        tcHeaderImageFileId={room?.avatarFileId}
                        tcHeaderImageMediaType={room?.avatarMediaType}
                      />
                    </motion.div>
                  )
                : (
                    <motion.div
                      key="room"
                      custom={contentSwitchDirection}
                      variants={prefersReducedMotion ? undefined : roomContentSwitchVariants}
                      initial={prefersReducedMotion ? { opacity: 0 } : "enter"}
                      animate={prefersReducedMotion ? { opacity: 1 } : "center"}
                      exit={prefersReducedMotion ? { opacity: 0 } : "exit"}
                      transition={prefersReducedMotion ? { duration: 0.12 } : roomContentSwitchTransition}
                      className="absolute inset-0 flex min-w-0 min-h-0 bg-transparent"
                    >
                      <div className="flex-1 min-w-0 flex flex-col min-h-0" data-tc-doc-ref-drop-zone>
                        <div
                          className="bg-transparent flex-1 min-w-0 min-h-0"
                          onMouseDown={() => setComposerTarget(chatAreaComposerTarget)}
                        >
                          <ChatFrame
                            key={roomId}
                            {...chatFrameProps}
                          />
                        </div>

                        {!hideComposer && <RoomComposerPanel {...composerPanelProps} />}
                      </div>

                      {!hideSecondaryPanels && (
                        <RoomSideDrawers
                          spaceId={spaceId}
                          roomId={roomId}
                          galAuthoringLocalSnapshot={galAuthoringLocalSnapshot}
                          onGalPatchProposalGenerated={onGalPatchProposalGenerated}
                        />
                      )}
                    </motion.div>
                  )}
            </AnimatePresence>
          </div>
        </div>

        {contentMode === "room" && !hideSecondaryPanels && <SubRoomWindow />}
      </div>
    </div>
  );
}

export type { RoomContentMode };

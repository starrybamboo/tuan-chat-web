import type { Room } from "@tuanchat/openapi-client/models/Room";
import type { Message } from "../../../../api";
import type { GalAuthoringLocalSnapshot, GalPatchProposal } from "@/components/chat/galgameAi";
import type { UseChatHistoryReturn } from "@/components/chat/infra/localDb/useChatHistory";
import type { RoomContentMode } from "@/components/chat/room/roomHeaderBar";
import { motion, useReducedMotion } from "motion/react";
import React from "react";
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

interface RoomWindowLayoutProps {
  spaceId: number;
  roomId: number;
  roomName?: string;
  room?: Room | null;
  contentMode: RoomContentMode;
  onToggleContentMode: () => void;
  canViewDocContent: boolean;
  initialDocMessages: Message[];
  onRequestDocImportTextPaste?: (text: string, insertAsPlainText: () => void) => void;
  onRemoteDocMessagesSaved?: (messages: Message[]) => void | Promise<void>;
  chatHistory?: UseChatHistoryReturn;
  toggleLeftDrawer: () => void;
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
  onRequestDocImportTextPaste,
  onRemoteDocMessagesSaved,
  chatHistory,
  toggleLeftDrawer,
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
  galAuthoringLocalSnapshot,
  onGalPatchProposalGenerated,
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
          duration-500 z-0
        "
        style={{
          backgroundImage: displayedBgUrl ? `url('${displayedBgUrl}')` : "none",
          opacity: backgroundUrl ? 1 : 0,
        }}
      />
      <div
        className="
          absolute inset-0 bg-white/30
          dark:bg-slate-950/40
          backdrop-blur-xs transition-opacity duration-500 z-0
        "
        style={{
          opacity: backgroundUrl ? 1 : 0,
        }}
      />
      <div
        className="
          pointer-events-none absolute inset-0 z-0 transition-opacity
          duration-500
        "
        style={{
          opacity: combatVisualActive ? 1 : 0,
          backgroundColor: "rgba(24, 14, 10, 0.16)",
          backgroundImage: [
            "linear-gradient(90deg, rgba(127, 29, 29, 0.56) 0, rgba(180, 83, 9, 0.34) 12px, transparent 32px, transparent calc(100% - 32px), rgba(180, 83, 9, 0.34) calc(100% - 12px), rgba(127, 29, 29, 0.56) 100%)",
            "radial-gradient(circle at center, rgba(245, 158, 11, 0.14) 0, rgba(245, 158, 11, 0.05) 46%, transparent 76%)",
            "linear-gradient(180deg, rgba(245, 158, 11, 0.16) 0, transparent 12px, transparent calc(100% - 12px), rgba(245, 158, 11, 0.16) 100%)",
          ].join(", "),
          backgroundSize: "100% 100%, 100% 100%, 100% 100%",
          backgroundPosition: "center, center, center",
          boxShadow: "inset 0 0 0 1px rgba(245, 158, 11, 0.16), inset 0 0 120px rgba(127, 29, 29, 0.16)",
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
                      initialMessages={initialDocMessages}
                      onRequestImportTextPaste={onRequestDocImportTextPaste}
                      onRemoteMessagesSaved={onRemoteDocMessagesSaved}
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
                      <RoomSideDrawers
                        spaceId={spaceId}
                        roomId={roomId}
                        galAuthoringLocalSnapshot={galAuthoringLocalSnapshot}
                        onGalPatchProposalGenerated={onGalPatchProposalGenerated}
                      />
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

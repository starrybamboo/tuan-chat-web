import type { DocRefDragPayload } from "@/components/chat/utils/docRef";
import React from "react";
import ChatFrame from "@/components/chat/chatFrame";
import RoomComposerPanel from "@/components/chat/room/roomComposerPanel";
import RoomHeaderBar from "@/components/chat/room/roomHeaderBar";
import RoomSideDrawers from "@/components/chat/room/roomSideDrawers";
import SubRoomWindow from "@/components/chat/room/subRoomWindow";
import PixiOverlay from "@/components/chat/shared/components/pixiOverlay";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";

type ChatFrameProps = React.ComponentProps<typeof ChatFrame>;
type RoomComposerPanelProps = React.ComponentProps<typeof RoomComposerPanel>;

interface RoomWindowLayoutProps {
  roomId: number;
  roomName?: string;
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
  onExportPremiere?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onSendDocCard?: (payload: DocRefDragPayload) => Promise<void> | void;
}

export default function RoomWindowLayout({
  roomId,
  roomName,
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
  onExportPremiere,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onSendDocCard,
}: RoomWindowLayoutProps) {
  const setComposerTarget = useRoomUiStore(state => state.setComposerTarget);

  return (
    <div className="flex flex-col h-full w-full shadow-sm min-h-0 relative bg-base-300">
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

      <PixiOverlay effectName={currentEffect} />

      <div className="relative z-10 flex h-full min-h-0">
        <div className="flex-1 min-w-0 flex flex-col h-full min-h-0">
          <RoomHeaderBar
            roomName={roomName}
            toggleLeftDrawer={toggleLeftDrawer}
            onCloseSubWindow={onCloseSubWindow}
            onExportPremiere={onExportPremiere}
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
          <div className="flex-1 w-full flex bg-transparent relative min-h-0">
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

            {!hideSecondaryPanels && <RoomSideDrawers onSendDocCard={onSendDocCard} />}
          </div>
        </div>

        {!hideSecondaryPanels && <SubRoomWindow onSendDocCard={onSendDocCard} />}
      </div>
    </div>
  );
}

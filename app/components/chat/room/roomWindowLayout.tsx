import type { ClueMessage } from "../../../../api/models/ClueMessage";
import React from "react";

import ChatFrame from "@/components/chat/chatFrame";
import RoomComposerPanel from "@/components/chat/room/roomComposerPanel";
import RoomHeaderBar from "@/components/chat/room/roomHeaderBar";
import RoomSideDrawers from "@/components/chat/room/roomSideDrawers";
import SubRoomWindow from "@/components/chat/room/subRoomWindow";
import PixiOverlay from "@/components/chat/shared/components/pixiOverlay";

type ChatFrameProps = React.ComponentProps<typeof ChatFrame>;
type RoomComposerPanelProps = React.ComponentProps<typeof RoomComposerPanel>;

interface RoomWindowLayoutProps {
  roomId: number;
  roomName?: string;
  toggleLeftDrawer: () => void;
  backgroundUrl: string | null;
  displayedBgUrl: string | null;
  currentEffect: string | null;
  composerTarget: "main" | "thread";
  setComposerTarget: (target: "main" | "thread") => void;
  chatFrameProps: ChatFrameProps;
  composerPanelProps: RoomComposerPanelProps;
  onClueSend: (clue: ClueMessage) => void;
}

export default function RoomWindowLayout({
  roomId,
  roomName,
  toggleLeftDrawer,
  backgroundUrl,
  displayedBgUrl,
  currentEffect,
  composerTarget,
  setComposerTarget,
  chatFrameProps,
  composerPanelProps,
  onClueSend,
}: RoomWindowLayoutProps) {
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
          />
          <div className="flex-1 w-full flex bg-transparent relative min-h-0">
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
              <div
                className={`bg-transparent flex-1 min-w-0 min-h-0 ${composerTarget === "main" ? "" : ""}`}
                onMouseDown={() => setComposerTarget("main")}
              >
                <ChatFrame
                  key={roomId}
                  {...chatFrameProps}
                />
              </div>

              <RoomComposerPanel {...composerPanelProps} />
            </div>

            <RoomSideDrawers onClueSend={onClueSend} />
          </div>
        </div>

        <SubRoomWindow onClueSend={onClueSend} />
      </div>
    </div>
  );
}

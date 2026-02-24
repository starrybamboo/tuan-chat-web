import React from "react";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";
import { SidebarSimpleIcon } from "@/icons";

type ScreenSize = "sm" | "md" | "lg";

interface ChatPageLayoutProps {
  screenSize: ScreenSize;
  isOpenLeftDrawer: boolean;
  shouldShowLeftDrawerToggle: boolean;
  leftDrawerToggleLabel: string;
  toggleLeftDrawer: () => void;
  chatLeftPanelWidth: number;
  setChatLeftPanelWidth: (width: number) => void;
  spaceSidebar: React.ReactNode;
  sidePanelContent: React.ReactNode;
  mainContent: React.ReactNode;
  subWindowContent?: React.ReactNode;
}

export default function ChatPageLayout({
  screenSize,
  isOpenLeftDrawer,
  shouldShowLeftDrawerToggle,
  leftDrawerToggleLabel,
  toggleLeftDrawer,
  chatLeftPanelWidth,
  setChatLeftPanelWidth,
  spaceSidebar,
  sidePanelContent,
  mainContent,
  subWindowContent,
}: ChatPageLayoutProps) {
  return (
    <div className={`flex flex-row flex-1 h-full min-h-0 min-w-0 relative overflow-x-hidden overflow-y-hidden ${screenSize === "sm" ? "bg-base-100" : "bg-base-200"}`}>
      {shouldShowLeftDrawerToggle && (
        <div className="tooltip tooltip-right absolute left-2 top-2 z-50" data-tip={leftDrawerToggleLabel}>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-square bg-base-100/80"
            onClick={toggleLeftDrawer}
            aria-label={leftDrawerToggleLabel}
            aria-pressed={Boolean(isOpenLeftDrawer)}
          >
            <SidebarSimpleIcon />
          </button>
        </div>
      )}
      {screenSize === "sm"
        ? (
            <>
              <OpenAbleDrawer
                isOpen={isOpenLeftDrawer}
                className="h-full z-10 w-full bg-base-200"
                initialWidth={chatLeftPanelWidth}
                minWidth={200}
                maxWidth={700}
                onWidthChange={setChatLeftPanelWidth}
                handlePosition="right"
              >
                <div className="h-full flex flex-col w-full min-w-0 relative">
                  <div className="flex flex-row w-full min-w-0 flex-1 min-h-0">
                    {spaceSidebar}
                    {sidePanelContent}
                  </div>
                  <div
                    id="chat-sidebar-user-card"
                    className="absolute left-2 right-2 bottom-2 z-20 pointer-events-auto"
                  />
                </div>
              </OpenAbleDrawer>
              <div
                className={`flex-1 min-h-0 min-w-0 transition-opacity ${isOpenLeftDrawer ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                aria-hidden={isOpenLeftDrawer}
              >
                {mainContent}
              </div>
            </>
          )
        : (
            <>
              <div className="flex flex-row flex-1 h-full min-w-0 overflow-visible bg-base-200 rounded-tl-xl">
                <div className="flex flex-col bg-base-200 h-full relative">
                  <div className="flex flex-row flex-1 min-h-0">
                    <div className="bg-base-200 h-full">
                      {spaceSidebar}
                    </div>
                    <OpenAbleDrawer
                      isOpen={isOpenLeftDrawer}
                      className="h-full z-10 w-full bg-base-200"
                      initialWidth={chatLeftPanelWidth}
                      minWidth={200}
                      maxWidth={700}
                      onWidthChange={setChatLeftPanelWidth}
                      handlePosition="right"
                    >
                      <div className="h-full flex flex-row w-full min-w-0 rounded-tl-xl">
                        {sidePanelContent}
                      </div>
                    </OpenAbleDrawer>
                  </div>
                  <div
                    id="chat-sidebar-user-card"
                    className="absolute left-2 right-2 bottom-2 z-20 pointer-events-auto"
                  />
                </div>
                <div className="flex-1 min-w-0 min-h-0">
                  {mainContent}
                </div>
                {subWindowContent}
              </div>
            </>
          )}
    </div>
  );
}

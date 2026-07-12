import React from "react";

import { OpenAbleDrawer } from "@/components/common/openableDrawer";

type ScreenSize = "sm" | "md" | "lg";

type ChatPageLayoutProps = {
  screenSize: ScreenSize;
  isOpenLeftDrawer: boolean;
  toggleLeftDrawer: () => void;
  chatLeftPanelWidth: number;
  setChatLeftPanelWidth: (width: number) => void;
  setIsLeftDrawerCollapsePreview?: (isPreviewingCollapse: boolean) => void;
  spaceSidebar: React.ReactNode;
  sidePanelContent?: React.ReactNode;
  mainContent: React.ReactNode;
  subWindowContent?: React.ReactNode;
}

export default function ChatPageLayout({
  screenSize,
  isOpenLeftDrawer,
  toggleLeftDrawer,
  chatLeftPanelWidth,
  setChatLeftPanelWidth,
  setIsLeftDrawerCollapsePreview,
  spaceSidebar,
  sidePanelContent,
  mainContent,
  subWindowContent,
}: ChatPageLayoutProps) {
  const hasSidePanel = sidePanelContent != null;

  return (
    <div
      className={`
        flex flex-row flex-1 h-full min-h-0 min-w-0 relative overflow-hidden
        ${screenSize === "sm" ? `
          bg-base-100 pt-(--tc-safe-area-top) pb-(--tc-safe-area-bottom)
        ` : `bg-base-200`}
      `}
    >
      {screenSize === "sm"
        ? (
            <>
              <div className="bg-base-200 h-full shrink-0 z-20">
                {spaceSidebar}
              </div>
              <div className="flex-1 relative min-h-0 min-w-0">
                {hasSidePanel
                  ? (
                      <OpenAbleDrawer
                        isOpen={isOpenLeftDrawer}
                        overWrite
                        className="size-full z-10 bg-base-200"
                        initialWidth={chatLeftPanelWidth}
                        minWidth={200}
                        maxWidth={700}
                        onWidthChange={setChatLeftPanelWidth}
                        onCollapseBelowMin={toggleLeftDrawer}
                        onDragCollapsePreviewChange={setIsLeftDrawerCollapsePreview}
                        handlePosition="right"
                      >
                        <div className="size-full flex flex-col min-w-0 relative">
                          <div className="flex flex-row w-full min-w-0 flex-1 min-h-0">
                            {sidePanelContent}
                          </div>
                          <div
                            id="chat-sidebar-user-card"
                            className="
                              absolute inset-x-2 bottom-2 z-20 pointer-events-auto
                            "
                            style={{ bottom: "max(0.5rem, var(--tc-safe-area-bottom))" }}
                          />
                        </div>
                      </OpenAbleDrawer>
                    )
                  : null}
                <div
                  className={`
                    h-full min-h-0 min-w-0 transition-opacity
                    ${hasSidePanel && isOpenLeftDrawer ? `opacity-0 pointer-events-none` : `
                      opacity-100
                    `}
                  `}
                  aria-hidden={isOpenLeftDrawer}
                >
                  {mainContent}
                </div>
              </div>
            </>
          )
        : (
            <>
              <div className="
                flex flex-row flex-1 h-full min-w-0 overflow-visible bg-base-200
                rounded-tl-xl
              ">
                <div className="flex flex-col bg-base-200 h-full relative">
                  <div className="flex flex-row flex-1 min-h-0">
                    <div className="bg-base-200 h-full">
                      {spaceSidebar}
                    </div>
                    {hasSidePanel
                      ? (
                          <OpenAbleDrawer
                            isOpen={isOpenLeftDrawer}
                            className="size-full z-10 bg-base-200"
                            initialWidth={chatLeftPanelWidth}
                            minWidth={200}
                            maxWidth={700}
                            minRemainingWidth={520}
                            onWidthChange={setChatLeftPanelWidth}
                            onCollapseBelowMin={toggleLeftDrawer}
                            onDragCollapsePreviewChange={setIsLeftDrawerCollapsePreview}
                            handlePosition="right"
                          >
                            <div className="
                              size-full flex flex-row min-w-0 rounded-tl-xl
                            ">
                              {sidePanelContent}
                            </div>
                          </OpenAbleDrawer>
                        )
                      : null}
                  </div>
                  <div
                    id="chat-sidebar-user-card"
                    className="
                      absolute inset-x-2 bottom-2 z-20 pointer-events-auto
                    "
                    style={{ bottom: "max(0.5rem, var(--tc-safe-area-bottom))" }}
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

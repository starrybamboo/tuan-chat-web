import React from "react";

import { isRunSideDrawerState } from "@/components/chat/room/runSideDrawerState";
import WebGALPreview from "@/components/chat/shared/webgal/webGALPreview";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";

type WebgalPreviewPanelProps = {
  className?: string;
  isResizing?: boolean;
};

export function WebgalPreviewPanel({
  className = "",
  isResizing = false,
}: WebgalPreviewPanelProps) {
  const setWebgalOpen = useSideDrawerStore(state => state.setWebgalOpen);
  const previewUrl = useRealtimeRenderStore(state => state.previewUrl);

  const close = React.useCallback(() => {
    setWebgalOpen(false);
  }, [setWebgalOpen]);

  return (
    <div className={`
      h-full min-h-0 bg-base-100 shadow-none
      ${className}
    `}>
      <WebGALPreview
        previewUrl={previewUrl}
        isResizing={isResizing}
        onClose={close}
        className="h-full"
      />
    </div>
  );
}

function WebgalPreviewDrawerImpl() {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const webgalOpen = useSideDrawerStore(state => state.webgalOpen);
  const subRoomWindowWidth = useDrawerPreferenceStore(state => state.subRoomWindowWidth);
  const setSubRoomWindowWidth = useDrawerPreferenceStore(state => state.setSubRoomWindowWidth);
  const shouldRenderStandaloneDrawer = webgalOpen && !isRunSideDrawerState(sideDrawerState);

  return (
    <OpenAbleDrawer
      isOpen={shouldRenderStandaloneDrawer}
      className="h-full shrink-0"
      width={subRoomWindowWidth}
      initialWidth={subRoomWindowWidth}
      minWidth={560}
      maxWidth={1100}
      minRemainingWidth={520}
      onWidthChange={setSubRoomWindowWidth}
      handlePosition="left"
      animationDuration={0.16}
    >
      <WebgalPreviewPanel className="border-l border-base-300" />
    </OpenAbleDrawer>
  );
}

const WebgalPreviewDrawer = React.memo(WebgalPreviewDrawerImpl);
export default WebgalPreviewDrawer;

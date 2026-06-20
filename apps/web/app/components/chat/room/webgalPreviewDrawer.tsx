import React from "react";

import WebGALPreview from "@/components/chat/shared/webgal/webGALPreview";
import { useDrawerPreferenceStore } from "@/components/chat/stores/drawerPreferenceStore";
import { useRealtimeRenderStore } from "@/components/chat/stores/realtimeRenderStore";
import { useSideDrawerStore } from "@/components/chat/stores/sideDrawerStore";
import { OpenAbleDrawer } from "@/components/common/openableDrawer";

function WebgalPreviewDrawerImpl() {
  const sideDrawerState = useSideDrawerStore(state => state.state);
  const setSideDrawerState = useSideDrawerStore(state => state.setState);
  const webgalDrawerWidth = useDrawerPreferenceStore(state => state.webgalDrawerWidth);
  const setWebgalDrawerWidth = useDrawerPreferenceStore(state => state.setWebgalDrawerWidth);
  const previewUrl = useRealtimeRenderStore(state => state.previewUrl);

  const close = React.useCallback(() => {
    if (sideDrawerState === "webgal") {
      setSideDrawerState("none");
    }
  }, [setSideDrawerState, sideDrawerState]);

  return (
    <OpenAbleDrawer
      isOpen={sideDrawerState === "webgal"}
      className="h-full shrink-0"
      initialWidth={webgalDrawerWidth}
      minWidth={360}
      maxWidth={900}
      minRemainingWidth={520}
      onWidthChange={setWebgalDrawerWidth}
      handlePosition="left"
      animationDuration={0.16}
    >
      <div className="
        h-full min-h-0 border-l border-base-300 bg-base-100 shadow-none
      ">
        <WebGALPreview
          previewUrl={previewUrl}
          onClose={close}
          className="h-full"
        />
      </div>
    </OpenAbleDrawer>
  );
}

const WebgalPreviewDrawer = React.memo(WebgalPreviewDrawerImpl);
export default WebgalPreviewDrawer;

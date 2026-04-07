import type { DocMode } from "@blocksuite/affine/model";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BlocksuiteFrameToHostPayload } from "./shared/frameProtocol";

import { isBlocksuiteDebugEnabled } from "./shared/debugFlags";
import {
  isBlocksuiteDocMode,
  isBlocksuiteFrameTheme,
  postBlocksuiteFrameMessage,
  readBlocksuiteFrameMessageFromEvent,
} from "./shared/frameProtocol";

type BlocksuiteFrameProtocolParams = {
  instanceId: string;
  frameParams: {
    workspaceId: string;
    docId: string;
    spaceId?: number;
    readOnly: boolean;
    tcHeaderEnabled: boolean;
    tcHeaderTitle?: string;
    tcHeaderImageUrl?: string;
    allowModeSwitch: boolean;
    fullscreenEdgeless: boolean;
    forcedMode: DocMode;
  };
};

function parseBool01(v: string | null | undefined): boolean {
  return v === "1" || v === "true";
}

export function readInitialBlocksuiteFrameProtocolState(search = typeof window === "undefined" ? "" : window.location.search): BlocksuiteFrameProtocolParams {
  const sp = new URLSearchParams(search);
  const rawSpaceId = sp.get("spaceId");
  const n = rawSpaceId ? Number(rawSpaceId) : Number.NaN;
  const spaceId = Number.isFinite(n) ? n : undefined;

  return {
    instanceId: sp.get("instanceId") ?? "",
    frameParams: {
      workspaceId: sp.get("workspaceId") ?? "",
      docId: sp.get("docId") ?? "",
      spaceId,
      readOnly: parseBool01(sp.get("readOnly")),
      tcHeaderEnabled: parseBool01(sp.get("tcHeader")),
      tcHeaderTitle: sp.get("tcHeaderTitle") ?? undefined,
      tcHeaderImageUrl: sp.get("tcHeaderImageUrl") ?? undefined,
      allowModeSwitch: parseBool01(sp.get("allowModeSwitch")),
      fullscreenEdgeless: parseBool01(sp.get("fullscreenEdgeless")),
      forcedMode: (sp.get("mode") === "edgeless" ? "edgeless" : "page") as DocMode,
    },
  };
}

export function useBlocksuiteFrameProtocol() {
  const initialState = useMemo(() => readInitialBlocksuiteFrameProtocolState(), []);
  const instanceId = initialState.instanceId;
  const [frameParams, setFrameParams] = useState(initialState.frameParams);

  const postToParent = useCallback((payload: BlocksuiteFrameToHostPayload) => {
    if (typeof window === "undefined") {
      return false;
    }

    return postBlocksuiteFrameMessage({
      targetWindow: window.parent,
      instanceId,
      payload,
    });
  }, [instanceId]);

  useEffect(() => {
    if (typeof window === "undefined")
      return;
    if (!isBlocksuiteDebugEnabled())
      return;

    (globalThis as { __tcBlocksuiteDebugLog?: (entry: unknown) => void }).__tcBlocksuiteDebugLog = (entry) => {
      postToParent({
        type: "debug-log",
        entry,
      });
    };

    return () => {
      try {
        delete (globalThis as { __tcBlocksuiteDebugLog?: unknown }).__tcBlocksuiteDebugLog;
      }
      catch {
      }
    };
  }, [postToParent]);

  useEffect(() => {
    postToParent({ type: "ready" });
  }, [postToParent]);

  useEffect(() => {
    if (typeof window === "undefined")
      return;

    const expectedOrigin = window.location.origin;
    const expectedSource = window.parent;

    const onMessage = (event: MessageEvent) => {
      const message = readBlocksuiteFrameMessageFromEvent({
        event,
        expectedOrigin,
        expectedSource,
        instanceId,
      });
      if (!message)
        return;

      if (message.type === "theme") {
        if (!isBlocksuiteFrameTheme(message.theme))
          return;
        document.documentElement.dataset.theme = message.theme;
        document.documentElement.classList.toggle("dark", message.theme === "dark");
        document.body.classList.toggle("dark", message.theme === "dark");
        return;
      }

      if (message.type === "sync-params") {
        setFrameParams(prev => ({
          workspaceId: message.workspaceId ?? prev.workspaceId,
          docId: message.docId ?? prev.docId,
          spaceId: typeof message.spaceId === "number" && Number.isFinite(message.spaceId) ? message.spaceId : prev.spaceId,
          readOnly: typeof message.readOnly === "boolean" ? message.readOnly : prev.readOnly,
          tcHeaderEnabled: typeof message.tcHeader === "boolean" ? message.tcHeader : prev.tcHeaderEnabled,
          tcHeaderTitle: message.tcHeaderTitle ?? prev.tcHeaderTitle,
          tcHeaderImageUrl: message.tcHeaderImageUrl ?? prev.tcHeaderImageUrl,
          allowModeSwitch: typeof message.allowModeSwitch === "boolean" ? message.allowModeSwitch : prev.allowModeSwitch,
          fullscreenEdgeless: typeof message.fullscreenEdgeless === "boolean" ? message.fullscreenEdgeless : prev.fullscreenEdgeless,
          forcedMode: isBlocksuiteDocMode(message.mode) ? message.mode : prev.forcedMode,
        }));
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [instanceId]);

  return {
    instanceId,
    frameParams,
    postToParent,
  };
}

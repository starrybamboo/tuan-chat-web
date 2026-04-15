import type { DocMode } from "@blocksuite/affine/model";

import type { DescriptionEntityType } from "@/components/chat/infra/blocksuite/description/descriptionDocId";
import type { BlocksuiteDocHeader } from "@/components/chat/infra/blocksuite/document/docHeader";

export const BLOCKSUITE_FRAME_MESSAGE_NAMESPACE = "tc-blocksuite-frame";

export type BlocksuiteFrameTheme = "light" | "dark";
export type BlocksuiteFrameMentionTargetKind = "user" | "role";

export type BlocksuiteFrameSyncParams = {
  workspaceId: string;
  docId: string;
  spaceId?: number;
  readOnly: boolean;
  allowModeSwitch: boolean;
  fullscreenEdgeless: boolean;
  mode: DocMode;
  tcHeader: boolean;
  tcHeaderTitle?: string;
  tcHeaderImageUrl?: string;
};

export type BlocksuiteHostToFramePayload
  = | ({
    type: "sync-params";
  } & BlocksuiteFrameSyncParams)
  | {
    type: "theme";
    theme: BlocksuiteFrameTheme;
  };

export type BlocksuiteFrameToHostPayload
  = | {
    type: "ready";
  }
  | {
    type: "render-ready";
  }
  | {
    type: "mode";
    mode: DocMode;
  }
  | {
    type: "navigate";
    to: string;
  }
  | {
    type: "mention-click";
    targetKind: BlocksuiteFrameMentionTargetKind;
    targetId: string;
    anchorRect?: BlocksuiteFrameAnchorRect | null;
  }
  | {
    type: "mention-hover";
    state: "enter" | "leave";
    targetKind: BlocksuiteFrameMentionTargetKind;
    targetId: string;
    anchorRect?: BlocksuiteFrameAnchorRect | null;
  }
  | {
    type: "tc-header";
    docId: string;
    entityType?: DescriptionEntityType;
    entityId?: number;
    header: BlocksuiteDocHeader;
  }
  | {
    type: "debug-log";
    entry: unknown;
  };

export type BlocksuiteFrameMessage
  = | BlocksuiteFrameEnvelope<BlocksuiteHostToFramePayload>
    | BlocksuiteFrameEnvelope<BlocksuiteFrameToHostPayload>;

export type BlocksuiteFrameAnchorRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type BlocksuiteFrameEnvelope<TPayload extends { type: string }> = TPayload & {
  tc: typeof BLOCKSUITE_FRAME_MESSAGE_NAMESPACE;
  instanceId?: string;
};

type BlocksuiteFrameMessageTarget = Pick<Window, "postMessage"> | null | undefined;

export function getBlocksuiteFrameTargetOrigin(): string {
  if (typeof window === "undefined") {
    return "*";
  }

  const origin = window.location.origin;
  if (!origin || origin === "null") {
    return "*";
  }
  return origin;
}

export function createBlocksuiteFrameMessage<TPayload extends BlocksuiteHostToFramePayload | BlocksuiteFrameToHostPayload>(
  instanceId: string | undefined,
  payload: TPayload,
): BlocksuiteFrameEnvelope<TPayload> {
  return {
    tc: BLOCKSUITE_FRAME_MESSAGE_NAMESPACE,
    ...(instanceId ? { instanceId } : {}),
    ...payload,
  };
}

export function postBlocksuiteFrameMessage<TPayload extends BlocksuiteHostToFramePayload | BlocksuiteFrameToHostPayload>(params: {
  targetWindow: BlocksuiteFrameMessageTarget;
  instanceId?: string;
  payload: TPayload;
  targetOrigin?: string;
}): boolean {
  const {
    targetWindow,
    instanceId,
    payload,
    targetOrigin,
  } = params;

  if (!targetWindow) {
    return false;
  }

  try {
    targetWindow.postMessage(
      createBlocksuiteFrameMessage(instanceId, payload),
      targetOrigin ?? getBlocksuiteFrameTargetOrigin(),
    );
    return true;
  }
  catch {
    return false;
  }
}

export function parseBlocksuiteFrameMessage(data: unknown): BlocksuiteFrameMessage | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const message = data as Partial<BlocksuiteFrameMessage>;
  if (message.tc !== BLOCKSUITE_FRAME_MESSAGE_NAMESPACE) {
    return null;
  }

  if (typeof message.type !== "string" || !message.type) {
    return null;
  }

  return message as BlocksuiteFrameMessage;
}

export function isBlocksuiteFrameOriginMatch(eventOrigin: string, expectedOrigin: string | null | undefined): boolean {
  if (!expectedOrigin || expectedOrigin === "null") {
    return true;
  }
  return eventOrigin === expectedOrigin;
}

export function isBlocksuiteFrameSourceMatch(
  eventSource: MessageEventSource | null,
  expectedSource: MessageEventSource | null | undefined,
): boolean {
  if (!expectedSource) {
    return false;
  }
  return eventSource === expectedSource;
}

export function readBlocksuiteFrameMessageFromEvent(params: {
  event: MessageEvent;
  expectedOrigin?: string | null;
  expectedSource?: MessageEventSource | null;
  instanceId?: string;
}): BlocksuiteFrameMessage | null {
  const {
    event,
    expectedOrigin,
    expectedSource,
    instanceId,
  } = params;

  if (!isBlocksuiteFrameOriginMatch(event.origin, expectedOrigin)) {
    return null;
  }

  if (!isBlocksuiteFrameSourceMatch(event.source, expectedSource)) {
    return null;
  }

  const message = parseBlocksuiteFrameMessage(event.data);
  if (!message) {
    return null;
  }

  if (instanceId && message.instanceId && message.instanceId !== instanceId) {
    return null;
  }

  return message;
}

export function isBlocksuiteDocMode(value: unknown): value is DocMode {
  return value === "page" || value === "edgeless";
}

export function isBlocksuiteFrameTheme(value: unknown): value is BlocksuiteFrameTheme {
  return value === "light" || value === "dark";
}

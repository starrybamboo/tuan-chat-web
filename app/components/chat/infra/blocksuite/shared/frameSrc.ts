import type { DocMode } from "@blocksuite/affine/model";

export type BlocksuiteFrameRouteParams = {
  instanceId?: string;
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
  prewarmOnly?: boolean;
};

export function createBlocksuiteFramePrewarmParams(): BlocksuiteFrameRouteParams {
  return {
    workspaceId: "__tc_blocksuite_prewarm__",
    docId: "__tc_blocksuite_prewarm__",
    readOnly: true,
    allowModeSwitch: false,
    fullscreenEdgeless: false,
    mode: "page",
    tcHeader: false,
    prewarmOnly: true,
  };
}

export function buildBlocksuiteFrameSrc(params: BlocksuiteFrameRouteParams): string {
  const search = new URLSearchParams();
  const entries: Array<[string, string | number | boolean | undefined]> = [
    ["instanceId", params.instanceId],
    ["workspaceId", params.workspaceId],
    ["docId", params.docId],
    ["spaceId", typeof params.spaceId === "number" && Number.isFinite(params.spaceId) ? params.spaceId : undefined],
    ["readOnly", params.readOnly ? "1" : "0"],
    ["allowModeSwitch", params.allowModeSwitch ? "1" : "0"],
    ["fullscreenEdgeless", params.fullscreenEdgeless ? "1" : "0"],
    ["mode", params.mode],
    ["tcHeader", params.tcHeader ? "1" : "0"],
    ["tcHeaderTitle", params.tcHeaderTitle],
    ["tcHeaderImageUrl", params.tcHeaderImageUrl],
    ["prewarmOnly", params.prewarmOnly ? "1" : undefined],
  ];

  for (const [key, value] of entries) {
    if (value === undefined) {
      continue;
    }
    search.set(key, String(value));
  }
  return `/blocksuite-frame?${search.toString()}`;
}

export function createBlocksuiteFramePrewarmSrc(): string {
  return buildBlocksuiteFrameSrc(createBlocksuiteFramePrewarmParams());
}

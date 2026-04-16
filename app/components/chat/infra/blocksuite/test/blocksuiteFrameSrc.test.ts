import { describe, expect, it } from "vitest";

import {
  buildBlocksuiteFrameSrc,
  createBlocksuiteFramePrewarmParams,
  createBlocksuiteFramePrewarmSrc,
} from "../shared/frameSrc";

describe("blocksuiteFrameSrc", () => {
  it("会把 route 参数编码成稳定的 frame src", () => {
    expect(buildBlocksuiteFrameSrc({
      instanceId: "instance-1",
      workspaceId: "space:1",
      docId: "doc-1",
      spaceId: 12,
      readOnly: true,
      allowModeSwitch: false,
      fullscreenEdgeless: true,
      mode: "edgeless",
      tcHeader: true,
      tcHeaderTitle: "封面标题",
      tcHeaderImageUrl: "https://example.com/cover.png",
      prewarmOnly: true,
    })).toBe("/blocksuite-frame?instanceId=instance-1&workspaceId=space%3A1&docId=doc-1&spaceId=12&readOnly=1&allowModeSwitch=0&fullscreenEdgeless=1&mode=edgeless&tcHeader=1&tcHeaderTitle=%E5%B0%81%E9%9D%A2%E6%A0%87%E9%A2%98&tcHeaderImageUrl=https%3A%2F%2Fexample.com%2Fcover.png&prewarmOnly=1");
  });

  it("会生成共享 warm frame 的占位参数", () => {
    expect(createBlocksuiteFramePrewarmParams()).toEqual({
      workspaceId: "__tc_blocksuite_prewarm__",
      docId: "__tc_blocksuite_prewarm__",
      readOnly: true,
      allowModeSwitch: false,
      fullscreenEdgeless: false,
      mode: "page",
      tcHeader: false,
      prewarmOnly: true,
    });

    expect(createBlocksuiteFramePrewarmSrc()).toBe("/blocksuite-frame?workspaceId=__tc_blocksuite_prewarm__&docId=__tc_blocksuite_prewarm__&readOnly=1&allowModeSwitch=0&fullscreenEdgeless=0&mode=page&tcHeader=0&prewarmOnly=1");
  });
});

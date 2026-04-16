import { describe, expect, it } from "vitest";

import {
  BLOCKSUITE_FRAME_MESSAGE_NAMESPACE,
  createBlocksuiteFrameMessage,
  parseBlocksuiteFrameMessage,
  readBlocksuiteFrameMessageFromEvent,
} from "../shared/frameProtocol";
import { readInitialBlocksuiteFrameProtocolState } from "../useBlocksuiteFrameProtocol";

describe("blocksuiteFrameProtocol", () => {
  it("会生成统一 envelope", () => {
    const message = createBlocksuiteFrameMessage("instance-1", {
      type: "theme",
      theme: "dark",
    });

    expect(message).toEqual({
      tc: BLOCKSUITE_FRAME_MESSAGE_NAMESPACE,
      instanceId: "instance-1",
      type: "theme",
      theme: "dark",
    });
  });

  it("只解析合法 namespace 的消息", () => {
    expect(parseBlocksuiteFrameMessage({
      tc: BLOCKSUITE_FRAME_MESSAGE_NAMESPACE,
      instanceId: "instance-1",
      type: "ready",
    })).toEqual(expect.objectContaining({
      type: "ready",
      instanceId: "instance-1",
    }));

    expect(parseBlocksuiteFrameMessage({
      tc: "other-channel",
      type: "ready",
    })).toBeNull();
  });

  it("会保留 mention 目标类型与目标 id", () => {
    expect(parseBlocksuiteFrameMessage({
      tc: BLOCKSUITE_FRAME_MESSAGE_NAMESPACE,
      type: "mention-hover",
      state: "enter",
      targetKind: "role",
      targetId: "101",
      anchorRect: {
        left: 1,
        top: 2,
        right: 3,
        bottom: 4,
        width: 5,
        height: 6,
      },
    })).toEqual(expect.objectContaining({
      type: "mention-hover",
      state: "enter",
      targetKind: "role",
      targetId: "101",
    }));
  });

  it("会校验 origin、source 和 instanceId", () => {
    const expectedSource = {} as MessageEventSource;
    const event = {
      origin: "http://localhost:5173",
      source: expectedSource,
      data: {
        tc: BLOCKSUITE_FRAME_MESSAGE_NAMESPACE,
        instanceId: "instance-1",
        type: "render-ready",
      },
    } as MessageEvent;

    expect(readBlocksuiteFrameMessageFromEvent({
      event,
      expectedOrigin: "http://localhost:5173",
      expectedSource,
      instanceId: "instance-1",
    })).toEqual(expect.objectContaining({
      type: "render-ready",
    }));

    expect(readBlocksuiteFrameMessageFromEvent({
      event,
      expectedOrigin: "http://localhost:3000",
      expectedSource,
      instanceId: "instance-1",
    })).toBeNull();

    expect(readBlocksuiteFrameMessageFromEvent({
      event,
      expectedOrigin: "http://localhost:5173",
      expectedSource: {} as MessageEventSource,
      instanceId: "instance-1",
    })).toBeNull();

    expect(readBlocksuiteFrameMessageFromEvent({
      event,
      expectedOrigin: "http://localhost:5173",
      expectedSource,
      instanceId: "instance-2",
    })).toBeNull();
  });

  it("会解析首开 query 里的 prewarmOnly", () => {
    const state = readInitialBlocksuiteFrameProtocolState("?instanceId=warm-1&workspaceId=space-1&docId=doc-1&mode=edgeless&readOnly=1&allowModeSwitch=1&fullscreenEdgeless=0&tcHeader=1&prewarmOnly=1");

    expect(state).toEqual({
      instanceId: "warm-1",
      frameParams: {
        workspaceId: "space-1",
        docId: "doc-1",
        spaceId: undefined,
        readOnly: true,
        tcHeaderEnabled: true,
        tcHeaderTitle: undefined,
        tcHeaderImageUrl: undefined,
        allowModeSwitch: true,
        fullscreenEdgeless: false,
        forcedMode: "edgeless",
        prewarmOnly: true,
      },
    });
  });
});

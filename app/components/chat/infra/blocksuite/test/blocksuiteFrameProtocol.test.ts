import { describe, expect, it } from "vitest";

import {
  BLOCKSUITE_FRAME_MESSAGE_NAMESPACE,
  createBlocksuiteFrameMessage,
  parseBlocksuiteFrameMessage,
  readBlocksuiteFrameMessageFromEvent,
} from "../shared/frameProtocol";

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
});

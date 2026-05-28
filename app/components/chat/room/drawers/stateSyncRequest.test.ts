import { describe, expect, it } from "vitest";

import { STATE_EVENT_VAR_OP } from "@/types/stateEvent";

import { MessageType } from "../../../../../api/wsModels";
import { buildStateSyncMessageRequest } from "./stateSyncRequest";

describe("buildStateSyncMessageRequest", () => {
  it("构造写入目标房间的状态同步快照消息", () => {
    const request = buildStateSyncMessageRequest({
      targetRoomId: 22,
      events: [{
        type: "varOp",
        scope: { kind: "room" },
        key: "threat",
        op: STATE_EVENT_VAR_OP.SET,
        value: 4,
      }],
    });

    expect(request).toEqual({
      roomId: 22,
      content: "状态同步快照",
      messageType: MessageType.STATE_EVENT,
      extra: {
        stateEvent: {
          source: {
            kind: "command",
            commandName: "stateSync",
            parserVersion: "state-event-v1",
          },
          events: [{
            type: "varOp",
            scope: { kind: "room" },
            key: "threat",
            op: "set",
            value: 4,
          }],
        },
      },
    });
  });

  it("拒绝空快照和无效目标房间", () => {
    expect(() => buildStateSyncMessageRequest({
      targetRoomId: 0,
      events: [{ type: "nextTurn" }],
    })).toThrow("目标房间无效");

    expect(() => buildStateSyncMessageRequest({
      targetRoomId: 22,
      events: [],
    })).toThrow("没有可同步的状态");
  });
});

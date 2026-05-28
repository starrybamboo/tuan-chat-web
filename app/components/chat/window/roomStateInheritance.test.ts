import { describe, expect, it } from "vitest";

import { buildCommandStateEventExtra, STATE_EVENT_VAR_OP, toApiMessageExtraWithStateEvent } from "@/types/stateEvent";

import type { ChatMessageResponse } from "../../../../api";

import { MessageType } from "../../../../api/wsModels";
import { buildInheritedRoomStateSyncRequest, toStateRuntimeMessages } from "./roomStateInheritance";

function createHistoryItem(params: {
  events?: Parameters<typeof buildCommandStateEventExtra>[1];
  messageId: number;
  position?: number;
  syncId: number;
  status?: number;
}): ChatMessageResponse {
  return {
    message: {
      messageId: params.messageId,
      syncId: params.syncId,
      position: params.position ?? params.syncId,
      roomId: 1,
      userId: 1,
      status: params.status ?? 0,
      messageType: MessageType.STATE_EVENT,
      content: ".state",
      extra: toApiMessageExtraWithStateEvent(buildCommandStateEventExtra("combat", params.events ?? [])),
    },
  };
}

describe("buildInheritedRoomStateSyncRequest", () => {
  it("把源房间当前状态构造成写入新房间的状态同步消息", () => {
    const request = buildInheritedRoomStateSyncRequest({
      targetRoomId: 22,
      sourceMessages: [
        createHistoryItem({
          messageId: 2,
          syncId: 2,
          events: [{
            type: "varOp",
            scope: { kind: "room" },
            key: "threat",
            op: STATE_EVENT_VAR_OP.SET,
            value: 4,
          }],
        }),
        createHistoryItem({
          messageId: 1,
          syncId: 1,
          events: [{ type: "combatRoundStart" }, { type: "nextTurn" }],
        }),
      ],
    });

    expect(request).toMatchObject({
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
          events: [
            { type: "combatRoundStart" },
            { type: "nextTurn" },
            {
              type: "varOp",
              scope: { kind: "room" },
              key: "threat",
              op: "set",
              value: 4,
            },
          ],
        },
      },
    });
  });

  it("源房间没有可继承状态时返回空", () => {
    const request = buildInheritedRoomStateSyncRequest({
      targetRoomId: 22,
      sourceMessages: [],
    });

    expect(request).toBeNull();
  });
});

describe("toStateRuntimeMessages", () => {
  it("按房间消息顺序整理历史项", () => {
    const messages = toStateRuntimeMessages([
      createHistoryItem({ messageId: 3, syncId: 3, position: 30 }),
      createHistoryItem({ messageId: 1, syncId: 1, position: 10 }),
      createHistoryItem({ messageId: 2, syncId: 2, position: 20 }),
    ]);

    expect(messages.map(message => message.messageId)).toEqual([1, 2, 3]);
  });
});

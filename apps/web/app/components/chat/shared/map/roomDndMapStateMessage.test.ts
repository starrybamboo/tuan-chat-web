import type { ChatMessageResponse } from "../../../../../api";

import { buildCommandStateEventExtra, toApiMessageExtraWithStateEvent } from "@/types/stateEvent";
import { describe, expect, it } from "vitest";

import type { StateEventAtom } from "@/types/stateEvent";

import { MessageType } from "../../../../../api/wsModels";
import {
  buildMapConfigMessageUpdateOperation,
  findLatestUpdatableMapConfigMessage,
} from "./roomDndMapStateMessage";

function createStateMessage(messageId: number, events: StateEventAtom[], roomId = 10): ChatMessageResponse {
  return {
    message: {
      messageId,
      roomId,
      messageType: MessageType.STATE_EVENT,
      content: ".combat map-grid",
      status: 0,
      position: messageId,
      extra: toApiMessageExtraWithStateEvent(buildCommandStateEventExtra("combat", events)),
    },
  } as ChatMessageResponse;
}

describe("roomDndMapStateMessage", () => {
  it("查找清空边界之后最近的单条地图配置消息", () => {
    const firstConfig = createStateMessage(1, [{
      type: "mapConfigUpsert",
      mapFileId: 100,
      gridRows: 10,
      gridCols: 10,
      gridColor: "#808080",
    }]);
    const tokenMove = createStateMessage(2, [{
      type: "mapTokenUpsert",
      roleId: 3,
      rowIndex: 1,
      colIndex: 2,
    }]);

    expect(findLatestUpdatableMapConfigMessage([firstConfig, tokenMove], 10)?.message.messageId).toBe(1);
    expect(findLatestUpdatableMapConfigMessage([
      firstConfig,
      createStateMessage(3, [{ type: "mapConfigClear" }]),
    ], 10)).toBeNull();
  });

  it("不会把包含 token 迁移的地图消息当作可覆盖配置消息", () => {
    const migrationMessage = createStateMessage(1, [
      {
        type: "mapConfigUpsert",
        mapFileId: 100,
        gridRows: 10,
        gridCols: 10,
        gridColor: "#808080",
        clearTokens: true,
      },
      {
        type: "mapTokenUpsert",
        roleId: 3,
        rowIndex: 1,
        colIndex: 2,
      },
    ]);

    expect(findLatestUpdatableMapConfigMessage([migrationMessage], 10)).toBeNull();
  });

  it("构造 update patch 时保留原消息发送者和位置，只替换内容与 extra", () => {
    const source = createStateMessage(9, [{
      type: "mapConfigUpsert",
      mapFileId: 100,
      gridRows: 10,
      gridCols: 10,
      gridColor: "#808080",
    }]).message;
    source.roleId = 12;
    source.avatarId = 13;
    source.position = 22;

    const nextExtra = toApiMessageExtraWithStateEvent(buildCommandStateEventExtra("combat", [{
      type: "mapConfigUpsert",
      mapFileId: 100,
      gridRows: 8,
      gridCols: 10,
      gridColor: "#64748b",
    }]));
    const operation = buildMapConfigMessageUpdateOperation(source, {
      content: ".combat map-grid",
      extra: nextExtra,
    });

    expect(operation).toMatchObject({
      op: "update",
      messageId: 9,
      message: {
        messageType: MessageType.STATE_EVENT,
        content: ".combat map-grid",
        roleId: 12,
        avatarId: 13,
        position: 22,
        extra: nextExtra,
      },
    });
  });
});

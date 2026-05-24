import { describe, expect, it } from "vitest";

import type { Message } from "@tuanchat/openapi-client/models/Message";

import { MESSAGE_TYPE } from "../messageType";
import {
  buildCommandStateEventExtra,
  buildRoleStateEventScope,
  STATE_EVENT_VAR_OP,
} from "../state-event";
import { buildCombatStateRuntime } from "./runtime";

function createStateMessage(
  messageId: number,
  events: Parameters<typeof buildCommandStateEventExtra>[1],
): Pick<Message, "messageId" | "messageType" | "content" | "status" | "extra"> {
  return {
    messageId,
    messageType: MESSAGE_TYPE.STATE_EVENT,
    content: ".combat",
    status: 0,
    extra: {
      stateEvent: buildCommandStateEventExtra("combat", events),
    },
  };
}

describe("buildCombatStateRuntime", () => {
  it("通过 role var 维护先攻值，不再生成参与者列表", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [
          {
            type: "varOp",
            scope: buildRoleStateEventScope(3),
            key: "initiative",
            op: STATE_EVENT_VAR_OP.SET,
            value: 14,
          },
        ]),
      ],
    });

    expect(runtime.participants).toEqual([]);
    expect(runtime.roleVarsByRoleId[3]?.initiative).toBe(14);
    expect(runtime.derivedDisplayValues.rolesByRoleId[3]?.initiative).toBe(14);
  });

  it("按消息顺序回放地图 token 位移和移除", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [
          {
            type: "mapTokenUpsert",
            roleId: 3,
            rowIndex: 1,
            colIndex: 2,
          },
        ]),
        createStateMessage(2, [
          {
            type: "mapTokenUpsert",
            roleId: 3,
            rowIndex: 4,
            colIndex: 5,
          },
          {
            type: "mapTokenRemove",
            roleId: 9,
          },
        ]),
      ],
    });

    expect(runtime.hasMapState).toBe(true);
    expect(runtime.mapTokens).toEqual([{ roleId: 3, rowIndex: 4, colIndex: 5 }]);
    expect(runtime.mapTokensByRoleId[3]).toEqual({ roleId: 3, rowIndex: 4, colIndex: 5 });
  });

  it("combatRoundEnd 会将回合归零", () => {
    const runtime = buildCombatStateRuntime({
      messages: [
        createStateMessage(1, [{ type: "nextTurn" }]),
        createStateMessage(2, [{ type: "combatRoundEnd" }]),
      ],
    });

    expect(runtime.turn).toBe(0);
    expect(runtime.messageSummariesByMessageId[2]?.primaryText).toBe("结束战斗");
    expect(runtime.messageSummariesByMessageId[2]?.detailLines).toContain("结束战斗 · 回合 1 -> 0");
  });
});

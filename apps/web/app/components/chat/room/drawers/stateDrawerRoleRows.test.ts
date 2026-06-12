import { describe, expect, it } from "vitest";

import { buildCommandStateEventExtra, buildRoleStateEventScope, STATE_EVENT_VAR_OP, toApiMessageExtraWithStateEvent } from "@/types/stateEvent";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";

import {
  buildCustomCombatStateKey,
  buildCombatRecordValueRow,
  buildNextCopiedInitiativeRoleName,
  buildRoleAbilityFieldDeletePatch,
  collectCombatInitiativeRecords,
  collectRecordedRoleValueIds,
  compareCombatRoleRowsByInitiative,
  isInlineRoleValueKey,
  parseCustomCombatKvText,
  parseCustomCombatStateKey,
  readCombatRoleInitiativeValue,
  shouldCommitCombatRoleValueEdit,
} from "./stateDrawerRoleRows";

describe("stateDrawerRoleRows", () => {
  it("不把 initiative 作为下方普通变量重复展示", () => {
    expect(isInlineRoleValueKey("initiative")).toBe(false);
    expect(isInlineRoleValueKey(" Initiative ")).toBe(false);
    expect(isInlineRoleValueKey("先攻")).toBe(false);
    expect(isInlineRoleValueKey("先攻值")).toBe(false);
    expect(isInlineRoleValueKey("hp")).toBe(true);
  });

  it("默认按先攻从高到低排序", () => {
    const rows = [
      { initiative: 3, isCurrent: false, roleName: "青" },
      { initiative: 20, isCurrent: false, roleName: "降星驰" },
      { initiative: 0, isCurrent: false, roleName: "测试模板信息" },
    ].sort(compareCombatRoleRowsByInitiative);

    expect(rows.map(row => row.roleName)).toEqual(["降星驰", "青", "测试模板信息"]);
  });

  it("把只有状态事件记录值的角色也纳入战斗卡片候选", () => {
    expect(collectRecordedRoleValueIds({
      3: ["initiative"],
      9: ["hp"],
      [-1]: ["initiative"],
    })).toEqual([3, 9]);
  });

  it("同一角色只保留最新先攻状态消息记录", () => {
    const messages = [10, 11].map((messageId, index) => ({
      message: {
        messageId,
        status: 0,
        messageType: MESSAGE_TYPE.STATE_EVENT,
        extra: toApiMessageExtraWithStateEvent(buildCommandStateEventExtra("combat", [
          {
            type: "varOp",
            scope: buildRoleStateEventScope(3),
            key: "initiative",
            op: STATE_EVENT_VAR_OP.SET,
            value: index + 1,
          },
        ])),
      },
    } as any));

    expect(collectCombatInitiativeRecords(messages)).toMatchObject([
      { initiative: 2, recordId: "11:3:0", roleId: 3, sourceMessageId: 11 },
    ]);
  });

  it("中文先攻状态消息也会形成可删除的独立记录", () => {
    const messages = [{
      message: {
        messageId: 12,
        status: 0,
        messageType: MESSAGE_TYPE.STATE_EVENT,
        extra: toApiMessageExtraWithStateEvent(buildCommandStateEventExtra("combat", [
          {
            type: "varOp",
            scope: buildRoleStateEventScope(7),
            key: "先攻",
            op: STATE_EVENT_VAR_OP.SET,
            value: 50,
          },
        ])),
      },
    } as any];

    expect(collectCombatInitiativeRecords(messages)).toMatchObject([
      { initiative: 50, recordId: "12:7:0", roleId: 7, sourceMessageId: 12 },
    ]);
  });

  it("先攻记录行优先显示角色卡实时 HP，而不是导入消息里的旧 HP", () => {
    expect(buildCombatRecordValueRow({
      baseValues: { hp: 18 },
      derivedValues: { hp: 15 },
      fallbackAbility: { ability: { hp: "18" } },
      key: "hp",
      recordValue: 2,
      valueKeys: ["hp"],
    })).toEqual({
      key: "hp",
      baseValue: 18,
      displayValue: 15,
    });
  });

  it("先攻记录行优先显示角色卡实时先攻，而不是导入消息里的旧先攻", () => {
    expect(buildCombatRecordValueRow({
      baseValues: { initiative: 22 },
      derivedValues: { initiative: 22 },
      fallbackAbility: { skill: { initiative: "22" } },
      key: "initiative",
      recordValue: 8,
      valueKeys: ["initiative", "init", "先攻", "先攻值"],
    })).toEqual({
      key: "initiative",
      baseValue: 22,
      displayValue: 22,
    });
  });

  it("角色卡能力未加载时，先攻记录行保留导入消息里的 HP", () => {
    expect(buildCombatRecordValueRow({
      baseValues: { hp: 0 },
      derivedValues: { hp: 0 },
      key: "hp",
      recordValue: 21,
      valueKeys: ["hp"],
    })).toEqual({
      key: "hp",
      baseValue: 21,
      displayValue: 21,
    });
  });

  it("数值未变化时不提交更新", () => {
    expect(shouldCommitCombatRoleValueEdit(12, 12)).toBe(false);
    expect(shouldCommitCombatRoleValueEdit(12, 13)).toBe(true);
    expect(shouldCommitCombatRoleValueEdit(null, 0)).toBe(true);
  });

  it("重复导入复制角色名使用递增数字后缀", () => {
    expect(buildNextCopiedInitiativeRoleName("青", ["青", "青1", "青2", "青10", "青-1"])).toBe("青11");
    expect(buildNextCopiedInitiativeRoleName("A+B", ["A+B", "A+B1"])).toBe("A+B2");
    expect(buildNextCopiedInitiativeRoleName("  ", [])).toBe("角色1");
  });

  it("能为没有状态消息来源的聚合先攻行构建角色卡字段删除补丁", () => {
    expect(buildRoleAbilityFieldDeletePatch({
      basic: { hp: "10" },
      ability: {},
      skill: { Initiative: "50" },
    }, "initiative")).toEqual({
      skillFields: { Initiative: null },
    });
    expect(buildRoleAbilityFieldDeletePatch({ skill: { 侦查: "60" } }, "initiative")).toBeNull();
  });

  it("读取角色卡中文先攻字段作为战斗先攻", () => {
    expect(readCombatRoleInitiativeValue({ 先攻: 50 })).toBe(50);
    expect(readCombatRoleInitiativeValue({ 先攻值: 40 })).toBe(40);
    expect(readCombatRoleInitiativeValue({ hp: 10 })).toBeNull();
  });

  it("解析自定义战斗 KV 文本", () => {
    expect(parseCustomCombatKvText("hp：50，力量：60")).toEqual({
      entries: [
        { key: "hp", value: 50 },
        { key: "力量", value: 60 },
      ],
    });
    expect(parseCustomCombatKvText("hp 50").error).toContain("无法识别属性");
  });

  it("自定义战斗状态 key 可以往返解析", () => {
    const key = buildCustomCombatStateKey("A", "力量");
    expect(parseCustomCombatStateKey(key)).toEqual({ name: "A", fieldKey: "力量" });
  });
});

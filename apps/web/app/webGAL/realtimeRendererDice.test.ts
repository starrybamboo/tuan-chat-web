import { describe, expect, it } from "vitest";

import {
  buildTrpgDicePerformLines,
  resolveRealtimeDiceMiniAvatarDefault,
  resolveRealtimeDiceRenderMode,
} from "./realtimeRendererDice";

describe("resolveRealtimeDiceRenderMode", () => {
  it("战斗轮中默认使用 TRPG 骰子演出", () => {
    expect(resolveRealtimeDiceRenderMode({
      combatRoundActive: true,
      content: "侦查 42/70 成功",
      hasScriptLines: false,
    })).toBe("trpg");
  });

  it("tRPG 骰点结果会覆盖 dialog/narration，回到特殊骰子演出", () => {
    expect(resolveRealtimeDiceRenderMode({
      combatRoundActive: true,
      content: "射击检定：D100=2/90 极难成功",
      hasScriptLines: false,
      payload: {
        mode: "dialog",
      },
    })).toBe("trpg");

    expect(resolveRealtimeDiceRenderMode({
      combatRoundActive: false,
      content: "射击检定：D100=2/90 极难成功",
      hasScriptLines: false,
      payload: {
        mode: "narration",
      },
    })).toBe("trpg");
  });

  it("非 TRPG 内容仍保留显式 dialog/narration 模式", () => {
    expect(resolveRealtimeDiceRenderMode({
      combatRoundActive: false,
      content: "今天下雨了",
      hasScriptLines: false,
      payload: {
        mode: "dialog",
      },
    })).toBe("dialog");
  });

  it("script 模式缺少脚本行时回退到当前状态的自动模式", () => {
    expect(resolveRealtimeDiceRenderMode({
      combatRoundActive: true,
      content: "侦查 42/70 成功",
      hasScriptLines: false,
      payload: {
        mode: "script",
      },
    })).toBe("trpg");
  });

  it("anko 和普通可用 script 模式不被 TRPG 自动识别覆盖", () => {
    expect(resolveRealtimeDiceRenderMode({
      combatRoundActive: false,
      content: "射击检定：D100=2/90 极难成功",
      hasScriptLines: false,
      payload: {
        mode: "anko",
      },
    })).toBe("anko");

    expect(resolveRealtimeDiceRenderMode({
      combatRoundActive: false,
      content: "射击检定：D100=2/90 极难成功",
      hasScriptLines: true,
      payload: {
        mode: "script",
        lines: [
          "pixiPerform:effect.customDice -once -next;",
          ":自定义脚本骰子;",
        ],
      },
    })).toBe("script");
  });

  it("非战斗轮按骰子内容自动选择默认表现", () => {
    expect(resolveRealtimeDiceRenderMode({
      combatRoundActive: false,
      content: "侦查 42/70 成功",
      hasScriptLines: false,
    })).toBe("trpg");

    expect(resolveRealtimeDiceRenderMode({
      combatRoundActive: false,
      content: "今天下雨了",
      hasScriptLines: false,
    })).toBe("narration");
  });

  it("tRPG 骰子实时脚本使用 trpgDice 覆盖卡片，不生成 pixiPerform 或普通 dice", () => {
    const lines = buildTrpgDicePerformLines("射击检定：D100=2/90 极难成功", {
      url: "./game/se/dice.wav",
      volume: 60,
    });

    expect(lines).toEqual([
      "trpgDice:射击检定：D100=2/90 极难成功 -next;",
      "playEffect:./game/se/dice.wav -volume=60 -next;",
    ]);
    expect(lines.some(line => line.startsWith("dice:"))).toBe(false);
    expect(lines.some(line => line.startsWith("pixiPerform:"))).toBe(false);
  });

  it("tRPG 骰子默认不生成 miniAvatar", () => {
    expect(resolveRealtimeDiceMiniAvatarDefault({
      mode: "trpg",
      roleId: 1,
    })).toBeUndefined();
    expect(resolveRealtimeDiceMiniAvatarDefault({
      mode: "dialog",
      roleId: 1,
    })).toBe(true);
    expect(resolveRealtimeDiceMiniAvatarDefault({
      mode: "trpg",
      roleId: 1,
      payload: { showMiniAvatar: false },
    })).toBe(false);
  });
});

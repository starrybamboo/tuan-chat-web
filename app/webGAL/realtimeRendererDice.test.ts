import { describe, expect, it } from "vitest";

import {
  buildTrpgDicePerformLines,
  buildTrpgDicePixiPerformLine,
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

  it("TRPG 骰点结果会覆盖 dialog/narration，回到特殊骰子演出", () => {
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

  it("anko 和可用 script 模式不被 TRPG 自动识别覆盖", () => {
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

  it("TRPG 特效使用 WebGAL 可识别的 pixiPerform 指令", () => {
    expect(buildTrpgDicePixiPerformLine())
      .toBe("pixiPerform:effect.trpgDiceBurst -once -duration=720 -scale=1.08 -next;");
  });

  it("TRPG 骰子实时脚本不再生成 WebGAL dice 浮层命令", () => {
    const lines = buildTrpgDicePerformLines({
      url: "./game/se/dice.wav",
      volume: 60,
    });

    expect(lines).toEqual([
      "pixiPerform:effect.trpgDiceBurst -once -duration=720 -scale=1.08 -next;",
      "playEffect:./game/se/dice.wav -volume=60 -next;",
    ]);
    expect(lines.some(line => line.startsWith("dice:"))).toBe(false);
  });

  it("TRPG 骰子默认不生成 miniAvatar", () => {
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

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createInMemoryAuthoringPrimitives } from "../apps/web/app/agentAuthoring";
import { runGululuAuthoringDryRun } from "./gululu-authoring-dry-run";
import {
  applyGululuReplayImportToAuthoring,
  buildGululuReplayImportPackage,
  buildImportText,
  parseGululuFloors,
} from "./gululu-replay-import.mjs";

function buildPackageFromMarkdown(markdown: string) {
  return buildGululuReplayImportPackage(parseGululuFloors(markdown), {
    fromFloor: 1,
    title: "烈海王似乎打算在幻想乡挑战强者们的样子",
    toFloor: 2,
  });
}

function buildReviewManifest(sourceRelPath: string, character: string) {
  return {
    entries: [{
      assetKind: "avatar-candidate",
      candidateCharacter: character,
      confidence: 1,
      confirmed: true,
      confirmedCharacter: character,
      outputRelPath: sourceRelPath,
      reviewStatus: "confirmed",
      sourceRelPath,
    }],
    opus: { opusId: 88, sourceRoot: "fixture", title: "fixture" },
    version: 1,
  };
}

describe("gululu-replay-import", () => {
  it("会把技能卡和规则卡冒号行转为骰子描述", () => {
    const pkg = buildPackageFromMarkdown(`
## 第1楼
> 时间: 2022-01-22 20:38

师匠的教导：天文密葬法
数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避（0），小伤害（1），中伤害（2），大伤害（3），特大伤害（4）以及大成功/大失败
PS2：在之后的更新里是否需要对出场角色做一个简要的说明呢？
作者的独断：虽然皮克过来了，但是为了让这个贴子能够安心的持续下去
烈 海 王：海王是中华武术的巅峰，烈海王又是其中佼佼者，凭借高超的技术使战斗力X1.8
消力：传自郭海皇的绝学，普通攻击以及近战系技能所造成的的最终伤害/2
烈：用消力化解！
神子：这里不是发表感想的时候。
两人：“就算你这么说也还是难以理解呢”
`);

    const roleNames = pkg.roles.map(role => role.name);
    expect(roleNames).toEqual(expect.arrayContaining(["丰聪耳神子", "烈海王"]));
    expect(roleNames).toHaveLength(2);
    expect(roleNames).not.toEqual(expect.arrayContaining([
      "PS2",
      "作者的独断",
      "师匠的教导",
      "数值大的那一方胜利，之后进行伤害判定",
      "消力",
      "烈 海 王",
      "两人",
    ]));
    expect(pkg.stats).toMatchObject({ dialog: 2, dice: 2, narration: 2, roleCount: 2 });
    expect(pkg.messages.filter(message => message.kind === "dice" && message.diceDescription)).toHaveLength(2);

    const importText = buildImportText(pkg);
    expect(importText).toContain("[骰娘]：师匠的教导：天文密葬法");
    expect(importText).toContain("数值大的那一方胜利，之后进行伤害判定");
    expect(importText).toContain("[骰娘]：烈 海 王：海王是中华武术的巅峰");
    expect(importText).toContain("消力：传自郭海皇的绝学");
    expect(importText).toContain("[旁白]：两人：“就算你这么说也还是难以理解呢”");
    expect(importText).toContain("[烈]：用消力化解！");
  });

  it("不会把被拒绝的冒号行按图片推断成对白", () => {
    const pkg = buildGululuReplayImportPackage(parseGululuFloors(`
## 第1楼
> 时间: 2022-01-22 20:38

![image](../images/gululu/satori.png)
PS2：在之后的更新里是否需要对出场角色做一个简要的说明呢？
`), {
      fromFloor: 1,
      reviewManifest: buildReviewManifest("gululu/satori.png", "古明地觉"),
      title: "烈海王似乎打算在幻想乡挑战强者们的样子",
      toFloor: 1,
    });

    expect(pkg.roles).toEqual([]);
    expect(pkg.messages).toEqual([
      expect.objectContaining({
        content: "PS2：在之后的更新里是否需要对出场角色做一个简要的说明呢？",
        imagePath: "gululu/satori.png",
        kind: "narration",
      }),
    ]);
  });

  it("会把人物卡和人物卡变更识别为角色卡事件", () => {
    const pkg = buildPackageFromMarkdown(`
## 第1楼
> 时间: 2022-01-22 20:38

~烈海王的人物卡~

烈海王；Atk 144；Hp 13；技能：消力、四千年传承

四千年的传承：面对近战系、技术系的技能可以进行【1d100】的破解判定，75以上成功

烈的人物卡中武术之爱这个技能被舍弃了
`);

    expect(pkg.messages).toEqual([
      expect.objectContaining({
        content: "~烈海王的人物卡~",
        kind: "role_card",
      }),
      expect.objectContaining({
        content: "烈海王；Atk 144；Hp 13；技能：消力、四千年传承",
        kind: "role_card",
      }),
      expect.objectContaining({
        content: "四千年的传承：面对近战系、技术系的技能可以进行【1d100】的破解判定，75以上成功",
        kind: "role_card",
      }),
      expect.objectContaining({
        content: "烈的人物卡中武术之爱这个技能被舍弃了",
        kind: "role_card",
      }),
    ]);
    expect(pkg.stats).toMatchObject({ role_card: 4 });
    expect(pkg.stats.dice).toBeUndefined();
    expect(buildImportText(pkg)).toContain("[角色卡]：烈海王；Atk 144；Hp 13");
  });

  it("会把骰子问题后的连续编号选项合并到同一条骰子消息", () => {
    const pkg = buildPackageFromMarkdown(`
## 第1楼
> 时间: 2022-01-22 20:38

那么烈啊，你要去往何处呢【1d13:9】

![image](../images/gululu/dice.png)

1 博丽神社

2 红魔馆（是红海皇！）

3 白玉楼（莫非。。是宫本武藏女性说？）
`);

    expect(pkg.messages).toHaveLength(1);
    expect(pkg.messages[0]).toMatchObject({
      content: "那么烈啊，你要去往何处呢【1d13:9】",
      imagePath: "gululu/dice.png",
      kind: "dice",
      options: [
        "1 博丽神社",
        "2 红魔馆（是红海皇！）",
        "3 白玉楼（莫非。。是宫本武藏女性说？）",
      ],
      rollText: "那么烈啊，你要去往何处呢【1d13：】",
    });

    const importText = buildImportText(pkg);
    expect(importText).toContain("[骰娘]：那么烈啊，你要去往何处呢【1d13：】");
    expect(importText).toContain("3 白玉楼（莫非。。是宫本武藏女性说？）");
    expect(importText).toContain("那么烈啊，你要去往何处呢【1d13:9】");
    expect(importText).not.toContain("[旁白]：1 博丽神社");
  });

  it("会把无空格编号选项合并到上一条骰子消息", () => {
    const pkg = buildPackageFromMarkdown(`
## 第1楼
> 时间: 2022-01-22 20:42

先开口的是
【1d2 ：1】

1永琳

2 神子
`);

    expect(pkg.messages).toHaveLength(2);
    expect(pkg.messages[1]).toMatchObject({
      content: "【1d2 ：1】",
      kind: "dice",
      options: [
        "1永琳",
        "2 神子",
      ],
      rollText: "【1d2：】",
    });

    const importText = buildImportText(pkg);
    expect(importText).toContain("[骰娘]：【1d2：】");
    expect(importText).toContain("1永琳");
    expect(importText).toContain("2 神子");
    expect(importText).not.toContain("[旁白]：1永琳");
  });

  it("会把带骰子的第 10 项大成功分支合并为同一轮骰子", () => {
    const pkg = buildPackageFromMarkdown(`
## 第1楼
> 时间: 2022-01-22 20:38

那么烈今晚要干什么
【1d10：9】

1 师匠，请指导我

2 弹幕决斗是什么（寻找好敌手）

3 肉体的锻炼

4 师匠，请指导我

5 弹幕决斗是什么（寻找好敌手）

6 师匠，请指导我

7 弹幕决斗是什么（寻找好敌手）

8 与皮克交流

9 与铃仙交流

10 大成功/大失败【1d2：2】
`);

    const diceMessage = pkg.messages.find(message => message.kind === "dice");
    expect(diceMessage).toMatchObject({
      content: "【1d10：9】",
      diceReplies: [
        "【1d10：10】",
        "10 大成功/大失败【1d2：2】",
        "【1d10：9】",
      ],
      kind: "dice",
      options: [
        "1 师匠，请指导我",
        "2 弹幕决斗是什么（寻找好敌手）",
        "3 肉体的锻炼",
        "4 师匠，请指导我",
        "5 弹幕决斗是什么（寻找好敌手）",
        "6 师匠，请指导我",
        "7 弹幕决斗是什么（寻找好敌手）",
        "8 与皮克交流",
        "9 与铃仙交流",
        "10 大成功/大失败【1d2：】",
      ],
      rollText: "【1d10：】",
    });

    const importText = buildImportText(pkg);
    expect(importText).toContain("10 大成功/大失败【1d2：】");
    expect(importText).toContain("【1d10：10】\n10 大成功/大失败【1d2：2】\n【1d10：9】");
    expect(importText).not.toContain("[骰娘]：10 大成功/大失败【1d2：】");
  });

  it("会把普通骰子历史结果拆成过程和结果", () => {
    const pkg = buildPackageFromMarkdown(`
## 第1楼
> 时间: 2022-01-22 20:38

【1d20:18+80=98】
`);

    expect(pkg.messages).toEqual([
      expect.objectContaining({
        content: "【1d20:18+80=98】",
        kind: "dice",
        rollText: "【1d20+80：】",
      }),
    ]);

    expect(buildImportText(pkg)).toBe("[骰娘]：【1d20+80：】\n【1d20:18+80=98】");
  });

  it("会把导入包应用到通用 authoring primitives", () => {
    const pkg = buildPackageFromMarkdown(`
## 第1楼
> 时间: 2022-01-22 20:38

![image](../images/gululu/retsu.png)
烈：用消力化解！
烈：没有图片也沿用默认头像。
BGM：远野幻想物语
数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避
【1d100:90】

## 第2楼
> 时间: 2022-01-22 20:39

神子：这里不是发表感想的时候。
`);
    const authoring = createInMemoryAuthoringPrimitives();

    const result = applyGululuReplayImportToAuthoring(authoring, pkg, {
      agentId: "codex-test",
      opusId: 88,
      sourceKey: "opus-88:floors:1-2",
      targetRoomId: 62,
    });

    expect(result.report.batch.source).toMatchObject({
      key: "opus-88:floors:1-2",
      kind: "gululu",
      workId: "opus-88",
    });
    expect(result.report.stats.messagesWritten).toBe(pkg.messages.length);
    expect(result.report.resources.roles).toHaveLength(1);
    expect(result.report.resources.avatars).toHaveLength(1);
    expect(result.report.resources.unresolvedMedia).toHaveLength(1);
    expect(result.readiness.exportable).toBe(false);

    const dialog = result.report.messages.find(message => message.kind === "dialog" && message.content === "用消力化解！");
    expect(dialog).toMatchObject({
      avatarId: expect.any(Number),
      customRoleName: "烈",
      source: {
        kind: "gululu",
        originalAssetPath: "gululu/retsu.png",
        originalSpeaker: "烈",
        segmentId: "1",
        workId: "opus-88",
      },
    });
    expect(result.report.messages.find(message => message.kind === "dialog" && message.content === "没有图片也沿用默认头像。")).toMatchObject({
      avatarId: dialog?.avatarId,
      customRoleName: "烈",
      roleId: dialog?.roleId,
    });
    expect(result.report.messages.find(message => message.content === "神子：这里不是发表感想的时候。")).toMatchObject({
      kind: "narration",
      roleId: undefined,
    });

    expect(result.report.messages.find(message => message.kind === "dice" && message.content?.includes("【1d100:90】"))).toMatchObject({
      content: "数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避\n【1d100：】\n【1d100:90】",
      extra: {
        authoredDice: {
          description: "数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避",
          result: "【1d100:90】",
          rollText: "数值大的那一方胜利，之后进行伤害判定：从1-10的选项中决定回避\n【1d100：】",
        },
      },
    });
    expect(result.report.resources.unresolvedMedia[0]).toMatchObject({
      originalName: "远野幻想物语",
      purpose: "bgm",
    });
  });

  it("authoring dry-run 会把导入包写成可复核的 batch 报告", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "gululu-authoring-"));
    try {
      const inputPath = path.join(tempDir, "opus-88-floors-1-2.tuanchat-replay-import.json");
      const outputPath = path.join(tempDir, "dry-run.json");
      const pkg = buildPackageFromMarkdown(`
## 第1楼
> 时间: 2022-01-22 20:38

![image](../images/gululu/retsu.png)
烈：用消力化解！
烈：默认头像兜底。
BGM：远野幻想物语
`);
      await writeFile(inputPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

      const result = await runGululuAuthoringDryRun([
        "--input",
        inputPath,
        "--out",
        outputPath,
        "--target-room-id",
        "62",
        "--opus-id",
        "88",
      ]);
      const written = JSON.parse(await readFile(outputPath, "utf8"));

      expect(result.outputPath).toBe(path.resolve(outputPath));
      expect(written.batch.source).toMatchObject({ kind: "gululu", workId: "opus-88" });
      expect(written.stats.messagesWritten).toBe(pkg.messages.length);
      expect(written.resources.roles).toBe(1);
      expect(written.resources.avatars).toBe(1);
      expect(written.resources.unresolvedMedia).toEqual([
        expect.objectContaining({ originalName: "远野幻想物语", purpose: "bgm" }),
      ]);
      expect(written.readiness.exportable).toBe(false);
    }
    finally {
      await rm(tempDir, { recursive: true });
    }
  });
});

import { describe, expect, it, vi } from "vitest";

import { MessageType } from "../../../../api/wsModels";
import { compileRglImportEvents, compileRglImportEventsWithLineNumbers, parseAndCompileRglImportText, parseRglImportText, summarizeRglImportEvents } from "./importRglText";

describe("parseRglImportText", () => {
  it("解析角色差分、底层 annotation、素材引用和清场行", () => {
    const result = parseRglImportText([
      "<sys:bg>:永远亭夜晚",
      "[烈.震惊]<figure.pos.left-center><figure.anim.enter><dialog.next>:",
      "[旁白]<dialog.next>:这里是一段旁白。",
      "[丰聪耳神子.闭眼平静]<figure.pos.right-center>:你在说什么？",
      "<figure.clear>:",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "material",
        annotationId: "sys:bg",
        materialName: "永远亭夜晚",
        annotations: ["sys:bg"],
      },
      {
        kind: "dialog",
        role: { roleName: "烈", avatarName: "震惊" },
        annotations: ["figure.pos.left-center", "figure.anim.enter", "dialog.next"],
        content: "",
      },
      {
        kind: "narration",
        annotations: ["dialog.next"],
        content: "这里是一段旁白。",
      },
      {
        kind: "dialog",
        role: { roleName: "丰聪耳神子", avatarName: "闭眼平静" },
        annotations: ["figure.pos.right-center"],
        content: "你在说什么？",
      },
      {
        kind: "control",
        annotations: ["figure.clear"],
      },
    ]);
  });

  it("允许无正文的清理和场景特效控制行", () => {
    const result = parseRglImportText([
      "<background.clear>:",
      "<scene.effect.rain>:",
      "<scene.effect.stop>:",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "control",
        annotations: ["background.clear"],
      },
      {
        kind: "control",
        annotations: ["scene.effect.rain"],
      },
      {
        kind: "control",
        annotations: ["scene.effect.stop"],
      },
    ]);
  });

  it("解析显示名和绑定角色名分离的角色标记", () => {
    const result = parseRglImportText("[师匠=八意永琳.默认]<figure.pos.right-center>:喝茶。");

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "dialog",
        role: { speakerName: "师匠", roleName: "八意永琳", avatarName: "默认" },
        annotations: ["figure.pos.right-center"],
        content: "喝茶。",
      },
    ]);
  });

  it("解析骰子块并保持 command 与结果分离", () => {
    const result = parseRglImportText([
      "<dice>:",
      "cmd: 【1d10：】",
      "1. 继续观察",
      "2. 直接行动",
      "=> 【1d10:2】；2 直接行动",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "dice",
        dicerSpeakerName: "骰娘",
        command: "【1d10：】\n1. 继续观察\n2. 直接行动",
        replyContent: "【1d10:2】；2 直接行动",
      },
    ]);
  });

  it("允许骰子块头使用中文冒号", () => {
    const result = parseRglImportText([
      "<dice>：",
      "cmd: 【1d10：】",
      "1. 继续观察",
      "=> 【1d10:1】；1 继续观察",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "dice",
        dicerSpeakerName: "骰娘",
        command: "【1d10：】\n1. 继续观察",
        replyContent: "【1d10:1】；1 继续观察",
      },
    ]);
  });

  it("解析骰子块的显式骰娘显示名", () => {
    const result = parseRglImportText([
      "<dice>:",
      "dicer: 海豹一号机",
      "cmd: 【1d10：】",
      "1. 继续观察",
      "=> 【1d10:2】；2 直接行动",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "dice",
        dicerSpeakerName: "海豹一号机",
        command: "【1d10：】\n1. 继续观察",
        replyContent: "【1d10:2】；2 直接行动",
      },
    ]);
  });

  it("把骰子块里的多个结果行解析为多条骰后回复", () => {
    const result = parseRglImportText([
      "<dice>:",
      "dicer: 海豹一号机",
      "cmd: 【2#1d10：】",
      "1. 观察",
      "2. 行动",
      "=> 【1d10:2】；2 行动",
      "第一轮结算。",
      "=> 【1d10:1】；1 观察",
      "第二轮结算。",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "dice",
        dicerSpeakerName: "海豹一号机",
        command: "【2#1d10：】\n1. 观察\n2. 行动",
        replyContent: "【1d10:2】；2 行动\n第一轮结算。\n【1d10:1】；1 观察\n第二轮结算。",
        replyContents: [
          "【1d10:2】；2 行动\n第一轮结算。",
          "【1d10:1】；1 观察\n第二轮结算。",
        ],
      },
    ]);
  });


  it("把非 RGL 语句行作为上一条对白或旁白的续行", () => {
    const result = parseRglImportText([
      "[旁白]<dialog.next>:竹林深处传来响声。",
      "夜色压低，雾气从脚边漫上来。",
      "[烈.震惊]<figure.pos.left-center>:什么声音？",
      "有人在附近吗？",
      "<figure.clear>:",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "narration",
        content: "竹林深处传来响声。\n夜色压低，雾气从脚边漫上来。",
      },
      {
        kind: "dialog",
        role: { roleName: "烈", avatarName: "震惊" },
        content: "什么声音？\n有人在附近吗？",
      },
      {
        kind: "control",
        annotations: ["figure.clear"],
      },
    ]);
  });

  it("素材或控制行后面的裸文本仍然视为错误", () => {
    const result = parseRglImportText([
      "<sys:bg>:永远亭夜晚",
      "这不是素材名续行。",
    ].join("\n"));

    expect(result.events).toHaveLength(1);
    expect(result.invalidLines).toMatchObject([
      { lineNumber: 2, reason: "无法识别的 RGL 行" },
    ]);
  });

  it("拒绝空素材引用或缺少角色上下文的空演出 annotation", () => {
    const emptyMaterial = parseRglImportText("<sys:bg>:");
    const emptyFigureAnimation = parseRglImportText("<figure.anim.enter>:");

    expect(emptyMaterial.events).toEqual([]);
    expect(emptyMaterial.invalidLines).toMatchObject([
      { lineNumber: 1, reason: "annotation 需要正文或素材名：sys:bg" },
    ]);
    expect(emptyFigureAnimation.events).toEqual([]);
    expect(emptyFigureAnimation.invalidLines).toMatchObject([
      { lineNumber: 1, reason: "annotation 需要正文或素材名：figure.anim.enter" },
    ]);
  });

  it("忽略注释行和 Markdown 分隔线，不把它们并入对白", () => {
    const result = parseRglImportText([
      "# 第一幕",
      "[旁白]:竹林深处传来响声。",
      "// 这里保留给人工备注",
      "---",
      "[烈.震惊]:什么声音？",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "narration",
        content: "竹林深处传来响声。",
      },
      {
        kind: "dialog",
        role: { roleName: "烈", avatarName: "震惊" },
        content: "什么声音？",
      },
    ]);
  });

  it("骰子块内部忽略注释行和分隔线", () => {
    const result = parseRglImportText([
      "<dice>:",
      "# 骰前说明备注",
      "cmd: 【1d10：】",
      "1. 继续观察",
      "---",
      "2. 直接行动",
      "// 骰后结果备注",
      "=> 【1d10:2】；2 直接行动",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "dice",
        dicerSpeakerName: "骰娘",
        command: "【1d10：】\n1. 继续观察\n2. 直接行动",
        replyContent: "【1d10:2】；2 直接行动",
      },
    ]);
  });

  it("拒绝重复或空的骰子块 dicer 行", () => {
    const duplicate = parseRglImportText([
      "<dice>:",
      "dicer: 骰娘",
      "dicer: 海豹一号机",
      "cmd: 【1d10：】",
      "=> 【1d10:2】",
    ].join("\n"));
    const empty = parseRglImportText([
      "<dice>:",
      "dicer:",
      "cmd: 【1d10：】",
      "=> 【1d10:2】",
    ].join("\n"));

    expect(duplicate.events).toEqual([]);
    expect(duplicate.invalidLines).toMatchObject([
      { lineNumber: 1, reason: "骰子块只能包含一个 dicer: 行" },
    ]);
    expect(empty.events).toEqual([]);
    expect(empty.invalidLines).toMatchObject([
      { lineNumber: 1, reason: "骰子块的 dicer 不能为空" },
    ]);
  });

  it("无效空骰子块不会吞掉紧随其后的 RGL 语句", () => {
    const result = parseRglImportText([
      "<dice>:",
      "[旁白]:骰子块后面的旁白仍应保留。",
      "[烈.震惊]:发生了什么？",
    ].join("\n"));

    expect(result.invalidLines).toMatchObject([
      { lineNumber: 1, reason: "骰子块必须包含 cmd: 和 => 结果行" },
    ]);
    expect(result.events).toMatchObject([
      {
        kind: "narration",
        lineNumber: 2,
        content: "骰子块后面的旁白仍应保留。",
      },
      {
        kind: "dialog",
        lineNumber: 3,
        role: { roleName: "烈", avatarName: "震惊" },
        content: "发生了什么？",
      },
    ]);
  });

  it("骰子块里的方括号选项不会被误判成 RGL 语句", () => {
    const result = parseRglImportText([
      "<dice>:",
      "cmd: 【1d2：】",
      "[A] 继续观察",
      "[B] 直接行动",
      "=> 【1d2:1】；A 继续观察",
      "[旁白]:骰后反应。",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "dice",
        command: "【1d2：】\n[A] 继续观察\n[B] 直接行动",
        replyContent: "【1d2:1】；A 继续观察",
      },
      {
        kind: "narration",
        content: "骰后反应。",
      },
    ]);
  });

  it("骰子块里的方括号冒号选项不会被误判成 RGL 语句", () => {
    const result = parseRglImportText([
      "<dice>:",
      "cmd: 【1d2：】",
      "[A]: 继续观察",
      "[B]：直接行动",
      "=> 【1d2:1】；A 继续观察",
      "[旁白]:骰后反应。",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "dice",
        command: "【1d2：】\n[A]: 继续观察\n[B]：直接行动",
        replyContent: "【1d2:1】；A 继续观察",
      },
      {
        kind: "narration",
        content: "骰后反应。",
      },
    ]);
  });

  it("兼容回声工坊风格素材和演出别名，并归一化为底层 annotation", () => {
    const result = parseRglImportText([
      "<background>:永远亭夜晚",
      "<BGM>:战斗曲",
      "<SE>:挥刀",
      "<CG>:开场图",
      "<image>:人物卡/展示图",
      "[烈.震惊]<left-center><enter><shake><jump2>:台词",
      "<clear>:",
      "<clearbg>:",
      "<clearBGM>:",
      "<rain>:",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "material",
        annotationId: "sys:bg",
        materialName: "永远亭夜晚",
        annotations: ["sys:bg"],
      },
      {
        kind: "material",
        annotationId: "sys:bgm",
        materialName: "战斗曲",
        annotations: ["sys:bgm"],
      },
      {
        kind: "material",
        annotationId: "sys:se",
        materialName: "挥刀",
        annotations: ["sys:se"],
      },
      {
        kind: "material",
        annotationId: "sys:cg",
        materialName: "开场图",
        annotations: ["sys:cg"],
      },
      {
        kind: "material",
        annotationId: "image.show",
        materialName: "人物卡/展示图",
        annotations: ["image.show"],
      },
      {
        kind: "dialog",
        annotations: [
          "figure.pos.left-center",
          "figure.anim.enter",
          "figure.anim.ba-shake",
          "figure.anim.ba-jump-twice",
        ],
        content: "台词",
      },
      {
        kind: "control",
        annotations: ["figure.clear"],
      },
      {
        kind: "control",
        annotations: ["background.clear"],
      },
      {
        kind: "control",
        annotations: ["bgm.clear"],
      },
      {
        kind: "control",
        annotations: ["scene.effect.rain"],
      },
    ]);
  });

  it("兼容 set 行和背景切换参数", () => {
    const result = parseRglImportText([
      "<set:BGM>:战斗曲",
      "<background><replace=30>:永远亭夜晚",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "material",
        annotationId: "sys:bgm",
        materialName: "战斗曲",
        annotations: ["sys:bgm"],
      },
      {
        kind: "material",
        annotationId: "sys:bg",
        materialName: "永远亭夜晚",
        annotations: ["sys:bg", "background.anim.enter", "background.speed.normal"],
      },
    ]);
  });

  it("解析原生 dice、hitpoint、bubble、animation 和 clear 对象参数", () => {
    const result = parseRglImportText([
      "<dice>:(力量检定,20,12,7)",
      "<hitpoint>:(烈,hp,-2)",
      "<bubble>:旁边冒出一句气泡文本。",
      "<animation>:shake,left-center",
      "<clear>:bg",
      "<clear>:all",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "dice",
        command: "力量检定\n【1d20：】\n检定值：12",
        replyContent: "【1d20:7】；目标 12；成功",
      },
      {
        kind: "hitpoint",
        roleName: "烈",
        op: "sub",
        value: 2,
        content: "状态更新：烈 HP -2",
      },
      {
        kind: "narration",
        annotations: [],
        content: "旁边冒出一句气泡文本。",
      },
      {
        kind: "control",
        annotations: ["figure.anim.ba-shake", "figure.pos.left-center"],
      },
      {
        kind: "control",
        annotations: ["background.clear"],
      },
      {
        kind: "control",
        annotations: ["figure.clear", "background.clear", "bgm.clear", "image.clear"],
      },
    ]);
  });

  it("解析回声工坊花括号音频盒并剥离正文占位", () => {
    const result = parseRglImportText([
      "[烈.震惊]:挥拳。{挥刀;*0.5}",
      "[旁白]:没有配音占位。{*}",
    ].join("\n"));

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "dialog",
        content: "挥拳。",
      },
      {
        kind: "material",
        annotationId: "sys:se",
        materialName: "挥刀",
        annotations: ["sys:se"],
      },
      {
        kind: "narration",
        content: "没有配音占位。",
      },
    ]);
  });

  it("解析多角色同框对白和角色透明度参数", () => {
    const result = parseRglImportText("[烈(60).震惊,丰聪耳神子.闭眼平静]<enter>:同时登场。");

    expect(result.invalidLines).toEqual([]);
    expect(result.events).toMatchObject([
      {
        kind: "dialog",
        role: { roleName: "烈", avatarName: "震惊", opacity: 0.6 },
        companionRoles: [{ roleName: "丰聪耳神子", avatarName: "闭眼平静" }],
        annotations: ["figure.anim.enter"],
        content: "同时登场。",
      },
    ]);
  });

  it("拒绝未知 annotation 或未知别名", () => {
    const result = parseRglImportText("<unknownAlias>:永远亭夜晚");

    expect(result.events).toEqual([]);
    expect(result.invalidLines).toMatchObject([
      { lineNumber: 1, reason: "未知 annotation：unknownAlias" },
    ]);
  });

  it("拒绝对白正文残留同角色说话人前缀", () => {
    const result = parseRglImportText("[勇伯.默认]:勇伯：怎么回事？");

    expect(result.events).toEqual([]);
    expect(result.invalidLines).toMatchObject([
      { lineNumber: 1, reason: "正文不应包含说话人前缀" },
    ]);
  });

  it("拒绝对白正文残留显示名或绑定角色名前缀", () => {
    const displayNameResult = parseRglImportText("[师匠=八意永琳.默认]:师匠：喝茶。");
    const roleNameResult = parseRglImportText("[师匠=八意永琳.默认]:八意永琳：喝茶。");

    expect(displayNameResult.events).toEqual([]);
    expect(displayNameResult.invalidLines).toMatchObject([
      { lineNumber: 1, reason: "正文不应包含说话人前缀" },
    ]);
    expect(roleNameResult.events).toEqual([]);
    expect(roleNameResult.invalidLines).toMatchObject([
      { lineNumber: 1, reason: "正文不应包含说话人前缀" },
    ]);
  });

  it("拒绝旁白正文残留旁白前缀", () => {
    const result = parseRglImportText("[旁白]:旁白：夜色渐深。");

    expect(result.events).toEqual([]);
    expect(result.invalidLines).toMatchObject([
      { lineNumber: 1, reason: "正文不应包含说话人前缀" },
    ]);
  });

  it("拒绝对白或旁白续行残留同一说话人前缀", () => {
    const result = parseRglImportText([
      "[烈.震惊]:第一句。",
      "烈：第二句不应带前缀。",
      "[旁白]:夜色渐深。",
      "旁白：续行也不应带前缀。",
    ].join("\n"));

    expect(result.events).toMatchObject([
      {
        kind: "dialog",
        content: "第一句。",
      },
      {
        kind: "narration",
        content: "夜色渐深。",
      },
    ]);
    expect(result.invalidLines).toMatchObject([
      { lineNumber: 2, reason: "正文不应包含说话人前缀" },
      { lineNumber: 4, reason: "正文不应包含说话人前缀" },
    ]);
  });
});

describe("summarizeRglImportEvents", () => {
  it("统计 RGL 事件类型数量", () => {
    const parsed = parseRglImportText([
      "<sys:bg>:永远亭夜晚",
      "[旁白]:夜色渐深。",
      "[烈.震惊]:什么声音？",
      "<figure.clear>:",
      "<dice>:",
      "cmd: 【1d10：】",
      "=> 【1d10:2】；2 直接行动",
      "<hitpoint>:(烈,hp,-2)",
    ].join("\n"));

    expect(summarizeRglImportEvents(parsed.events)).toEqual({
      dialog: 1,
      narration: 1,
      material: 1,
      control: 1,
      dice: 1,
      hitpoint: 1,
    });
  });
});

describe("compileRglImportEvents", () => {
  it("把 RGL 事件编译为增强导入消息", () => {
    const parsed = parseRglImportText([
      "<sys:bg>:永远亭夜晚",
      "[烈.震惊]<figure.pos.left-center><dialog.next>:",
      "[旁白]<dialog.next>:夜色渐深。",
      "<figure.clear>:",
    ].join("\n"));
    const resolveRoleAvatar = vi.fn().mockReturnValue({ roleId: 10, avatarId: 20 });
    const resolveMaterial = vi.fn().mockReturnValue({
      content: "",
      messageType: MessageType.IMG,
      extra: {
        imageMessage: {
          source: { kind: "internal", fileId: 9001 },
          width: 1920,
          height: 1080,
          size: 123456,
          fileName: "eientei-night.webp",
          background: true,
        },
      },
    });

    const messages = compileRglImportEvents(parsed.events, {
      resolveRoleAvatar,
      resolveMaterial,
    });

    expect(resolveMaterial).toHaveBeenCalledWith({
      annotationId: "sys:bg",
      materialName: "永远亭夜晚",
    });
    expect(resolveRoleAvatar).toHaveBeenCalledWith({
      roleName: "烈",
      avatarName: "震惊",
    });
    expect(messages).toMatchObject([
      {
        roleId: -1,
        content: "",
        messageType: MessageType.IMG,
        annotations: ["sys:bg"],
        extra: {
          imageMessage: {
            source: { kind: "internal", fileId: 9001 },
          },
        },
      },
      {
        roleId: 10,
        avatarId: 20,
        speakerName: "烈",
        content: "",
        annotations: ["figure.pos.left-center", "dialog.next"],
      },
      {
        roleId: -1,
        content: "夜色渐深。",
        messageType: MessageType.TEXT,
        extra: {},
        annotations: ["dialog.next"],
      },
      {
        roleId: -1,
        content: "",
        messageType: MessageType.TEXT,
        annotations: ["figure.clear"],
        extra: {},
      },
    ]);
  });

  it("编译时优先使用 RGL 显示名作为导入 speakerName", () => {
    const parsed = parseRglImportText("[师匠=八意永琳.默认]:喝茶。");

    const messages = compileRglImportEvents(parsed.events, {
      resolveRoleAvatar: () => ({ roleId: 10, avatarId: 20, speakerName: "八意永琳" }),
      resolveMaterial: () => {
        throw new Error("不应解析素材");
      },
    });

    expect(messages).toMatchObject([
      {
        roleId: 10,
        avatarId: 20,
        speakerName: "师匠",
        content: "喝茶。",
      },
    ]);
  });

  it("把多角色同框对白编译为陪同角色空白切换加主对白", () => {
    const parsed = parseRglImportText("[烈(60).震惊,丰聪耳神子.闭眼平静]<enter>:同时登场。");
    const resolveRoleAvatar = vi.fn((role: { roleName: string; avatarName: string }) => {
      if (role.roleName === "烈") {
        return { roleId: 10, avatarId: 20, speakerName: "烈" };
      }
      return { roleId: 11, avatarId: 21, speakerName: "丰聪耳神子" };
    });

    const messages = compileRglImportEventsWithLineNumbers(parsed.events, {
      resolveRoleAvatar,
      resolveMaterial: () => {
        throw new Error("不应解析素材");
      },
    });

    expect(messages).toMatchObject([
      {
        lineNumber: 1,
        roleId: 11,
        avatarId: 21,
        content: "",
        annotations: ["figure.anim.enter", "figure.pos.right-center", "dialog.next"],
      },
      {
        lineNumber: 1,
        roleId: 10,
        avatarId: 20,
        content: "同时登场。",
        annotations: ["figure.anim.enter", "figure.pos.left-center"],
        webgal: { transform: { alpha: 0.6 } },
      },
    ]);
  });

  it("把 RGL hitpoint 编译为状态事件消息", () => {
    const parsed = parseRglImportText("<hitpoint>:(烈,10,20)");

    const messages = compileRglImportEvents(parsed.events, {
      resolveRoleAvatar: () => {
        throw new Error("不应解析角色差分");
      },
      resolveRole: () => ({ roleId: 10, speakerName: "烈" }),
      resolveMaterial: () => {
        throw new Error("不应解析素材");
      },
    });

    expect(messages).toMatchObject([
      {
        roleId: 10,
        speakerName: "烈",
        content: "状态更新：烈 HP = 10/20",
        messageType: MessageType.STATE_EVENT,
        extra: {
          stateEvent: {
            source: {
              kind: "command",
              commandName: "hitpoint",
              parserVersion: "state-event-v1",
            },
            events: [
              {
                type: "varOp",
                scope: { kind: "role", roleId: 10 },
                key: "hp",
                op: "set",
                value: 10,
              },
              {
                type: "varOp",
                scope: { kind: "role", roleId: 10 },
                key: "hpm",
                op: "set",
                value: 20,
              },
            ],
          },
        },
      },
    ]);
  });

  it("把 RGL 骰子块编译为导入 diceTurn", () => {
    const parsed = parseRglImportText([
      "<dice>:",
      "dicer: 海豹一号机",
      "cmd: 【1d10：】",
      "1. 继续观察",
      "2. 直接行动",
      "=> 【1d10:2】；2 直接行动",
    ].join("\n"));

    const messages = compileRglImportEvents(parsed.events, {
      resolveRoleAvatar: () => {
        throw new Error("不应解析角色");
      },
      resolveMaterial: () => {
        throw new Error("不应解析素材");
      },
    });

    expect(messages).toMatchObject([
      {
        roleId: -1,
        content: "【1d10：】\n1. 继续观察\n2. 直接行动",
        diceTurn: {
          dicerSpeakerName: "海豹一号机",
          replyContent: "【1d10:2】；2 直接行动",
          replyContents: ["【1d10:2】；2 直接行动"],
        },
      },
    ]);
  });

  it("编译 RGL 多结果骰子块时保留多条骰后回复", () => {
    const parsed = parseRglImportText([
      "<dice>:",
      "cmd: 【2#1d10：】",
      "=> 【1d10:2】；2 行动",
      "=> 【1d10:1】；1 观察",
    ].join("\n"));

    const messages = compileRglImportEvents(parsed.events, {
      resolveRoleAvatar: () => {
        throw new Error("不应解析角色");
      },
      resolveMaterial: () => {
        throw new Error("不应解析素材");
      },
    });

    expect(messages).toMatchObject([
      {
        roleId: -1,
        content: "【2#1d10：】",
        diceTurn: {
          dicerSpeakerName: "骰娘",
          replyContent: "【1d10:2】；2 行动\n【1d10:1】；1 观察",
          replyContents: [
            "【1d10:2】；2 行动",
            "【1d10:1】；1 观察",
          ],
        },
      },
    ]);
  });

  it("parseAndCompileRglImportText 返回 invalidLines 并编译有效行", () => {
    const result = parseAndCompileRglImportText([
      "[烈.震惊]:正文",
      "<unknownAlias>:错误",
    ].join("\n"), {
      resolveRoleAvatar: () => ({ roleId: 10, avatarId: 20 }),
      resolveMaterial: () => {
        throw new Error("不应解析无效素材行");
      },
    });

    expect(result.invalidLines).toMatchObject([
      { lineNumber: 2, reason: "未知 annotation：unknownAlias" },
    ]);
    expect(result.messages).toMatchObject([
      {
        roleId: 10,
        avatarId: 20,
        speakerName: "烈",
        content: "正文",
      },
    ]);
  });
});

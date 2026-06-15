import { MESSAGE_TYPE } from "@tuanchat/domain/message-type";
import { describe, expect, it, vi } from "vitest";

import type { GululuGalDirectingPlan } from "./gululu-gal-directed-import";

import {
  applyGululuGalDirectedImportPlan,
  applySoloActiveStagePolicy,
  applyStagePlan,
  buildGululuGalDirectedImportPlan,
  parseGululuGalDirectedImportArgs,
} from "./gululu-gal-directed-import";

type MockFn = (...args: any[]) => any;

function createLiveResult() {
  return {
    plan: {
      avatars: [
        {
          fileName: "retsu.png",
          height: 720,
          imagePath: "gululu/retsu.png",
          key: "role:烈海王:image:gululu/retsu.png",
          width: 1280,
        },
      ],
      messages: [
        {
          avatarKey: "role:烈海王:image:gululu/retsu.png",
          kind: "dialog" as const,
          request: {
            content: "由作为贴主的我为角色的行动给出多个选项",
            extra: {},
            messageType: MESSAGE_TYPE.TEXT,
            roomId: 12970,
          },
          roleKey: "role:烈海王",
          source: {
            eventIndex: 1,
            floor: 1,
            imagePath: "gululu/retsu.png",
            speakerName: "烈海王",
          },
        },
        {
          kind: "dice" as const,
          request: {
            avatarId: -1,
            content: "数值大的那一方胜利，之后进行伤害判定",
            customRoleName: "骰娘",
            extra: {},
            messageType: MESSAGE_TYPE.TEXT,
            roleId: -1,
            roomId: 12970,
          },
          source: {
            eventIndex: 2,
            floor: 1,
          },
        },
        {
          kind: "dice" as const,
          request: {
            avatarId: -1,
            content: "那么烈啊，你要去往何处呢【1d13：】",
            customRoleName: "骰娘",
            extra: {
              diceResult: { result: "那么烈啊，你要去往何处呢【1d13:9】" },
              diceTurn: {
                command: "那么烈啊，你要去往何处呢【1d13：】",
                replies: [{ content: "那么烈啊，你要去往何处呢【1d13:9】", customRoleName: "骰娘" }],
              },
            },
            messageType: MESSAGE_TYPE.DICE,
            roleId: -1,
            roomId: 12970,
          },
          source: {
            eventIndex: 3,
            floor: 1,
          },
        },
      ],
      source: {
        key: "opus-88:floors:1-62",
        title: "烈海王似乎打算在幻想乡挑战强者们的样子",
      },
    },
    result: {
      avatars: [
        {
          avatarId: 2001,
          key: "role:烈海王:image:gululu/retsu.png",
          mediaFileId: 4001,
          roleId: 1001,
        },
      ],
      roles: [
        {
          key: "role:烈海王",
          roleId: 1001,
        },
      ],
    },
  };
}

function createDirectingPlan(): GululuGalDirectingPlan {
  return {
    entries: [
      {
        annotations: ["figure.pos.center", "figure.anim.enter"],
        eventIndex: 1,
        messageType: "text",
        webgal: { directorNote: "开场说明由烈海王居中发言" },
      },
      {
        annotations: ["figure.clear"],
        eventIndex: 2,
        messageType: "dice",
        webgal: {
          diceRender: {
            content: "数值大的那一方胜利，之后进行伤害判定",
            mode: "anko",
            showFigure: false,
            twoStep: false,
          },
        },
      },
      {
        eventIndex: 3,
        messageType: "dice",
        webgal: {
          diceRender: {
            commandContent: "那么烈啊，你要去往何处呢【1d13：】",
            mode: "anko",
            replyContent: "那么烈啊，你要去往何处呢【1d13：9】",
            showFigure: false,
            twoStep: true,
          },
        },
      },
    ],
    schemaVersion: 1,
  };
}

describe("gululu-gal-directed-import", () => {
  it("解析 GAL directed import CLI 参数", () => {
    const args = parseGululuGalDirectedImportArgs([
      "--apply",
      "--live-result",
      "old.json",
      "--directing-plan",
      "directing.json",
      "--target-space-id",
      "10438",
      "--room-name",
      "1-62楼GAL演出版",
      "--stage-policy",
      "solo-active",
      "--stage-plan",
      "stage.json",
      "--patch-chunk-size",
      "50",
      "--base-url",
      "http://127.0.0.1:8081",
      "--auth-token",
      "token",
    ]);

    expect(args).toMatchObject({
      apply: true,
      authToken: "token",
      baseUrl: "http://127.0.0.1:8081",
      directingPlan: "directing.json",
      liveResult: "old.json",
      patchChunkSize: 50,
      roomName: "1-62楼GAL演出版",
      stagePlan: "stage.json",
      stagePolicy: "solo-active",
      targetSpaceId: 10438,
    });
  });

  it("把显式导演计划编译为复用角色和头像的消息请求", () => {
    const plan = buildGululuGalDirectedImportPlan(createLiveResult(), createDirectingPlan(), {
      roomName: "1-62楼GAL演出版",
      targetSpaceId: 10438,
    });

    expect(plan.stats).toEqual({
      diceMessages: 2,
      messages: 3,
      messagesWithAnnotations: 2,
      messagesWithWebgal: 3,
      reusedAvatars: 1,
      reusedRoles: 1,
    });
    expect(plan.reused.roles).toEqual([{ key: "role:烈海王", roleId: 1001 }]);
    expect(plan.messages[0]!.request).toMatchObject({
      annotations: ["figure.pos.center", "figure.anim.enter"],
      avatarId: 2001,
      messageType: MESSAGE_TYPE.TEXT,
      roleId: 1001,
      webgal: {
        directorNote: "开场说明由烈海王居中发言",
        source: {
          eventIndex: 1,
          kind: "gululu",
          originalAssetPath: "gululu/retsu.png",
          originalSpeaker: "烈海王",
          segmentId: "1",
        },
      },
    });
    expect(plan.messages[1]!.request).toMatchObject({
      annotations: ["figure.clear"],
      customRoleName: "骰娘",
      extra: {
        diceResult: { result: "数值大的那一方胜利，之后进行伤害判定" },
        diceTurn: {
          replies: [{ content: "数值大的那一方胜利，之后进行伤害判定", customRoleName: "骰娘" }],
        },
      },
      messageType: MESSAGE_TYPE.DICE,
      roleId: -1,
      webgal: {
        diceRender: {
          content: "数值大的那一方胜利，之后进行伤害判定",
          mode: "anko",
          showFigure: false,
          twoStep: false,
        },
      },
    });
    expect(plan.messages[2]!.request).toMatchObject({
      content: "那么烈啊，你要去往何处呢【1d13：】",
      extra: {
        diceResult: { result: "那么烈啊，你要去往何处呢【1d13：9】" },
        diceTurn: {
          command: "那么烈啊，你要去往何处呢【1d13：】",
          replies: [{ content: "那么烈啊，你要去往何处呢【1d13：9】", customRoleName: "骰娘" }],
        },
      },
      webgal: {
        diceRender: {
          commandContent: "那么烈啊，你要去往何处呢【1d13：】",
          replyContent: "那么烈啊，你要去往何处呢【1d13：9】",
        },
      },
    });
  });

  it("导演计划未真实拆分骰子过程和结果时保留源导入拆分", () => {
    const directingPlan = createDirectingPlan();
    directingPlan.entries[2]!.webgal = {
      diceRender: {
        commandContent: "那么烈啊，你要去往何处呢【1d13:9】",
        mode: "anko",
        replyContent: "那么烈啊，你要去往何处呢【1d13:9】",
        twoStep: false,
      },
    };

    const plan = buildGululuGalDirectedImportPlan(createLiveResult(), directingPlan, {
      targetSpaceId: 10438,
    });

    expect(plan.messages[2]!.request).toMatchObject({
      content: "那么烈啊，你要去往何处呢【1d13：】",
      extra: {
        diceResult: { result: "那么烈啊，你要去往何处呢【1d13:9】" },
        diceTurn: {
          command: "那么烈啊，你要去往何处呢【1d13：】",
          replies: [{ content: "那么烈啊，你要去往何处呢【1d13:9】", customRoleName: "骰娘" }],
        },
      },
      webgal: {
        diceRender: {
          commandContent: "那么烈啊，你要去往何处呢【1d13：】",
          replyContent: "那么烈啊，你要去往何处呢【1d13:9】",
        },
      },
    });
  });

  it("把紧跟骰子的短括号吐槽合并进骰子链", () => {
    const liveResult = createLiveResult();
    liveResult.plan.messages.push({
      kind: "narration" as const,
      request: {
        avatarId: -1,
        content: "（90以上不需要永琳就能救命了）",
        customRoleName: "旁白",
        extra: {},
        messageType: MESSAGE_TYPE.TEXT,
        roleId: -1,
        roomId: 12970,
      },
      source: {
        eventIndex: 4,
        floor: 1,
      },
    });
    const directingPlan = createDirectingPlan();
    directingPlan.entries.push({
      eventIndex: 4,
      imageShow: {
        avatarKey: "role:烈海王:image:gululu/retsu.png",
      },
      messageType: "text",
      webgal: {
        narration: { mode: "normal" },
      },
    });

    const plan = buildGululuGalDirectedImportPlan(liveResult, directingPlan, {
      targetSpaceId: 10438,
    });

    expect(plan.messages).toHaveLength(4);
    expect(plan.stats.messages).toBe(4);
    expect(plan.messages.map(message => message.eventIndex)).toEqual([1, 2, 3, 4]);
    expect(plan.messages[2]!.request.extra).toMatchObject({
      diceResult: {
        result: "那么烈啊，你要去往何处呢【1d13：9】\n（90以上不需要永琳就能救命了）",
      },
      diceTurn: {
        command: "那么烈啊，你要去往何处呢【1d13：】",
        replies: [
          { content: "那么烈啊，你要去往何处呢【1d13：9】", customRoleName: "骰娘" },
          { content: "（90以上不需要永琳就能救命了）", customRoleName: "旁白" },
        ],
      },
    });
    expect(plan.messages[2]!.request.webgal?.diceRender).toMatchObject({
      content: "那么烈啊，你要去往何处呢【1d13：9】\n（90以上不需要永琳就能救命了）",
      replyContent: "那么烈啊，你要去往何处呢【1d13：9】\n（90以上不需要永琳就能救命了）",
    });
    expect(plan.messages[3]!.request.messageType).toBe(MESSAGE_TYPE.IMG);
  });

  it("作者骰后吐槽即使沿用舞台头像也按旁白并入骰子链", () => {
    const liveResult = createLiveResult();
    liveResult.plan.messages[2]!.source.eventIndex = 68;
    liveResult.plan.messages.push({
      avatarKey: "role:烈海王:image:gululu/retsu.png",
      kind: "narration" as const,
      request: {
        avatarId: -1,
        content: "（指烈的神经）",
        customRoleName: "旁白",
        extra: {},
        messageType: MESSAGE_TYPE.TEXT,
        roleId: -1,
        roomId: 12970,
      },
      roleKey: "role:烈海王",
      source: {
        eventIndex: 69,
        floor: 1,
      },
    });
    const directingPlan = createDirectingPlan();
    directingPlan.entries[2]!.eventIndex = 68;
    directingPlan.entries.push({
      eventIndex: 69,
      messageType: "text",
      webgal: {
        narration: { mode: "normal" },
      },
    });

    const plan = buildGululuGalDirectedImportPlan(liveResult, directingPlan, {
      targetSpaceId: 10438,
    });

    expect(plan.messages.map(message => message.eventIndex)).toEqual([1, 2, 68]);
    const replies = plan.messages[2]!.request.extra?.diceTurn?.replies ?? [];
    expect(replies[1]).toEqual({
      content: "（指烈的神经）",
      customRoleName: "旁白",
    });
  });

  it("人工审定的作者骰后吐槽覆盖误挂的说话人和头像", () => {
    const liveResult = createLiveResult();
    liveResult.plan.messages[2]!.source.eventIndex = 136;
    liveResult.plan.messages.push({
      avatarKey: "role:烈海王:image:gululu/retsu.png",
      kind: "narration" as const,
      request: {
        avatarId: -1,
        content: "只比师匠低1是怎么回事，烈意外的有当小白脸的天赋吗",
        extra: {},
        messageType: MESSAGE_TYPE.TEXT,
        roleId: -1,
        roomId: 12970,
      },
      roleKey: "role:烈海王",
      source: {
        eventIndex: 137,
        floor: 1,
        speakerName: "莉格露",
      },
    });
    const directingPlan = createDirectingPlan();
    directingPlan.entries[2]!.eventIndex = 136;
    directingPlan.entries.push({
      eventIndex: 137,
      messageType: "text",
      webgal: {
        narration: { mode: "normal" },
      },
    });

    const plan = buildGululuGalDirectedImportPlan(liveResult, directingPlan, {
      targetSpaceId: 10438,
    });

    expect(plan.messages.map(message => message.eventIndex)).toEqual([1, 2, 136]);
    const replies = plan.messages[2]!.request.extra?.diceTurn?.replies ?? [];
    expect(replies[1]).toEqual({
      content: "只比师匠低1是怎么回事，烈意外的有当小白脸的天赋吗",
      customRoleName: "旁白",
    });
  });

  it("显式角色吐槽保留为独立角色消息", () => {
    const liveResult = createLiveResult();
    liveResult.plan.messages[2]!.source.eventIndex = 255;
    liveResult.plan.messages.push({
      avatarKey: "role:烈海王:image:gululu/retsu.png",
      kind: "dialog" as const,
      request: {
        avatarId: -1,
        content: "（这女人搞什么鬼）",
        customRoleName: "烈",
        extra: {},
        messageType: MESSAGE_TYPE.TEXT,
        roleId: -1,
        roomId: 12970,
      },
      roleKey: "role:烈海王",
      source: {
        eventIndex: 256,
        floor: 1,
        speakerName: "烈",
      },
    });
    const directingPlan = createDirectingPlan();
    directingPlan.entries[2]!.eventIndex = 255;
    directingPlan.entries.push({
      eventIndex: 256,
      messageType: "text",
      webgal: {
        narration: { mode: "thought" },
      },
    });

    const plan = buildGululuGalDirectedImportPlan(liveResult, directingPlan, {
      targetSpaceId: 10438,
    });

    expect(plan.messages.map(message => message.eventIndex)).toEqual([1, 2, 255, 256]);
    expect(plan.messages[2]!.request.extra?.diceTurn?.replies).toEqual([
      { content: "那么烈啊，你要去往何处呢【1d13：9】", customRoleName: "骰娘" },
    ]);
    expect(plan.messages[3]!.request).toMatchObject({
      avatarId: 2001,
      content: "（这女人搞什么鬼）",
      customRoleName: "烈",
      messageType: MESSAGE_TYPE.TEXT,
      roleId: 1001,
      webgal: {
        source: {
          eventIndex: 256,
          originalSpeaker: "烈",
        },
      },
    });
  });

  it("过滤人工审定的作者阶段性复盘并保留下一段入口", () => {
    const liveResult = createLiveResult();
    liveResult.plan.messages.push(
      {
        kind: "narration" as const,
        request: {
          avatarId: -1,
          content: "（以下是我的废话）",
          customRoleName: "旁白",
          extra: {},
          messageType: MESSAGE_TYPE.TEXT,
          roleId: -1,
          roomId: 12970,
        },
        source: {
          eventIndex: 111,
          floor: 25,
        },
      },
      {
        avatarKey: "role:烈海王:image:gululu/retsu.png",
        kind: "narration" as const,
        request: {
          avatarId: -1,
          content: "大 草 原",
          customRoleName: "旁白",
          extra: {},
          messageType: MESSAGE_TYPE.TEXT,
          roleId: -1,
          roomId: 12970,
        },
        source: {
          eventIndex: 112,
          floor: 25,
        },
      },
      {
        kind: "narration" as const,
        request: {
          avatarId: -1,
          content: "本次的小番外",
          customRoleName: "旁白",
          extra: {},
          messageType: MESSAGE_TYPE.TEXT,
          roleId: -1,
          roomId: 12970,
        },
        source: {
          eventIndex: 128,
          floor: 25,
        },
      },
      {
        kind: "narration" as const,
        request: {
          avatarId: -1,
          content: "第一日的发展过于平和了吧",
          customRoleName: "旁白",
          extra: {},
          messageType: MESSAGE_TYPE.TEXT,
          roleId: -1,
          roomId: 12970,
        },
        source: {
          eventIndex: 318,
          floor: 58,
        },
      },
      {
        kind: "narration" as const,
        request: {
          avatarId: -1,
          content: "今晚的小番外",
          customRoleName: "旁白",
          extra: {},
          messageType: MESSAGE_TYPE.TEXT,
          roleId: -1,
          roomId: 12970,
        },
        source: {
          eventIndex: 324,
          floor: 58,
        },
      },
      {
        kind: "narration" as const,
        request: {
          avatarId: -1,
          content: "PS2：在之后的更新里是否需要对出场角色做一个简要的说明呢？",
          customRoleName: "旁白",
          extra: {},
          messageType: MESSAGE_TYPE.TEXT,
          roleId: -1,
          roomId: 12970,
        },
        source: {
          eventIndex: 340,
          floor: 60,
        },
      },
      {
        kind: "narration" as const,
        request: {
          avatarId: -1,
          content: "烈的人物卡中武术之爱这个技能被舍弃了",
          customRoleName: "旁白",
          extra: {},
          messageType: MESSAGE_TYPE.TEXT,
          roleId: -1,
          roomId: 12970,
        },
        source: {
          eventIndex: 343,
          floor: 61,
        },
      },
    );
    const directingPlan = createDirectingPlan();
    directingPlan.entries.push(
      {
        eventIndex: 111,
        messageType: "text",
        webgal: {
          narration: { mode: "normal" },
        },
      },
      {
        eventIndex: 112,
        imageShow: {
          avatarKey: "role:烈海王:image:gululu/retsu.png",
        },
        messageType: "text",
        webgal: {
          narration: { mode: "normal" },
        },
      },
      {
        annotations: ["figure.clear", "image.clear"],
        eventIndex: 128,
        messageType: "text",
        webgal: {
          narration: { mode: "normal" },
        },
      },
      {
        eventIndex: 318,
        messageType: "text",
        webgal: {
          narration: { mode: "normal" },
        },
      },
      {
        annotations: ["figure.clear", "image.clear"],
        eventIndex: 324,
        messageType: "text",
        webgal: {
          narration: { mode: "normal" },
        },
      },
      {
        eventIndex: 340,
        messageType: "text",
        webgal: {
          narration: { mode: "normal" },
        },
      },
      {
        annotations: ["figure.clear", "image.clear"],
        eventIndex: 343,
        messageType: "text",
        webgal: {
          narration: { mode: "normal" },
        },
      },
    );

    const plan = buildGululuGalDirectedImportPlan(liveResult, directingPlan, {
      targetSpaceId: 10438,
    });

    expect(plan.messages.map(message => message.eventIndex)).toEqual([1, 2, 3, 128, 324, 343]);
    expect(plan.messages.at(-1)!.request).toMatchObject({
      annotations: ["figure.clear", "image.clear"],
      content: "烈的人物卡中武术之爱这个技能被舍弃了",
      messageType: MESSAGE_TYPE.TEXT,
    });
  });

  it("保留嵌套骰链的完整选项和多段回复", () => {
    const liveResult = createLiveResult();
    const command = [
      "【1d10：】",
      "1 师匠，请指导我",
      "9 与铃仙交流",
      "10 大成功/大失败【1d2：】",
    ].join("\n");
    liveResult.plan.messages[2]!.request = {
      avatarId: -1,
      content: command,
      customRoleName: "骰娘",
      extra: {
        diceResult: { result: "【1d10：10】\n10 大成功/大失败【1d2：2】\n【1d10：9】" },
        diceTurn: {
          command,
          replies: [
            { content: "【1d10：10】", customRoleName: "骰娘" },
            { content: "10 大成功/大失败【1d2：2】", customRoleName: "骰娘" },
            { content: "【1d10：9】", customRoleName: "骰娘" },
          ],
        },
      },
      messageType: MESSAGE_TYPE.DICE,
      roleId: -1,
      roomId: 12970,
    };
    const directingPlan = createDirectingPlan();
    directingPlan.entries[2]!.webgal = {
      diceRender: {
        commandContent: "【1d10：】\n1 师匠，请指导我\n9 与铃仙交流",
        mode: "anko",
        replyContent: "【1d10：9】",
        showFigure: false,
        twoStep: true,
      },
    };

    const plan = buildGululuGalDirectedImportPlan(liveResult, directingPlan, {
      targetSpaceId: 10438,
    });

    expect(plan.messages[2]!.request).toMatchObject({
      content: command,
      extra: {
        diceResult: { result: "【1d10：10】\n10 大成功/大失败【1d2：2】\n【1d10：9】" },
        diceTurn: {
          command,
          replies: [
            { content: "【1d10：10】", customRoleName: "骰娘" },
            { content: "10 大成功/大失败【1d2：2】", customRoleName: "骰娘" },
            { content: "【1d10：9】", customRoleName: "骰娘" },
          ],
        },
      },
      webgal: {
        diceRender: {
          commandContent: command,
          replyContent: "【1d10：10】\n10 大成功/大失败【1d2：2】\n【1d10：9】",
        },
      },
    });
  });

  it("solo-active 策略会清理旧立绘并把当前说话人居中", () => {
    const plan = buildGululuGalDirectedImportPlan(createLiveResult(), createDirectingPlan(), {
      stagePolicy: "solo-active",
      targetSpaceId: 10438,
    });

    expect(plan.messages[0]!.request.annotations).toEqual([
      "figure.clear",
      "figure.anim.enter",
      "figure.pos.center",
    ]);
    expect(plan.messages[0]!.request.webgal).toMatchObject({
      stage: {
        position: "center",
        reason: "solo-active-speaker",
      },
    });
    expect(plan.messages[1]!.request.annotations).toEqual(["figure.clear"]);
    expect(plan.messages[2]!.request.annotations).toEqual(["figure.clear"]);
    expect(plan.messages[2]!.request.webgal).toMatchObject({
      diceRender: {
        showFigure: false,
        showMiniAvatar: false,
      },
    });
  });

  it("可以直接输出 solo-active 后处理后的导演计划", () => {
    const directingPlan = applySoloActiveStagePolicy(createLiveResult(), createDirectingPlan());

    expect(directingPlan.entries.map(entry => entry.annotations)).toEqual([
      ["figure.clear", "figure.anim.enter", "figure.pos.center"],
      ["figure.clear"],
      ["figure.clear"],
    ]);
  });

  it("stage plan 会按场景开始清场并覆盖角色槽位", () => {
    const directingPlan = applyStagePlan(createLiveResult(), createDirectingPlan(), {
      scenes: [{
        clearOnStart: true,
        endEventIndex: 3,
        rolePositions: {
          "role:烈海王": "right-center",
        },
        sceneId: "opening",
        startEventIndex: 1,
      }],
      schemaVersion: 1,
    });

    expect(directingPlan.entries[0]).toMatchObject({
      annotations: ["figure.anim.enter", "figure.clear", "image.clear", "figure.pos.right-center"],
      webgal: {
        stage: {
          position: "right-center",
          reason: "stage-plan",
          sceneId: "opening",
        },
      },
    });
    expect(directingPlan.entries[1]).toMatchObject({
      annotations: ["figure.clear"],
      webgal: {
        stage: {
          sceneId: "opening",
        },
      },
    });
  });

  it("编译时可应用 stage plan 且不清掉非舞台 annotations", () => {
    const directingPlan = createDirectingPlan();
    directingPlan.entries[0]!.annotations = ["dialog.notend", "figure.pos.center", "figure.anim.enter"];

    const plan = buildGululuGalDirectedImportPlan(createLiveResult(), directingPlan, {
      stagePlan: {
        scenes: [{
          clearOnStart: true,
          rolePositions: { "role:烈海王": "left" },
          sceneId: "opening",
          startEventIndex: 1,
        }],
        schemaVersion: 1,
      },
      targetSpaceId: 10438,
    });

    expect(plan.messages[0]!.request.annotations).toEqual([
      "dialog.notend",
      "figure.anim.enter",
      "figure.clear",
      "image.clear",
      "figure.pos.left",
    ]);
  });

  it("imageShow 会插入展示图消息并允许原对白去掉错误头像", () => {
    const directingPlan = createDirectingPlan();
    directingPlan.entries[0] = {
      ...directingPlan.entries[0]!,
      avatarKey: null,
      imageShow: {
        clearBefore: true,
      },
    };

    const plan = buildGululuGalDirectedImportPlan(createLiveResult(), directingPlan, {
      targetSpaceId: 10438,
    });

    expect(plan.messages).toHaveLength(4);
    expect(plan.messages[0]!.request).toMatchObject({
      annotations: ["image.clear", "image.show"],
      avatarId: -1,
      extra: {
        imageMessage: {
          fileName: "retsu.png",
          height: 720,
          source: {
            fileId: 4001,
            kind: "internal",
          },
          width: 1280,
        },
      },
      messageType: MESSAGE_TYPE.IMG,
      roleId: -1,
    });
    expect(plan.messages[1]!.request).toMatchObject({
      avatarId: -1,
      roleId: 1001,
    });
  });

  it("导演计划必须覆盖每条源消息", () => {
    const directingPlan = createDirectingPlan();
    directingPlan.entries.pop();

    expect(() => buildGululuGalDirectedImportPlan(createLiveResult(), directingPlan, {
      targetSpaceId: 10438,
    })).toThrow("导演计划条数不匹配");
  });

  it("apply 会创建新房间、复用角色并批量写入带 annotations/webgal 的消息", async () => {
    const plan = buildGululuGalDirectedImportPlan(createLiveResult(), createDirectingPlan(), {
      roomName: "1-62楼GAL演出版",
      targetSpaceId: 10438,
    });
    const calls: string[] = [];
    const setSidebarTree = vi.fn<MockFn>(async (request: { treeJson: string }) => ({
      data: { treeJson: request.treeJson, version: 2 },
      success: true,
    }));
    const client = {
      chatController: {
        patchRoomMessages: vi.fn<MockFn>(async (request: { operations: any[]; roomId: number }) => {
          calls.push(`patch:${request.roomId}:${request.operations.length}`);
          return {
            data: request.operations.map((_operation, index) => ({
              messageId: 3000 + index,
              syncId: index + 1,
            })),
            success: true,
          };
        }),
      },
      roomController: {
        getUserRooms: vi.fn<MockFn>(async () => ({
          data: {
            rooms: [{ name: "1-62楼GAL演出版", roomId: 9001 }],
            spaceId: 10438,
          },
          success: true,
        })),
      },
      roomRoleController: {
        addRole: vi.fn<MockFn>(async (request: { roleIdList: number[] }) => {
          calls.push(`role.add:${request.roleIdList.join(",")}`);
          return { success: true };
        }),
        roomNpcRole: vi.fn<MockFn>(async () => {
          calls.push("role.list");
          return { data: [], success: true };
        }),
      },
      spaceController: {
        createRoom: vi.fn<MockFn>(async () => {
          calls.push("room.create");
          return { data: { name: "1-62楼GAL演出版", roomId: 9001, spaceId: 10438 }, success: true };
        }),
      },
      spaceSidebarTreeController: {
        getSidebarTree: vi.fn<MockFn>(async () => ({
          data: {
            treeJson: JSON.stringify({ categories: [], schemaVersion: 2 }),
            version: 1,
          },
          success: true,
        })),
        setSidebarTree,
      },
    };

    const result = await applyGululuGalDirectedImportPlan(plan, client, { patchChunkSize: 2 });

    expect(calls).toEqual(["room.create", "role.list", "role.add:1001", "patch:9001:2", "patch:9001:1"]);
    expect(result.createdRoom).toEqual({ name: "1-62楼GAL演出版", roomId: 9001, spaceId: 10438 });
    expect(result.messages).toHaveLength(3);
    expect(result.roomRoles.addedRoleIds).toEqual([1001]);
    expect(result.sidebarTree).toMatchObject({ action: "added", roomId: 9001, spaceId: 10438 });
    expect(client.chatController.patchRoomMessages.mock.calls[0]![0].operations[0].message).toMatchObject({
      annotations: ["figure.pos.center", "figure.anim.enter"],
      avatarId: 2001,
      roleId: 1001,
      webgal: {
        directorNote: "开场说明由烈海王居中发言",
      },
    });
    expect(client.chatController.patchRoomMessages.mock.calls[0]![0].mutationMeta).toEqual({
      operationCause: "normal",
      sourceSurface: "import",
    });
    expect(client.chatController.patchRoomMessages.mock.calls[0]![0].operations[1].message).toMatchObject({
      messageType: MESSAGE_TYPE.DICE,
      webgal: {
        diceRender: {
          mode: "anko",
        },
      },
    });
  });
});

import type { GalAuthoringContext } from "@tuanchat/galgame-ai-contract";

import { describe, expect, it } from "vitest";

import { compileGalCopilotIntentResponseToPatch, resolveGalMessageSelector } from "./copilotIntentCompiler";

const context: GalAuthoringContext = {
  staticGuide: {
    schemaVersion: "1",
    fieldGuide: "",
    patchGuide: "",
    validationGuide: "",
  },
  space: {
    spaceId: "1",
    rooms: [{ roomId: "10", name: "序章" }],
    annotationCatalog: [],
  },
  room: {
    spaceId: "1",
    roomId: "10",
    name: "序章",
  },
  messages: [
    {
      messageId: "100",
      position: 1,
      roomId: "10",
      messageType: 1,
      purpose: "narration",
      roleId: "narrator",
      content: "雨声压低了脚步。",
      annotations: ["scene.rain"],
    },
    {
      messageId: "101",
      position: 2,
      roomId: "10",
      messageType: 1,
      purpose: "dialogue",
      roleId: "20",
      roleName: "林夏",
      content: "门开了。",
      annotations: [],
    },
    {
      messageId: "102",
      position: 3,
      roomId: "10",
      messageType: 1,
      purpose: "dialogue",
      roleId: "20",
      roleName: "林夏",
      content: "我不会社gal。",
      annotations: ["figure.pos.left"],
    },
  ],
  roles: {
    roomRoles: [
      {
        roleId: "20",
        roleName: "林夏",
        avatarId: "200",
        avatarVariants: [
          { roleId: "20", avatarId: "201", category: "右" },
        ],
      },
    ],
    narrator: {
      roleId: "narrator",
      roleName: "旁白",
      kind: "narrator",
    },
  },
  annotations: [
    { id: "scene.rain", label: "雨", source: "builtin" },
    { id: "figure.pos.left", label: "左", source: "builtin" },
    { id: "figure.pos.right", label: "右", source: "builtin" },
  ],
  attachmentRefs: [],
};

describe("copilotIntentCompiler", () => {
  it("resolves natural message selectors", () => {
    expect(resolveGalMessageSelector({ ordinal: "last_dialogue" }, context).messageId).toBe("102");
    expect(resolveGalMessageSelector({ textIncludes: "门开" }, context).messageId).toBe("101");
  });

  it("compiles rewrite and insertion intents into GalStoryPatch operations", () => {
    const patch = compileGalCopilotIntentResponseToPatch({
      intents: [
        {
          action: "rewrite",
          target: { textIncludes: "不会社gal" },
          content: "完全不会写 gal！",
        },
        {
          action: "insert_after",
          anchor: { ordinal: "last" },
          message: {
            speaker: "旁白",
            content: "空气安静了一瞬。",
          },
        },
      ],
    }, context);

    expect(patch.operations).toEqual([
      {
        op: "replace_content",
        messageId: "102",
        content: "完全不会写 gal！",
      },
      {
        op: "insert_after",
        afterMessageId: "102",
        message: {
          messageType: 1,
          purpose: "narration",
          roleId: "narrator",
          content: "空气安静了一瞬。",
          annotations: [],
        },
      },
    ]);
  });

  it("compiles speaker, avatar, annotation, delete, and move intents", () => {
    const patch = compileGalCopilotIntentResponseToPatch({
      intents: [
        {
          action: "change_speaker",
          target: { messageId: "102" },
          speaker: "沙",
        },
        {
          action: "change_avatar",
          target: { messageId: "102" },
          avatarLabel: "右",
        },
        {
          action: "add_annotations",
          target: { messageId: "102" },
          annotations: ["figure.pos.right"],
        },
        {
          action: "delete",
          target: { messageId: "101" },
        },
        {
          action: "move_before",
          target: { messageId: "102" },
          anchor: { messageId: "100" },
        },
      ],
    }, context);

    expect(patch.operations).toEqual([
      {
        op: "update_role",
        messageId: "102",
        roleId: "20",
        customRoleName: "沙",
      },
      {
        op: "update_avatar",
        messageId: "102",
        avatarId: "201",
      },
      {
        op: "update_annotations",
        messageId: "102",
        annotations: ["figure.pos.left", "figure.pos.right"],
      },
      {
        op: "delete",
        messageId: "101",
      },
      {
        op: "move",
        messageId: "102",
        beforeMessageId: "100",
      },
    ]);
  });
});

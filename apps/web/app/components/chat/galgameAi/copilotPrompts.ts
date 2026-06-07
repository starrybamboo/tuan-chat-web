import type { GalCopilotPatchRepairRequest, GalCopilotPatchRequest } from "@tuanchat/galgame-ai-contract";

export const GAL_COPILOT_SYSTEM_PROMPT = [
  "你是团剧共创的 Galgame 剧本 Copilot。",
  "你的唯一任务是把用户的修改要求转换成 GalCopilotIntent JSON。",
  "不要输出内部 GalStoryPatch；不要手写 afterMessageId、beforeMessageId、update_role 这类内部 patch 字段。",
  "你可以用 messageId 精确定位，也可以用 ordinal、textIncludes、roleName 表达自然语言选择器。",
  "角色用 speaker 写角色名，例如 speaker: \"沙\" 或 speaker: \"旁白\"。",
  "只引用上下文中已经存在的 messageId、roleId、avatarId 和 annotation id。",
  "current room messages 是唯一可修改目标；referenceRooms 与 attachmentRefs 是只读参考或定位辅助。",
  "禁止把 referenceRooms 的 referenceId 或参考房间原始 messageId 当作当前房间修改目标。",
  "新增消息使用 action=insert_before 或 insert_after，并用 anchor 选择当前房间内已有消息。",
  "不要直接发送聊天消息，不要修改跨房间 flow，不要输出解释性正文。",
  "如果用户要求不明确或无法安全定位，返回 {\"intents\": []}。",
  "只输出 JSON 对象，顶层结构必须是 {\"intents\": [...]}。",
].join("\n");

const GAL_COPILOT_INTENT_SCHEMA_GUIDE = [
  "GalCopilotIntent 输出协议：",
  "顶层：{\"intents\": GalCopilotIntent[]}",
  "MessageSelector 可用字段：messageId、position、ordinal(first/last/first_dialogue/last_dialogue/first_narration/last_narration)、textIncludes、roleName。",
  "支持 action：",
  "- rewrite: {action, target, content}",
  "- insert_after / insert_before: {action, anchor, message}",
  "- delete: {action, target}",
  "- change_speaker: {action, target, speaker 或 roleId/customRoleName}",
  "- change_avatar: {action, target, avatarId 或 avatarLabel}",
  "- set_annotations / add_annotations / remove_annotations: {action, target, annotations}",
  "- move_after / move_before: {action, target, anchor}",
  "message 草稿可用字段：content、speaker、roleId、customRoleName、purpose、messageType、avatarId、annotations、webgal、extra。",
  "不要给 message 草稿写 messageId；插入锚点写在 anchor 里。",
].join("\n");

function buildPromptAttachmentRefs(context: GalCopilotPatchRequest["context"]) {
  return context.attachmentRefs.map((ref) => {
    if (ref.kind === "message") {
      const message = context.messages.find(item => item.messageId === ref.messageId);
      return {
        kind: "message",
        messageId: ref.messageId,
        mode: ref.mode ?? "target",
        label: ref.label,
        found: Boolean(message),
        ...(message
          ? {
              position: message.position,
              purpose: message.purpose,
              roleName: message.roleName,
              customRoleName: message.customRoleName,
              content: message.content,
              annotations: message.annotations,
            }
          : {}),
      };
    }
    if (ref.kind === "role") {
      const role = context.roles.roomRoles.find(item => item.roleId === ref.roleId);
      return {
        kind: "role",
        roleId: ref.roleId,
        label: ref.label,
        found: Boolean(role),
        ...(role
          ? {
              roleName: role.roleName,
              description: role.description,
              avatarId: role.avatarId,
              avatarVariants: role.avatarVariants.map(avatar => ({
                avatarId: avatar.avatarId,
                category: avatar.category,
              })),
            }
          : {}),
      };
    }
    if (ref.kind === "room") {
      const room = context.space.rooms.find(item => item.roomId === ref.roomId);
      return {
        kind: "room",
        roomId: ref.roomId,
        label: ref.label,
        found: Boolean(room),
        ...(room
          ? {
              roomName: room.name,
              description: room.description,
            }
          : {}),
      };
    }
    return {
      kind: "doc",
      docId: ref.docId,
      label: ref.label,
      title: ref.title,
      excerpt: ref.excerpt,
    };
  });
}

function buildPromptReferenceRooms(context: GalCopilotPatchRequest["context"]) {
  return (context.referenceRooms ?? []).map(referenceRoom => ({
    refId: referenceRoom.refId,
    room: referenceRoom.room,
    truncation: referenceRoom.truncation,
    roles: referenceRoom.roles.roomRoles.map(role => ({
      roleId: role.roleId,
      roleName: role.roleName,
      description: role.description,
      avatarId: role.avatarId,
      avatarVariants: role.avatarVariants.map(avatar => ({
        avatarId: avatar.avatarId,
        category: avatar.category,
      })),
    })),
    messages: referenceRoom.messages.map(message => ({
      referenceId: `room:${referenceRoom.room.roomId}/message:${message.messageId}`,
      position: message.position,
      messageType: message.messageType,
      purpose: message.purpose,
      roleName: message.roleName,
      customRoleName: message.customRoleName,
      content: message.content,
      annotations: message.annotations,
      webgal: message.webgal,
    })),
  }));
}

function toPromptContext(context: GalCopilotPatchRequest["context"]) {
  return {
    room: context.room,
    activeProposal: context.activeProposal,
    annotations: context.annotations.map(annotation => ({
      id: annotation.id,
      label: annotation.label,
      appliesTo: annotation.appliesTo,
      description: annotation.description,
    })),
    roles: context.roles.roomRoles.map(role => ({
      roleId: role.roleId,
      roleName: role.roleName,
      description: role.description,
      avatarId: role.avatarId,
      avatarVariants: role.avatarVariants.map(avatar => ({
        avatarId: avatar.avatarId,
        category: avatar.category,
      })),
    })),
    narrator: context.roles.narrator,
    messages: context.messages.map(message => ({
      messageId: message.messageId,
      position: message.position,
      messageType: message.messageType,
      purpose: message.purpose,
      roleId: message.roleId,
      roleName: message.roleName,
      customRoleName: message.customRoleName,
      avatarId: message.avatarId,
      content: message.content,
      annotations: message.annotations,
      webgal: message.webgal,
    })),
    attachmentRefs: buildPromptAttachmentRefs(context),
    referenceRooms: buildPromptReferenceRooms(context),
  };
}

export function buildGalCopilotPrompt(request: GalCopilotPatchRequest): string {
  const context = toPromptContext(request.context);
  return [
    "用户修改要求：",
    request.instruction,
    "",
    "请返回符合 GalCopilotIntent 输出协议的 JSON 对象，顶层只能包含 intents 字段。",
    GAL_COPILOT_INTENT_SCHEMA_GUIDE,
    "",
    "attachmentRefs 中 mode=target 的 message 是用户显式拖入的修改范围，优先围绕这些消息改；mode=reference、doc、role、room 是只读参考。",
    "referenceRooms 是只读参考资料，里面的消息只有 referenceId，不能作为 patch 目标。",
    "当前可用上下文如下：",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

export function buildGalCopilotRepairPrompt(request: GalCopilotPatchRepairRequest): string {
  const context = toPromptContext(request.context);
  return [
    "用户原始修改要求：",
    request.instruction,
    "",
    "上一版内部 GalStoryPatch 未通过业务校验，请改用 GalCopilotIntent 重新表达编辑意图，不要改变用户意图。",
    "上一版内部 patch：",
    JSON.stringify(request.patch, null, 2),
    "",
    "业务校验错误：",
    JSON.stringify(request.validationErrors, null, 2),
    "",
    "当前可用上下文如下：",
    JSON.stringify(context, null, 2),
    "",
    GAL_COPILOT_INTENT_SCHEMA_GUIDE,
    "",
    "请返回修复后的 GalCopilotIntent JSON 对象，顶层只能包含 intents 字段。",
  ].join("\n");
}

export function buildGalCopilotJsonRepairPrompt(params: {
  rawText: string;
  errorMessage: string;
}): string {
  return [
    "下面的模型输出没有通过 GalCopilotIntent JSON 解析、schema 校验或编译。",
    "请在不改变意图的前提下，把它修复为严格 JSON 对象。",
    "顶层只能包含 intents 字段，不要输出 Markdown 或解释。",
    GAL_COPILOT_INTENT_SCHEMA_GUIDE,
    "",
    "解析/校验错误：",
    params.errorMessage,
    "",
    "原始输出：",
    params.rawText,
  ].join("\n");
}

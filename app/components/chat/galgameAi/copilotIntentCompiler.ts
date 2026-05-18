import type {
  GalAuthoringContext,
  GalCopilotIntent,
  GalCopilotIntentResponse,
  GalCopilotMessageDraft,
  GalMessageSelector,
  GalMessageView,
  GalPatchMessageInput,
  GalStoryPatch,
  GalStoryPatchOperation,
} from "@tuanchat/galgame-ai-contract";

import { galStoryPatchSchema } from "@tuanchat/galgame-ai-contract";

type ResolvedSpeaker = {
  roleId?: string;
  customRoleName?: string;
  purpose?: GalPatchMessageInput["purpose"];
};

function sortMessages(messages: GalMessageView[]): GalMessageView[] {
  return [...messages].sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }
    return Number(left.messageId) - Number(right.messageId);
  });
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function getMessageSpeakerName(message: GalMessageView, context: GalAuthoringContext): string {
  if (message.customRoleName?.trim()) {
    return message.customRoleName.trim();
  }
  if (message.roleName?.trim()) {
    return message.roleName.trim();
  }
  if (message.roleId === context.roles.narrator.roleId || !message.roleId) {
    return context.roles.narrator.roleName;
  }
  return message.roleId;
}

function filterMessagesBySelector(messages: GalMessageView[], selector: GalMessageSelector, context: GalAuthoringContext) {
  let candidates = messages;
  const textIncludes = normalizeText(selector.textIncludes);
  if (textIncludes) {
    candidates = candidates.filter(message => normalizeText(message.content).includes(textIncludes));
  }
  const roleName = normalizeText(selector.roleName);
  if (roleName) {
    candidates = candidates.filter(message => normalizeText(getMessageSpeakerName(message, context)) === roleName);
  }
  return candidates;
}

function pickByOrdinal(messages: GalMessageView[], ordinal: GalMessageSelector["ordinal"]): GalMessageView | undefined {
  const ordered = sortMessages(messages);
  const reversed = [...ordered].reverse();
  switch (ordinal) {
    case "first":
      return ordered[0];
    case "last":
    case undefined:
      return ordered[ordered.length - 1];
    case "first_dialogue":
      return ordered.find(message => message.purpose === "dialogue");
    case "last_dialogue":
      return reversed.find(message => message.purpose === "dialogue");
    case "first_narration":
      return ordered.find(message => message.purpose === "narration");
    case "last_narration":
      return reversed.find(message => message.purpose === "narration");
  }
}

function getDefaultTargetMessage(context: GalAuthoringContext): GalMessageView | undefined {
  const targetRef = context.attachmentRefs.find(ref => ref.kind === "message" && (ref.mode ?? "target") === "target");
  if (targetRef?.kind === "message") {
    const matched = context.messages.find(message => message.messageId === targetRef.messageId);
    if (matched) {
      return matched;
    }
  }
  return sortMessages(context.messages).at(-1);
}

export function resolveGalMessageSelector(selector: GalMessageSelector, context: GalAuthoringContext): GalMessageView {
  if (selector.messageId) {
    const matched = context.messages.find(message => message.messageId === selector.messageId);
    if (matched) {
      return matched;
    }
    throw new Error(`无法定位消息 messageId=${selector.messageId}`);
  }
  if (selector.position != null) {
    const matched = context.messages.find(message => message.position === selector.position);
    if (matched) {
      return matched;
    }
    throw new Error(`无法定位 position=${selector.position} 的消息`);
  }
  const candidates = filterMessagesBySelector(context.messages, selector, context);
  const matched = pickByOrdinal(candidates, selector.ordinal);
  if (matched) {
    return matched;
  }
  const fallback = selector.textIncludes || selector.roleName
    ? null
    : getDefaultTargetMessage(context);
  if (fallback) {
    return fallback;
  }
  throw new Error("无法根据语义选择器定位消息");
}

function resolveSpeakerByName(speaker: string | undefined, context: GalAuthoringContext): ResolvedSpeaker {
  const normalizedSpeaker = normalizeText(speaker);
  if (!normalizedSpeaker) {
    return {};
  }
  if (normalizedSpeaker === normalizeText(context.roles.narrator.roleName) || normalizedSpeaker === "narrator") {
    return {
      roleId: context.roles.narrator.roleId,
      purpose: "narration",
    };
  }
  const role = context.roles.roomRoles.find(item =>
    normalizeText(item.roleName) === normalizedSpeaker || normalizeText(item.roleId) === normalizedSpeaker,
  );
  if (role) {
    return {
      roleId: role.roleId,
      purpose: "dialogue",
    };
  }
  return {
    customRoleName: speaker?.trim(),
    purpose: "dialogue",
  };
}

function resolveSpeakerForTarget(params: {
  speaker?: string;
  roleId?: string;
  customRoleName?: string;
  target?: GalMessageView;
  context: GalAuthoringContext;
}): ResolvedSpeaker {
  if (params.roleId) {
    return {
      roleId: params.roleId === "0" ? params.context.roles.narrator.roleId : params.roleId,
      ...(params.customRoleName ? { customRoleName: params.customRoleName } : {}),
    };
  }
  if (params.customRoleName) {
    return {
      roleId: params.target?.roleId,
      customRoleName: params.customRoleName,
    };
  }
  const resolved = resolveSpeakerByName(params.speaker, params.context);
  if (resolved.customRoleName && params.target?.roleId) {
    return {
      ...resolved,
      roleId: params.target.roleId,
    };
  }
  return resolved;
}

function buildMessageInput(draft: GalCopilotMessageDraft, context: GalAuthoringContext): GalPatchMessageInput {
  const speaker = resolveSpeakerForTarget({
    speaker: draft.speaker,
    roleId: draft.roleId,
    customRoleName: draft.customRoleName,
    context,
  });
  const purpose = draft.purpose ?? speaker.purpose ?? (speaker.roleId === context.roles.narrator.roleId ? "narration" : "dialogue");
  return {
    messageType: draft.messageType ?? 1,
    purpose,
    ...(speaker.roleId ? { roleId: speaker.roleId } : {}),
    ...(speaker.customRoleName ? { customRoleName: speaker.customRoleName } : {}),
    ...(draft.avatarId ? { avatarId: draft.avatarId } : {}),
    content: draft.content ?? "",
    annotations: draft.annotations ?? [],
    ...(draft.webgal ? { webgal: draft.webgal } : {}),
    ...(draft.extra ? { extra: draft.extra } : {}),
  };
}

function findAvatarIdForIntent(intent: Extract<GalCopilotIntent, { action: "change_avatar" }>, target: GalMessageView, context: GalAuthoringContext) {
  if (intent.avatarId) {
    return intent.avatarId;
  }
  const avatarLabel = normalizeText(intent.avatarLabel);
  if (!avatarLabel || !target.roleId) {
    return undefined;
  }
  const role = context.roles.roomRoles.find(item => item.roleId === target.roleId);
  const avatar = role?.avatarVariants.find((item) => {
    const titleMatched = Object.values(item.avatarTitle ?? {}).some(title => normalizeText(title) === avatarLabel);
    return titleMatched || normalizeText(item.category) === avatarLabel || normalizeText(item.avatarId) === avatarLabel;
  });
  return avatar?.avatarId;
}

function mergeAnnotations(current: string[], intent: Extract<GalCopilotIntent, { action: "add_annotations" | "remove_annotations" | "set_annotations" }>) {
  if (intent.action === "set_annotations") {
    return [...intent.annotations];
  }
  const next = new Set(current);
  if (intent.action === "add_annotations") {
    intent.annotations.forEach(annotation => next.add(annotation));
  }
  else {
    intent.annotations.forEach(annotation => next.delete(annotation));
  }
  return Array.from(next);
}

function compileIntent(intent: GalCopilotIntent, context: GalAuthoringContext): GalStoryPatchOperation {
  switch (intent.action) {
    case "rewrite": {
      const target = resolveGalMessageSelector(intent.target, context);
      return {
        op: "replace_content",
        messageId: target.messageId,
        content: intent.content,
      };
    }
    case "insert_after": {
      const anchor = resolveGalMessageSelector(intent.anchor, context);
      return {
        op: "insert_after",
        afterMessageId: anchor.messageId,
        message: buildMessageInput(intent.message, context),
      };
    }
    case "insert_before": {
      const anchor = resolveGalMessageSelector(intent.anchor, context);
      return {
        op: "insert_before",
        beforeMessageId: anchor.messageId,
        message: buildMessageInput(intent.message, context),
      };
    }
    case "delete": {
      const target = resolveGalMessageSelector(intent.target, context);
      return {
        op: "delete",
        messageId: target.messageId,
      };
    }
    case "change_speaker": {
      const target = resolveGalMessageSelector(intent.target, context);
      const speaker = resolveSpeakerForTarget({
        speaker: intent.speaker,
        roleId: intent.roleId,
        customRoleName: intent.customRoleName,
        target,
        context,
      });
      return {
        op: "update_role",
        messageId: target.messageId,
        roleId: speaker.roleId ?? target.roleId ?? context.roles.narrator.roleId,
        ...(speaker.customRoleName ? { customRoleName: speaker.customRoleName } : {}),
      };
    }
    case "change_avatar": {
      const target = resolveGalMessageSelector(intent.target, context);
      return {
        op: "update_avatar",
        messageId: target.messageId,
        avatarId: findAvatarIdForIntent(intent, target, context),
      };
    }
    case "set_annotations":
    case "add_annotations":
    case "remove_annotations": {
      const target = resolveGalMessageSelector(intent.target, context);
      return {
        op: "update_annotations",
        messageId: target.messageId,
        annotations: mergeAnnotations(target.annotations, intent),
      };
    }
    case "move_after": {
      const target = resolveGalMessageSelector(intent.target, context);
      const anchor = resolveGalMessageSelector(intent.anchor, context);
      return {
        op: "move",
        messageId: target.messageId,
        afterMessageId: anchor.messageId,
      };
    }
    case "move_before": {
      const target = resolveGalMessageSelector(intent.target, context);
      const anchor = resolveGalMessageSelector(intent.anchor, context);
      return {
        op: "move",
        messageId: target.messageId,
        beforeMessageId: anchor.messageId,
      };
    }
  }
}

export function compileGalCopilotIntentResponseToPatch(
  intentResponse: GalCopilotIntentResponse,
  context: GalAuthoringContext,
): GalStoryPatch {
  return galStoryPatchSchema.parse({
    operations: intentResponse.intents.map(intent => compileIntent(intent, context)),
  });
}

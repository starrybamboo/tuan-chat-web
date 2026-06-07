import type { ImportedDiceTurn } from "@/components/chat/utils/importChatText";
import type { FigurePosition } from "@/types/voiceRenderTypes";

import { buildImportedCqMediaMessageFields } from "@/components/chat/utils/cqMediaImport";
import { IMPORT_SPECIAL_ROLE_ID } from "@/components/chat/utils/importChatText";
import { buildOutOfCharacterSpeechContent } from "@/components/chat/utils/outOfCharacterSpeech";
import { setFigurePositionAnnotation } from "@/types/messageAnnotations";

import type { ChatMessageRequest, RoleAvatar } from "../../../../api";

import { MessageType } from "../../../../api/wsModels";

export type ImportChatRequestMessage = {
  roleId: number;
  content: string;
  speakerName?: string;
  figurePosition?: Exclude<FigurePosition, undefined>;
  diceTurn?: ImportedDiceTurn;
};

export type ImportChatRequestBuildContext = {
  roomId: number;
  isSpectator?: boolean;
  resolveAvatarId: (roleId: number) => number;
  draftCustomRoleNameMap?: Record<string | number, string | undefined>;
  dicerRoleId?: number | null;
  dicerAvatarId?: number | null;
  dicerAvatars?: Array<Pick<RoleAvatar, "avatarId" | "avatarTitle">>;
};

function positiveAvatarId(avatarId: number | null | undefined) {
  return typeof avatarId === "number" && avatarId > 0 ? avatarId : undefined;
}

function fallbackAvatarId(avatarId: number | null | undefined) {
  return positiveAvatarId(avatarId) ?? -1;
}

function getAvatarTitleLabels(avatar: Pick<RoleAvatar, "avatarTitle">) {
  return Object.values(avatar.avatarTitle ?? {})
    .map(label => String(label ?? "").trim())
    .filter(Boolean);
}

function findAvatarByLabel(
  avatars: Array<Pick<RoleAvatar, "avatarId" | "avatarTitle">>,
  label: string | null,
) {
  const normalizedLabel = label?.trim();
  if (!normalizedLabel) {
    return null;
  }
  return avatars.find(avatar => getAvatarTitleLabels(avatar).includes(normalizedLabel)) ?? null;
}

function inferDicerAvatarLabel(content: string) {
  const tagMatches = String(content ?? "").match(/#([^#]+)#/g);
  if (tagMatches?.length) {
    return tagMatches[tagMatches.length - 1]?.replace(/#/g, "").trim() || null;
  }

  // 导入记录没有运行时文案 key，只能从骰娘回复文本里稳定推断常见检定结果。
  const resultLabels = ["大成功", "大失败", "极难成功", "困难成功", "成功", "失败"];
  return resultLabels.find(label => content.includes(label)) ?? null;
}

function selectDicerAvatarId(
  content: string,
  avatars: Array<Pick<RoleAvatar, "avatarId" | "avatarTitle">>,
  fallback: number | null | undefined,
) {
  const matched = findAvatarByLabel(avatars, inferDicerAvatarLabel(content));
  if (matched?.avatarId && matched.avatarId > 0) {
    return matched.avatarId;
  }

  const defaultAvatar = findAvatarByLabel(avatars, "默认");
  return fallbackAvatarId(defaultAvatar?.avatarId ?? fallback ?? avatars[0]?.avatarId);
}

function isImportedDicerResultMessage(content: string) {
  const normalized = String(content ?? "").trim();
  return /掷出了|检定结果为|^\d*d\d+\s*=|[\s(,[，：:]\d*d\d+\s*=/i.test(normalized);
}

export function buildImportedChatMessageRequests(
  messages: ImportChatRequestMessage[],
  context: ImportChatRequestBuildContext,
): ChatMessageRequest[] {
  const {
    roomId,
    isSpectator = false,
    resolveAvatarId,
    draftCustomRoleNameMap = {},
    dicerRoleId,
    dicerAvatarId,
    dicerAvatars = [],
  } = context;

  return messages.map((message) => {
    let roleId = message.roleId;
    let avatarId = -1;
    let content = message.content;
    let messageType = MessageType.TEXT;
    let extra: ChatMessageRequest["extra"] = {};

    if (isSpectator) {
      roleId = -1;
      content = buildOutOfCharacterSpeechContent(message.content) ?? "";
    }
    else if (roleId === IMPORT_SPECIAL_ROLE_ID.DICER) {
      roleId = typeof dicerRoleId === "number" ? dicerRoleId : -1;
      avatarId = selectDicerAvatarId(message.content, dicerAvatars, dicerAvatarId);
      if (isImportedDicerResultMessage(message.content)) {
        messageType = MessageType.DICE;
        extra = { diceResult: { result: message.content } };
      }
    }
    else {
      avatarId = roleId > 0 ? fallbackAvatarId(resolveAvatarId(roleId)) : -1;
    }

    if (!isSpectator && message.diceTurn && messageType === MessageType.TEXT) {
      const replyAvatarId = positiveAvatarId(
        selectDicerAvatarId(message.diceTurn.replyContent, dicerAvatars, dicerAvatarId),
      );
      const dicerReply = {
        content: message.diceTurn.replyContent,
        ...(typeof dicerRoleId === "number" ? { roleId: dicerRoleId } : {}),
        customRoleName: message.diceTurn.dicerSpeakerName,
        ...(replyAvatarId != null ? { avatarId: replyAvatarId } : {}),
      };

      messageType = MessageType.DICE;
      extra = {
        diceTurn: {
          command: message.content,
          replies: [dicerReply],
        },
      };
    }

    const cqMediaFields = !isSpectator && messageType === MessageType.TEXT
      ? buildImportedCqMediaMessageFields(message.content)
      : null;
    if (cqMediaFields) {
      content = cqMediaFields.content;
      messageType = cqMediaFields.messageType;
      extra = cqMediaFields.extra;
    }

    const request: ChatMessageRequest = {
      roomId,
      roleId,
      avatarId,
      content,
      messageType,
      extra,
    };

    if (!isSpectator) {
      const importedSpeakerName = (message.speakerName ?? "").trim();
      if (importedSpeakerName && roleId > 0) {
        request.customRoleName = importedSpeakerName;
      }
      else {
        const draftCustomRoleName = draftCustomRoleNameMap[roleId]?.trim();
        if (draftCustomRoleName) {
          request.customRoleName = draftCustomRoleName;
        }
      }
    }

    if (!isSpectator && messageType === MessageType.TEXT && roleId > 0 && message.figurePosition) {
      request.annotations = setFigurePositionAnnotation(request.annotations, message.figurePosition);
    }

    return request;
  });
}

import { useCallback, useRef } from "react";
import { toast } from "react-hot-toast";

import type { RoomUiStoreApi } from "@/components/chat/stores/roomUiStore";

import { triggerAudioAutoPlay } from "@/components/chat/infra/audioMessage/audioMessageAutoPlayRuntime";
import { resolveAudioAutoPlayPurposeFromAnnotationTransition } from "@/components/chat/infra/audioMessage/audioMessageAutoPlayPolicy";
import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { buildMessageDraftsFromComposerSnapshot } from "@/components/chat/utils/messageDraftBuilder";
import { buildOutOfCharacterSpeechContent } from "@/components/chat/utils/outOfCharacterSpeech";
import { isRoomJumpCommandText, parseRoomJumpCommand } from "@/components/chat/utils/roomJump";
import { isCommand } from "@/components/common/dicer/cmdPre";
import { normalizeAnnotations } from "@/types/messageAnnotations";
import { buildChatMessageRequestFromDraft } from "@/types/messageDraft";
import { UploadUtils } from "@/utils/UploadUtils";

import type { ChatMessageRequest, ChatMessageResponse, UserRole } from "../../../../api";

import { MessageType } from "../../../../api/wsModels";

type CommandExecutor = (payload: {
  command: string;
  mentionedRoles?: UserRole[];
  originMessage?: string;
  threadId?: number;
  replyMessageId?: number;
}) => void;

type UseChatMessageSubmitParams = {
  roomId: number;
  spaceId: number;
  isSpaceOwner: boolean;
  curRoleId: number;
  notMember: boolean;
  noRole: boolean;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  sendMessageWithInsert: (message: ChatMessageRequest) => Promise<ChatMessageResponse["message"] | null>;
  sendMessageBatch: (messages: ChatMessageRequest[]) => Promise<ChatMessageResponse["message"][]>;
  ensureRuntimeAvatarIdForRole: (roleId: number) => Promise<number>;
  commandExecutor: CommandExecutor;
  containsCommandRequestAllToken: (text: string) => boolean;
  stripCommandRequestAllToken: (text: string) => string;
  extractFirstCommandText: (text: string) => string | null;
  setInputText: (text: string) => void;
  roomUiStoreApi: RoomUiStoreApi;
};

type UseChatMessageSubmitResult = {
  handleMessageSubmit: () => Promise<void>;
};

function isSameMentionedRolesSnapshot(a: UserRole[], b: UserRole[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.roleId !== b[i]?.roleId) {
      return false;
    }
  }
  return true;
}

function shouldResetSubmittedInputSnapshot(
  current: {
    plainText: string;
    textWithoutMentions: string;
    mentionedRoles: UserRole[];
  },
  submitted: {
    plainText: string;
    textWithoutMentions: string;
    mentionedRoles: UserRole[];
  },
): boolean {
  return current.plainText === submitted.plainText
    && current.textWithoutMentions === submitted.textWithoutMentions
    && isSameMentionedRolesSnapshot(current.mentionedRoles, submitted.mentionedRoles);
}

export default function useChatMessageSubmit({
  roomId,
  spaceId,
  isSpaceOwner,
  curRoleId,
  notMember,
  noRole,
  isSubmitting,
  setIsSubmitting,
  sendMessageWithInsert,
  sendMessageBatch,
  ensureRuntimeAvatarIdForRole,
  commandExecutor,
  containsCommandRequestAllToken,
  stripCommandRequestAllToken,
  extractFirstCommandText,
  setInputText,
  roomUiStoreApi,
}: UseChatMessageSubmitParams): UseChatMessageSubmitResult {
  const uploadUtilsRef = useRef(new UploadUtils());

  const handleMessageSubmit = useCallback(async () => {
    const {
      plainText: inputText,
      textWithoutMentions: inputTextWithoutMentions,
      mentionedRoles: mentionedRolesInInput,
    } = useChatInputUiStore.getState();

    const {
      imgFiles,
      emojiUrls,
      emojiMetaByUrl,
      fileAttachments,
      audioFile,
      annotations: composerAnnotations,
      tempAnnotations,
      setImgFiles,
      setEmojiUrls,
      clearEmojiMeta,
      setFileAttachments,
      setAudioFile,
      setTempAnnotations,
    } = useChatComposerStore.getState();

    const trimmedInputText = inputText.trim();
    const trimmedWithoutMentions = inputTextWithoutMentions.trim();
    const mergedComposerAnnotations = normalizeAnnotations([...composerAnnotations, ...tempAnnotations]);

    const isKP = isSpaceOwner;
    const isNarrator = noRole;
    const isSpectator = notMember;
    const senderRoleId = isSpectator ? -1 : curRoleId;
    const spectatorTextContent = isSpectator
      ? buildOutOfCharacterSpeechContent(trimmedInputText)
      : null;
    const hasPendingAttachmentPayload = (
      imgFiles.length > 0
      || emojiUrls.length > 0
      || fileAttachments.length > 0
      || Boolean(audioFile)
    );

    const disableSendMessage = isSubmitting
      || (isNarrator && !isKP && !isSpectator);

    if (disableSendMessage) {
      if (isNarrator && !isKP)
        toast.error("旁白仅主持可用，请先选择/拉入你的角色");
      else if (isSubmitting)
        toast.error("正在提交中，请稍后");
      return;
    }
    if (inputText.length > 1024) {
      toast.error("消息长度不能超过 1024 字（含富文本标记）");
      return;
    }
    if (isSpectator && !spectatorTextContent && !hasPendingAttachmentPayload) {
      toast.error("观战发言不能为空");
      return;
    }
    if (spectatorTextContent && spectatorTextContent.length > 1024) {
      toast.error("观战发言长度不能超过 1022 字");
      return;
    }

    setIsSubmitting(true);
    try {
      const resolvedAvatarId = senderRoleId > 0
        ? await ensureRuntimeAvatarIdForRole(senderRoleId)
        : -1;
      const {
        replyMessage,
        threadRootMessageId: activeThreadRootId,
        composerTarget,
        insertAfterMessageId,
      } = roomUiStoreApi.getState();
      const finalReplyId = replyMessage?.messageId || undefined;
      const activeThreadId = composerTarget === "thread" && activeThreadRootId
        ? activeThreadRootId
        : undefined;
      const draftCustomRoleName = (() => {
        if (!(senderRoleId > 0)) {
          return undefined;
        }
        const rawCustomRoleName = useRoomPreferenceStore.getState().draftCustomRoleNameMap[senderRoleId];
        if (typeof rawCustomRoleName !== "string") {
          return undefined;
        }
        const trimmedCustomRoleName = rawCustomRoleName.trim();
        return trimmedCustomRoleName || undefined;
      })();

      let regularInputText = isSpectator
        ? (spectatorTextContent ?? "")
        : trimmedInputText;
      const isRoomJumpCommand = !isSpectator && isRoomJumpCommandText(trimmedWithoutMentions);
      const roomJumpCommandPayload = !isSpectator
        ? parseRoomJumpCommand(trimmedWithoutMentions)
        : null;
      const roomJumpTargetSpaceId = roomJumpCommandPayload?.spaceId ?? (spaceId > 0 ? spaceId : undefined);

      if (isRoomJumpCommand && !roomJumpCommandPayload) {
        toast.error("群聊跳转格式错误：/roomjump <roomId> [标题] 或 /roomjump <spaceId> <roomId> [标题]");
        return;
      }
      if (roomJumpCommandPayload && !roomJumpTargetSpaceId) {
        toast.error("当前不在空间群聊，请使用 /roomjump <spaceId> <roomId> [标题]");
        return;
      }

      const isCommandRequestByAll = !isSpectator && isKP && containsCommandRequestAllToken(inputText);
      const extractedCommandForRequest = isCommandRequestByAll ? extractFirstCommandText(trimmedWithoutMentions) : null;
      const requestCommand = extractedCommandForRequest ? stripCommandRequestAllToken(extractedCommandForRequest) : null;
      const shouldSendCommandRequest = Boolean(requestCommand && isCommand(requestCommand));
      let hasConsumedFirstMessage = false;

      if (shouldSendCommandRequest) {
        const requestMsg: ChatMessageRequest = {
          content: requestCommand!,
          messageType: MessageType.COMMAND_REQUEST,
          roomId,
          roleId: senderRoleId,
          avatarId: resolvedAvatarId,
          extra: {
            commandRequest: {
              command: requestCommand!,
              allowAll: true,
            },
          },
        };
        if (typeof activeThreadId === "number") {
          requestMsg.threadId = activeThreadId;
        }
        if (typeof finalReplyId === "number") {
          requestMsg.replayMessageId = finalReplyId;
        }
        if (!isSpectator && mergedComposerAnnotations.length > 0) {
          requestMsg.annotations = mergedComposerAnnotations;
        }
        if (draftCustomRoleName) {
          requestMsg.customRoleName = draftCustomRoleName;
        }

        const createdRequestMessage = await sendMessageWithInsert(requestMsg);
        if (!createdRequestMessage) {
          return;
        }
        hasConsumedFirstMessage = true;
        regularInputText = "";
      }
      else if (roomJumpCommandPayload) {
        const roomJumpMsg: ChatMessageRequest = {
          roomId,
          roleId: senderRoleId,
          avatarId: resolvedAvatarId,
          content: "",
          messageType: MessageType.ROOM_JUMP,
          extra: {
            roomJump: {
              spaceId: roomJumpTargetSpaceId,
              roomId: roomJumpCommandPayload.roomId,
              ...(roomJumpCommandPayload.label ? { label: roomJumpCommandPayload.label } : {}),
            },
          },
        };
        if (typeof activeThreadId === "number") {
          roomJumpMsg.threadId = activeThreadId;
        }
        if (typeof finalReplyId === "number") {
          roomJumpMsg.replayMessageId = finalReplyId;
        }
        if (!isSpectator && mergedComposerAnnotations.length > 0) {
          roomJumpMsg.annotations = mergedComposerAnnotations;
        }
        if (draftCustomRoleName) {
          roomJumpMsg.customRoleName = draftCustomRoleName;
        }

        const createdRoomJumpMessage = await sendMessageWithInsert(roomJumpMsg);
        if (!createdRoomJumpMessage) {
          return;
        }
        hasConsumedFirstMessage = true;
        regularInputText = "";
      }
      else if (!isSpectator && regularInputText && isCommand(regularInputText)) {
        commandExecutor({
          command: inputTextWithoutMentions,
          mentionedRoles: mentionedRolesInInput,
          originMessage: inputText,
          threadId: activeThreadId,
          replyMessageId: finalReplyId,
        });
        hasConsumedFirstMessage = true;
        regularInputText = "";
      }

      const regularDrafts = await buildMessageDraftsFromComposerSnapshot({
        baseMessage: {
          roleId: senderRoleId,
          avatarId: resolvedAvatarId,
          customRoleName: draftCustomRoleName,
        },
        inputText: regularInputText,
        imgFiles,
        emojiUrls,
        emojiMetaByUrl,
        fileAttachments,
        audioFile,
        composerAnnotations,
        tempAnnotations,
        uploadUtils: uploadUtilsRef.current,
        allowEmptyTextMessage: !hasConsumedFirstMessage,
      });

      const isPureTextSend = !hasPendingAttachmentPayload && regularDrafts.length === 1 && regularDrafts[0]?.messageType === MessageType.TEXT;
      if (isPureTextSend && !isSpectator) {
        const textDraft = regularDrafts[0]!;
        const draftContent = textDraft.content ?? "";
        const isWebgalCommandInput = draftContent.startsWith("%");
        const normalizedContent = isWebgalCommandInput ? draftContent.slice(1).trim() : draftContent;

        if (isWebgalCommandInput && !normalizedContent) {
          toast.error("WebGAL 指令不能为空");
          return;
        }
        else {
          regularDrafts[0] = {
            ...textDraft,
            content: normalizedContent,
            messageType: isWebgalCommandInput ? MessageType.WEBGAL_COMMAND : MessageType.TEXT,
            extra: {},
          };
        }
      }

      const regularRequests = regularDrafts.map((draft, index) => buildChatMessageRequestFromDraft(draft, {
        roomId,
        threadId: activeThreadId,
        replayMessageId: (hasConsumedFirstMessage || index > 0) ? undefined : finalReplyId,
        roleId: senderRoleId,
        avatarId: resolvedAvatarId,
        customRoleName: draftCustomRoleName,
      }));

      const createdRegularMessages: Array<ChatMessageResponse["message"] | null> = [];
      if (regularRequests.length > 1 && !insertAfterMessageId) {
        const createdBatchMessages = await sendMessageBatch(regularRequests);
        if (createdBatchMessages.length !== regularRequests.length) {
          return;
        }
        createdRegularMessages.push(...createdBatchMessages);
      }
      else {
        for (const request of regularRequests) {
          const createdMessage = await sendMessageWithInsert(request);
          if (!createdMessage) {
            return;
          }
          createdRegularMessages.push(createdMessage);
        }
      }

      if (regularRequests.length > 0) {
        hasConsumedFirstMessage = true;
      }

      createdRegularMessages.forEach((createdMessage, index) => {
        const draft = regularDrafts[index];
        const request = regularRequests[index];
        if ((draft?.messageType ?? MessageType.TEXT) !== MessageType.SOUND || !createdMessage || typeof createdMessage.messageId !== "number") {
          return;
        }

        const autoPlayPurpose = resolveAudioAutoPlayPurposeFromAnnotationTransition(undefined, request);
        if (!autoPlayPurpose) {
          return;
        }

        const requestExtra = request.extra as { soundMessage?: { url?: string } } | undefined;
        const createdExtra = createdMessage.extra as { soundMessage?: { url?: string } } | undefined;
        const requestUrl = typeof requestExtra?.soundMessage?.url === "string" ? requestExtra.soundMessage.url.trim() : "";
        const createdUrl = typeof createdExtra?.soundMessage?.url === "string" ? createdExtra.soundMessage.url.trim() : "";
        triggerAudioAutoPlay({
          source: "localSend",
          roomId,
          messageId: createdMessage.messageId,
          purpose: autoPlayPurpose,
          url: requestUrl || createdUrl,
        });
      });

      // 仅在当前草稿仍然是本次提交内容时才清空，避免覆盖用户在提交期间的新输入。
      const latestInputSnapshot = useChatInputUiStore.getState();
      if (shouldResetSubmittedInputSnapshot(latestInputSnapshot, {
        plainText: inputText,
        textWithoutMentions: inputTextWithoutMentions,
        mentionedRoles: mentionedRolesInInput,
      })) {
        setInputText("");
      }
      const latestComposerState = useChatComposerStore.getState();
      if (latestComposerState.imgFiles === imgFiles) {
        setImgFiles([]);
      }
      if (latestComposerState.emojiUrls === emojiUrls) {
        setEmojiUrls([]);
      }
      if (latestComposerState.emojiMetaByUrl === emojiMetaByUrl) {
        clearEmojiMeta();
      }
      if (latestComposerState.fileAttachments === fileAttachments) {
        setFileAttachments([]);
      }
      if (latestComposerState.audioFile === audioFile) {
        setAudioFile(null);
      }
      if (latestComposerState.tempAnnotations === tempAnnotations) {
        setTempAnnotations([]);
      }

      const latestRoomUiState = roomUiStoreApi.getState();
      if (latestRoomUiState.replyMessage?.messageId === replyMessage?.messageId) {
        latestRoomUiState.setReplyMessage(undefined);
      }
      if (latestRoomUiState.insertAfterMessageId === insertAfterMessageId) {
        latestRoomUiState.setInsertAfterMessageId(undefined);
      }
    }
    catch (error) {
      console.error("发送消息失败", error);
      const message = error instanceof Error ? error.message : "发送消息失败";
      toast.error(message, { duration: 3000 });
    }
    finally {
      setIsSubmitting(false);
    }
  }, [
    commandExecutor,
    containsCommandRequestAllToken,
    curRoleId,
    ensureRuntimeAvatarIdForRole,
    extractFirstCommandText,
    isSpaceOwner,
    isSubmitting,
    noRole,
    notMember,
    roomId,
    roomUiStoreApi,
    sendMessageBatch,
    sendMessageWithInsert,
    setInputText,
    setIsSubmitting,
    spaceId,
    stripCommandRequestAllToken,
  ]);

  return { handleMessageSubmit };
}

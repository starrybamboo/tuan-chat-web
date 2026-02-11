import { useCallback, useRef } from "react";
import { toast } from "react-hot-toast";

import type { SpaceWebgalVarsRecord } from "@/types/webgalVar";

import { useChatComposerStore } from "@/components/chat/stores/chatComposerStore";
import { useChatInputUiStore } from "@/components/chat/stores/chatInputUiStore";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomUiStore } from "@/components/chat/stores/roomUiStore";
import { isCommand } from "@/components/common/dicer/cmdPre";
import { formatAnkoDiceMessage } from "@/components/common/dicer/diceTable";
import { ANNOTATION_IDS, getFigurePositionFromAnnotations, hasAnnotation, hasClearFigureAnnotation, normalizeAnnotations, setAnnotation, setFigurePositionAnnotation } from "@/types/messageAnnotations";
import { parseWebgalVarCommand } from "@/types/webgalVar";
import { isAudioUploadDebugEnabled } from "@/utils/audioDebugFlags";
import { getImageSize } from "@/utils/getImgSize";
import { UploadUtils } from "@/utils/UploadUtils";

import type { ChatMessageRequest, UserRole } from "../../../../api";

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
  spaceExtra?: string | null;
  isSpaceOwner: boolean;
  curRoleId: number;
  notMember: boolean;
  noRole: boolean;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  sendMessageWithInsert: (message: ChatMessageRequest) => Promise<void>;
  ensureRuntimeAvatarIdForRole: (roleId: number) => Promise<number>;
  commandExecutor: CommandExecutor;
  containsCommandRequestAllToken: (text: string) => boolean;
  stripCommandRequestAllToken: (text: string) => string;
  extractFirstCommandText: (text: string) => string | null;
  setInputText: (text: string) => void;
  setSpaceExtra: (payload: { spaceId: number; key: string; value: string }) => Promise<unknown>;
};

type UseChatMessageSubmitResult = {
  handleMessageSubmit: () => Promise<void>;
};

export default function useChatMessageSubmit({
  roomId,
  spaceId,
  spaceExtra,
  isSpaceOwner,
  curRoleId,
  notMember,
  noRole,
  isSubmitting,
  setIsSubmitting,
  sendMessageWithInsert,
  ensureRuntimeAvatarIdForRole,
  commandExecutor,
  containsCommandRequestAllToken,
  stripCommandRequestAllToken,
  extractFirstCommandText,
  setInputText,
  setSpaceExtra,
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
      audioFile,
      annotations: composerAnnotations,
      tempAnnotations,
      setImgFiles,
      setEmojiUrls,
      setAudioFile,
      setTempAnnotations,
    } = useChatComposerStore.getState();

    const trimmedInputText = inputText.trim();
    const trimmedWithoutMentions = inputTextWithoutMentions.trim();
    const isBlankInput = trimmedInputText.length === 0;

    const {
      webgalLinkMode,
      dialogNotend,
      dialogConcat,
      defaultFigurePositionMap,
    } = useRoomPreferenceStore.getState();

    const currentDefaultFigurePosition = defaultFigurePositionMap[curRoleId];
    const normalizedComposerAnnotations = normalizeAnnotations(composerAnnotations);
    const normalizedTempAnnotations = normalizeAnnotations(tempAnnotations);
    const tempFigurePosition = getFigurePositionFromAnnotations(normalizedTempAnnotations);
    const roleFigurePosition = getFigurePositionFromAnnotations(normalizedComposerAnnotations);
    let mergedComposerAnnotations = normalizeAnnotations([...normalizedComposerAnnotations, ...normalizedTempAnnotations]);
    if (tempFigurePosition) {
      mergedComposerAnnotations = setFigurePositionAnnotation(mergedComposerAnnotations, tempFigurePosition);
    }
    else if (roleFigurePosition) {
      mergedComposerAnnotations = setFigurePositionAnnotation(mergedComposerAnnotations, roleFigurePosition);
    }
    const useBackgroundAnnotation = hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.BACKGROUND);
    const useCgAnnotation = hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.CG);
    const composerAudioPurpose = hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.BGM)
      ? "bgm"
      : hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.SE)
        ? "se"
        : undefined;

    const isKP = isSpaceOwner;
    const isNarrator = noRole;

    const disableSendMessage = (notMember || isSubmitting)
      || (isNarrator && !isKP);

    if (disableSendMessage) {
      if (notMember)
        toast.error("您是观战，不能发送消息");
      else if (isNarrator && !isKP)
        toast.error("旁白仅KP可用，请先选择/拉入你的角色");
      else if (isSubmitting)
        toast.error("正在提交中，请稍后");
      return;
    }
    if (inputText.length > 1024) {
      toast.error("消息长度不能超过 1024 字");
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadedImages: any[] = [];
      const resolvedAvatarId = await ensureRuntimeAvatarIdForRole(curRoleId);

      for (let i = 0; i < imgFiles.length; i++) {
        const imgDownLoadUrl = await uploadUtilsRef.current.uploadImg(imgFiles[i]);
        const { width, height, size } = await getImageSize(imgFiles[i]);
        uploadedImages.push({ url: imgDownLoadUrl, width, height, size, fileName: imgFiles[i].name });
      }
      setImgFiles([]);

      for (let i = 0; i < emojiUrls.length; i++) {
        const { width, height, size } = await getImageSize(emojiUrls[i]);
        uploadedImages.push({ url: emojiUrls[i], width, height, size, fileName: "emoji" });
      }
      setEmojiUrls([]);

      let soundMessageData: any = null;
      if (audioFile) {
        const maxAudioDurationSec = 0;
        const objectUrl = URL.createObjectURL(audioFile);
        const debugEnabled = isAudioUploadDebugEnabled();
        const debugPrefix = "[tc-audio-upload]";
        const audioToastId = toast.loading("正在上传音频...");

        if (debugEnabled) {
          console.warn(`${debugPrefix} roomWindow send audio`, {
            name: audioFile.name,
            type: audioFile.type,
            size: audioFile.size,
            lastModified: audioFile.lastModified,
            truncateToSec: maxAudioDurationSec > 0 ? maxAudioDurationSec : null,
          });
        }

        try {
          const durationSec = await (async () => {
            try {
              const audio = new Audio();
              audio.preload = "metadata";
              audio.src = objectUrl;
              audio.load();

              return await new Promise<number | undefined>((resolve) => {
                const timeout = window.setTimeout(() => resolve(undefined), 5000);
                const cleanup = () => {
                  window.clearTimeout(timeout);
                  audio.onloadedmetadata = null;
                  audio.onerror = null;
                  audio.onabort = null;
                };

                audio.onloadedmetadata = () => {
                  const d = audio.duration;
                  cleanup();
                  resolve(Number.isFinite(d) && d > 0 ? d : undefined);
                };
                audio.onerror = () => {
                  cleanup();
                  resolve(undefined);
                };
                audio.onabort = () => {
                  cleanup();
                  resolve(undefined);
                };
              });
            }
            finally {
              URL.revokeObjectURL(objectUrl);
            }
          })();

          const second = (typeof durationSec === "number" && Number.isFinite(durationSec))
            ? Math.max(1, Math.round(durationSec))
            : 1;

          if (debugEnabled)
            console.warn(`${debugPrefix} duration`, { durationSec, second });

          const url = await uploadUtilsRef.current.uploadAudio(audioFile, 1, maxAudioDurationSec);

          soundMessageData = {
            url,
            second,
            fileName: audioFile.name,
            size: audioFile.size,
          };
          setAudioFile(null);
        }
        catch (error) {
          console.error(`${debugPrefix} uploadAudio failed`, error);
          throw error;
        }
        finally {
          toast.dismiss(audioToastId);
        }
      }

      const finalReplyId = useRoomUiStore.getState().replyMessage?.messageId || undefined;
      let isFirstMessage = true;

      const getCommonFields = () => {
        const fields: Partial<ChatMessageRequest> = {
          roomId,
          roleId: curRoleId,
          avatarId: resolvedAvatarId,
        };

        const { threadRootMessageId: activeThreadRootId, composerTarget } = useRoomUiStore.getState();
        if (composerTarget === "thread" && activeThreadRootId) {
          fields.threadId = activeThreadRootId;
        }

        if (curRoleId > 0) {
          const draftCustomRoleName = useRoomPreferenceStore.getState().draftCustomRoleNameMap[curRoleId];
          if (draftCustomRoleName?.trim()) {
            fields.customRoleName = draftCustomRoleName.trim();
          }
        }

        if (isFirstMessage) {
          fields.replayMessageId = finalReplyId;
          let nextAnnotations = mergedComposerAnnotations;
          if (webgalLinkMode) {
            if (!hasClearFigureAnnotation(nextAnnotations) && !getFigurePositionFromAnnotations(nextAnnotations)) {
              nextAnnotations = setFigurePositionAnnotation(nextAnnotations, currentDefaultFigurePosition);
            }
            if (dialogNotend) {
              nextAnnotations = setAnnotation(nextAnnotations, ANNOTATION_IDS.DIALOG_NOTEND, true);
            }
            if (dialogConcat) {
              nextAnnotations = setAnnotation(nextAnnotations, ANNOTATION_IDS.DIALOG_CONCAT, true);
            }
          }
          if (nextAnnotations.length > 0) {
            fields.annotations = nextAnnotations;
          }
          isFirstMessage = false;
        }
        return fields;
      };

      let textContent = trimmedInputText;
      const isWebgalVarCommandPrefix = /^\/var\b/i.test(trimmedWithoutMentions);
      const webgalVarPayload = parseWebgalVarCommand(trimmedWithoutMentions);

      if (isWebgalVarCommandPrefix && !webgalVarPayload) {
        toast.error("WebGAL 变量指令格式错误，请使用 /var set a=1");
        return;
      }

      const isCommandRequestByAll = isKP && containsCommandRequestAllToken(inputText);
      const extractedCommandForRequest = isCommandRequestByAll ? extractFirstCommandText(trimmedWithoutMentions) : null;
      const requestCommand = extractedCommandForRequest ? stripCommandRequestAllToken(extractedCommandForRequest) : null;
      const shouldSendCommandRequest = Boolean(requestCommand && isCommand(requestCommand));

      if (shouldSendCommandRequest) {
        const requestMsg: ChatMessageRequest = {
          ...getCommonFields() as any,
          content: requestCommand,
          messageType: MessageType.COMMAND_REQUEST,
          extra: {
            commandRequest: {
              command: requestCommand,
              allowAll: true,
            },
          },
        };

        await sendMessageWithInsert(requestMsg);

        isFirstMessage = false;
        textContent = "";
      }
      else if (webgalVarPayload) {
        const varMsg: ChatMessageRequest = {
          ...getCommonFields() as any,
          content: "",
          messageType: MessageType.WEBGAL_VAR,
          extra: {
            webgalVar: webgalVarPayload,
          },
        };

        await sendMessageWithInsert(varMsg);

        try {
          const rawExtra = spaceExtra || "{}";
          let parsedExtra: Record<string, any> = {};
          try {
            parsedExtra = JSON.parse(rawExtra) as Record<string, any>;
          }
          catch {
            parsedExtra = {};
          }

          let currentVars: SpaceWebgalVarsRecord = {};
          const stored = parsedExtra.webgalVars;
          if (typeof stored === "string") {
            try {
              currentVars = JSON.parse(stored) as SpaceWebgalVarsRecord;
            }
            catch {
              currentVars = {};
            }
          }
          else if (stored && typeof stored === "object") {
            currentVars = stored as SpaceWebgalVarsRecord;
          }

          const now = Date.now();
          const nextVars: SpaceWebgalVarsRecord = {
            ...currentVars,
            [webgalVarPayload.key]: {
              expr: webgalVarPayload.expr,
              updatedAt: now,
            },
          };

          await setSpaceExtra({
            spaceId,
            key: "webgalVars",
            value: JSON.stringify(nextVars),
          });
        }
        catch (error) {
          console.error("更新 space.extra.webgalVars 失败", error);
          toast.error("更新空间变量失败，请重试");
        }

        isFirstMessage = false;
        textContent = "";
      }
      else if (textContent && isCommand(textContent)) {
        commandExecutor({ command: inputTextWithoutMentions, mentionedRoles: mentionedRolesInInput, originMessage: inputText });
        isFirstMessage = false;
        textContent = "";
      }

      for (const img of uploadedImages) {
        const commonFields = getCommonFields() as ChatMessageRequest;
        let nextAnnotations = mergedComposerAnnotations;
        if (useBackgroundAnnotation) {
          nextAnnotations = setAnnotation(nextAnnotations, ANNOTATION_IDS.BACKGROUND, true);
        }
        if (useCgAnnotation) {
          nextAnnotations = setAnnotation(nextAnnotations, ANNOTATION_IDS.CG, true);
        }
        if (!useBackgroundAnnotation && !useCgAnnotation) {
          nextAnnotations = setAnnotation(nextAnnotations, ANNOTATION_IDS.IMAGE_SHOW, true);
        }

        const imgMsg: ChatMessageRequest = {
          ...commonFields,
          ...(Array.isArray(nextAnnotations) ? { annotations: nextAnnotations } : {}),
          content: textContent,
          messageType: MessageType.IMG,
          extra: {
            url: img.url,
            width: img.width,
            height: img.height,
            size: img.size,
            fileName: img.fileName,
            background: useBackgroundAnnotation,
          },
        };
        await sendMessageWithInsert(imgMsg);
        textContent = "";
      }

      if (soundMessageData) {
        const commonFields = getCommonFields() as ChatMessageRequest;
        let nextAnnotations = mergedComposerAnnotations;
        if (hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.BGM)) {
          nextAnnotations = setAnnotation(nextAnnotations, ANNOTATION_IDS.BGM, true);
        }
        if (hasAnnotation(mergedComposerAnnotations, ANNOTATION_IDS.SE)) {
          nextAnnotations = setAnnotation(nextAnnotations, ANNOTATION_IDS.SE, true);
        }
        const audioMsg: ChatMessageRequest = {
          ...commonFields,
          ...(Array.isArray(nextAnnotations) ? { annotations: nextAnnotations } : {}),
          content: textContent,
          messageType: MessageType.SOUND,
          extra: {
            ...soundMessageData,
            purpose: composerAudioPurpose,
          },
        };
        await sendMessageWithInsert(audioMsg);
        textContent = "";
      }

      // Allow explicit blank messages when there's no other payload to send.
      const shouldSendEmptyTextMessage = isBlankInput
        && uploadedImages.length === 0
        && !soundMessageData
        && !shouldSendCommandRequest
        && !webgalVarPayload;

      if (textContent || shouldSendEmptyTextMessage) {
        const isPureTextSend = uploadedImages.length === 0 && !soundMessageData;
        const isWebgalCommandInput = isPureTextSend && textContent.startsWith("%");
        const normalizedContent = isWebgalCommandInput ? textContent.slice(1).trim() : textContent;

        if (isWebgalCommandInput && !normalizedContent) {
          toast.error("WebGAL 指令不能为空");
        }
        else {
          let diceTableContent: string | null = null;
          if (isPureTextSend && !isWebgalCommandInput) {
            let diceTableDiceSize = 100;
            try {
              const localDice = Number(localStorage.getItem("defaultDice"));
              if (Number.isFinite(localDice) && localDice > 0) {
                diceTableDiceSize = localDice;
              }
            }
            catch {
              // ignore localStorage failures
            }
            try {
              const spaceExtraRecord = JSON.parse(spaceExtra ?? "{}");
              const dicerDataStr = spaceExtraRecord?.dicerData || "{}";
              const spaceDicerData = typeof dicerDataStr === "string" ? JSON.parse(dicerDataStr) : dicerDataStr;
              const spaceDice = Number(spaceDicerData?.defaultDice);
              if (Number.isFinite(spaceDice) && spaceDice > 0) {
                diceTableDiceSize = spaceDice;
              }
            }
            catch {
              // ignore parse errors
            }
            diceTableContent = formatAnkoDiceMessage(normalizedContent, diceTableDiceSize);
          }

          const finalContent = diceTableContent ?? normalizedContent;
          const finalMessageType = diceTableContent
            ? MessageType.DICE
            : (isWebgalCommandInput ? MessageType.WEBGAL_COMMAND : MessageType.TEXT);
          const finalExtra = diceTableContent ? { result: finalContent } : {};

          const textMsg: ChatMessageRequest = {
            ...getCommonFields() as any,
            content: finalContent,
            messageType: finalMessageType,
            extra: finalExtra,
          };
          await sendMessageWithInsert(textMsg);
        }
      }

      setInputText("");
      setTempAnnotations([]);
      useRoomUiStore.getState().setReplyMessage(undefined);
      useRoomUiStore.getState().setInsertAfterMessageId(undefined);
    }
    catch (e: any) {
      toast.error(e.message + e.stack, { duration: 3000 });
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
    sendMessageWithInsert,
    setInputText,
    setIsSubmitting,
    setSpaceExtra,
    spaceExtra,
    spaceId,
    stripCommandRequestAllToken,
  ]);

  return { handleMessageSubmit };
}

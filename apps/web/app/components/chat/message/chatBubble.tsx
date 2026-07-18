import { getClueCardRenderData, getDiceTurnRenderData } from "@tuanchat/domain/message-render-data";
import { isSystemRowMessageType } from "@tuanchat/domain/poke-message";
import { ArrowClockwiseIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { buildRoomMessageRetryRequest, isFailedRoomMessage } from "@tuanchat/query/room-message-lifecycle";
import React, { use, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";

import { RoomContext } from "@/components/chat/core/roomContext";
import { SpaceContext } from "@/components/chat/core/spaceContext";
import { normalizeInlineRoleName, useInlineTextEditor } from "@/components/chat/hooks/useInlineTextEditor";
import { getNextSyncedSoundMessagePurpose } from "@/components/chat/infra/audioMessage/audioMessagePurpose";
import { ExpressionChooser } from "@/components/chat/input/expressionChooser";
import TextStyleToolbar from "@/components/chat/input/textStyleToolbar";
import { buildAnnotationMap } from "@/components/chat/message/annotations/annotationCatalog";
import MessageAnnotationsBar from "@/components/chat/message/annotations/messageAnnotationsBar";
import { openMessageAnnotationPicker } from "@/components/chat/message/annotations/openMessageAnnotationPicker";
import { buildMessageTextDiff } from "@/components/chat/message/diff/messageTextDiff";
import MessageTextDiffPreview from "@/components/chat/message/diff/MessageTextDiffPreview";
import EditableMessageContent from "@/components/chat/message/editableMessageContent";
import MessageContentRenderer from "@/components/chat/message/messageContentRenderer";
import ForwardMessage from "@/components/chat/message/preview/forwardMessage";
import { MessagePreviewContent } from "@/components/chat/message/preview/messagePreviewContent";
import { PreviewMessage } from "@/components/chat/message/preview/previewMessage";
import RoomJumpMessage from "@/components/chat/message/roomJump/roomJumpMessage";
import StateMessageCard from "@/components/chat/state/stateMessageCard";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { useRoomRoleSelectionStore } from "@/components/chat/stores/roomRoleSelectionStore";
import { useRoomUiStore, useRoomUiStoreApi } from "@/components/chat/stores/roomUiStore";
import { canCurrentUserViewHiddenDiceReply } from "@/components/chat/utils/hiddenDiceVisibility";
import { isObserverLike } from "@/components/chat/utils/memberPermissions";
import { isOutOfCharacterSpeech } from "@/components/chat/utils/outOfCharacterSpeech";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import { extractRoomJumpPayload } from "@/components/chat/utils/roomJump";
import { appToast } from "@/components/common/appToast/appToast";
import { Button } from "@/components/common/Button";
import { DialogFrame } from "@/components/common/DialogFrame";
import { IconButton } from "@/components/common/IconButton";
import { MediaImage } from "@/components/common/mediaImage";
import PortalTooltip from "@/components/common/portalTooltip";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import { Badge } from "@/components/common/StatusPrimitives";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { UserAvatarByUser } from "@/components/common/userAccess";
import { useGlobalUserId } from "@/components/globalContextProvider";
import { CloseIcon, CommentOutline, Edit2Outline, EmojiIconWhite, InsertLineBelow, ListUnordered, MoreMenu, NarratorIcon, ScreenIcon } from "@/icons";
import {
  ANNOTATION_IDS,
  areAnnotationsEqual,
  getEffectDurationMs,
  hasAnnotation,
  normalizeAnnotations,
  toggleAnnotation,
} from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { formatTimeSmartly } from "@/utils/dateUtil";
import { getScreenSize } from "@/utils/getScreenSize";
import { avatarUrl as buildAvatarUrl, imageLowUrl as buildAvatarThumbUrl } from "@/utils/media/mediaUrl";
import { isRoleNotFoundApiError } from "@/utils/roleApiError";
import { areRealtimeRenderMessagesEquivalent } from "@/webGAL/realtimeRenderMessageDelta";

import type { ChatMessageResponse, Message, UserRole } from "../../../../api";

import { useUpdateMessageMutation } from "../../../../api/hooks/chatQueryHooks";
import { useGetRoleQuery } from "../../../../api/hooks/RoleAndAvatarHooks";
import DocCardMessage from "./docCard/docCardMessage";
import {

  CHAT_MESSAGE_ANNOTATIONS_CLASS,
  CHAT_MESSAGE_BUBBLE_BASE_CLASS,
  CHAT_MESSAGE_ROW_CLASS,
  getChatMessageHoverToolbarClass,
  getChatMessageMetaRowClass,
} from "./messageCardStyle";

type CommandRequestPayload = {
  command: string;
  allowAll?: boolean;
  allowedRoleIds?: number[];
}

type HoverToolbarActionButtonProps = {
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

type DiceTurnReplyRenderPayload = {
  avatarId?: number;
  content?: string;
  customRoleName?: string;
  hidden?: boolean;
  roleId?: number;
}

function DiceTurnReplyItem({
  canViewHiddenDiceReply,
  useChatBubbleStyle,
  reply,
  roomRoles,
}: {
  canViewHiddenDiceReply: boolean;
  useChatBubbleStyle: boolean;
  reply: DiceTurnReplyRenderPayload;
  roomRoles: Pick<UserRole, "roleId" | "roleName">[];
}) {
  const roleId = typeof reply.roleId === "number" && reply.roleId > 0 ? reply.roleId : 0;
  const roomRole = roomRoles.find(item => item.roleId === reply.roleId);
  const roleRequest = useGetRoleQuery(roleId, { enabled: !roomRole });
  const roleName = reply.customRoleName
    || roomRole?.roleName?.trim()
    || roleRequest.data?.data?.roleName?.trim()
    || (reply.roleId ? `角色 #${reply.roleId}` : "骰娘");

  return (
    <div className={`
      flex min-w-0 items-start gap-2
      ${useChatBubbleStyle ? `
        rounded-xl border border-base-300/65 bg-base-100/70 px-2.5 py-2
        shadow-sm
      ` : ""}
    `}>
      <RoleAvatarComponent
        avatarId={reply.avatarId ?? 0}
        roleId={reply.roleId}
        width={useChatBubbleStyle ? 6 : 10}
        isRounded={useChatBubbleStyle}
        stopToastWindow
        alt={roleName}
      />
      <div className="min-w-0 flex-1">
        <div className={`
          flex items-center gap-1.5 text-[11px]
          ${useChatBubbleStyle ? `mb-1 text-base-content/55` : `
            mb-0.5 text-base-content/50
          `}
        `}>
          <span className="font-medium">{roleName}</span>
          {reply.hidden ? <Badge appearance="ghost">暗骰</Badge> : null}
        </div>
        {useChatBubbleStyle
          ? (
              <div className={`
                whitespace-pre-wrap wrap-break-word
                ${reply.hidden && !canViewHiddenDiceReply ? `
                  italic text-base-content/60
                ` : ""}
              `}>
                {reply.content || "[骰子结果]"}
              </div>
            )
          : (
              <div className={`
                border-l-2 border-info/25 pl-2.5 whitespace-pre-wrap
                wrap-break-word
                ${reply.hidden && !canViewHiddenDiceReply ? `
                  italic text-base-content/60
                ` : ""}
              `}>
                {reply.content || "[骰子结果]"}
              </div>
            )}
      </div>
    </div>
  );
}

const EFFECT_PREVIEW_DURATION_MS = 2000;
const MESSAGE_TIME_CLOCK_SKEW_TOLERANCE_MS = 60_000;
const narratorAvatarFrameClassName = "flex items-center justify-center rounded-full bg-base-200/65 text-base-content/70 transition-colors duration-150 ease-out motion-reduce:transition-none hover:bg-base-300/70 hover:text-base-content/85";
const narratorAvatarIconClassName = "transition-transform duration-150 ease-out motion-reduce:transition-none group-hover/narrator:scale-105";
const messageTimeInlineClassName = "shrink-0 whitespace-nowrap text-xs text-base-content/50 transition-opacity duration-200 opacity-0 group-hover:opacity-100";
const bubbleMessageTimeClassName = `hidden sm:inline-flex ${messageTimeInlineClassName}`;
const plainMessageTimeClassName = `inline-flex pt-0.5 ${messageTimeInlineClassName}`;
const bubbleMessageNamePlaceholderClassName = "block min-w-10 max-w-full truncate pb-0.5 text-sm sm:pb-1 sm:text-sm invisible";
const plainMessageNamePlaceholderClassName = "min-w-10 max-w-full text-sm/5 sm:text-base/6 invisible";
const roleNameHitTargetClassName = "relative after:absolute after:-inset-x-2 after:-inset-y-1.5 after:content-['']";

function parseMessageTimeToMs(time?: string | number | null): number | undefined {
  if (time == null) {
    return undefined;
  }
  if (typeof time === "number") {
    return Number.isFinite(time) ? time : undefined;
  }

  const nativeParsed = new Date(time).getTime();
  if (!Number.isNaN(nativeParsed)) {
    return nativeParsed;
  }
  const fallbackParsed = time.includes("-") ? new Date(time.replace(/-/g, "/")).getTime() : Number.NaN;
  return Number.isNaN(fallbackParsed) ? undefined : fallbackParsed;
}

function formatMessageHeaderTime(createTime?: string | number | null, updateTime?: string | number | null): string {
  const createTimeMs = parseMessageTimeToMs(createTime);
  const updateTimeMs = parseMessageTimeToMs(updateTime);
  const createdLabel = createTime ? formatTimeSmartly(createTime) : "";
  const updatedLabel = updateTime ? formatTimeSmartly(updateTime) : "";
  const createTimeLooksConsistent = createTimeMs === undefined
    || updateTimeMs === undefined
    || createTimeMs <= updateTimeMs + MESSAGE_TIME_CLOCK_SKEW_TOLERANCE_MS;
  // 历史 WS 缓存可能把本机收到时间写成 createTime；这种值会晚于服务端 updateTime。
  if (createdLabel && createTimeLooksConsistent) {
    return createdLabel;
  }
  return updatedLabel || createdLabel;
}

function HoverToolbarActionButton({ label, onClick, children }: HoverToolbarActionButtonProps) {
  return (
    <PortalTooltip label={label} placement="bottom" anchorClassName="flex">
      <Button
        variant="ghost"
        size="xs"
        shape="circle"
        className="
          size-7 min-h-0 p-0 text-base-content/70
          hover:bg-base-300/70 hover:text-base-content
        "
        onClick={onClick}
        title={label}
        aria-label={label}
      >
        {children}
      </Button>
    </PortalTooltip>
  );
}

function ClueCardReadonlyModal({
  message,
  onClose,
}: {
  message: Message;
  onClose: () => void;
}) {
  return (
    <DialogFrame
      open
      mode="inline"
      onClose={onClose}
      ariaLabel="查看线索"
      rootClassName="z-9999"
      panelClassName="max-w-2xl"
    >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold">查看线索</h3>
          <IconButton
            variant="ghost"
            size="sm"
            shape="square"
            label="关闭线索"
            onClick={onClose}
            icon={<CloseIcon className="size-4" />}
          />
        </div>

        <div className="
          max-h-[60vh] overflow-auto rounded-lg border border-base-300
          bg-base-200/40 p-3
        ">
          <MessageContentRenderer
            message={{
              ...message,
              status: message.status ?? 0,
            }}
            cacheKeyBase={`clue-card-modal:${message.messageId ?? "snapshot"}`}
          />
        </div>
    </DialogFrame>
  );
}

function ClueCardMessage({ message }: { message: Message }) {
  const clue = getClueCardRenderData(message.extra, message.content);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const snapshotMessage = {
    ...clue.snapshot,
    messageId: message.messageId,
    roomId: message.roomId,
    status: 0,
  } as Message;

  return (
    <>
      <button
        type="button"
        className="
          flex w-[min(36rem,100%)] min-w-0 flex-col gap-1 rounded-lg border
          border-info/25 bg-info/8 px-3 py-2 text-left text-base-content
          shadow-sm transition
          hover:border-info/45 hover:bg-info/12
          focus-visible:outline focus-visible:outline-2
          focus-visible:outline-offset-2 focus-visible:outline-info/60
        "
        title="查看线索"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsModalOpen(true);
        }}
      >
        <Badge tone="info" className="w-fit">线索</Badge>
        <div className="min-w-0 wrap-break-word text-sm">
          <MessagePreviewContent message={snapshotMessage} withMediaPreview />
        </div>
      </button>
      {isModalOpen && (
        <ClueCardReadonlyModal
          message={snapshotMessage}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

export function ClueCardReadonlyContent({
  message,
}: {
  message: Message;
  onClose?: () => void;
}) {
  const previewMessage = {
    ...message,
    status: message.status ?? 0,
  } as Message;

  return (
    <div className="min-w-0 wrap-break-word text-sm">
      <MessagePreviewContent message={previewMessage} withMediaPreview />
    </div>
  );
}

function ChatBubbleComponent({ chatMessageResponse, useChatBubbleStyle, onExecuteCommandRequest, isCommandRequestConsumed, onToggleSelection, onEditWebgalChoose, onPokeMessage, baseVersionMessage, showFullMessageDiff, showAddedMessageDiff = true, messageAction }: {
  /** 包含聊天消息内容、发送者等信息的数据对象 */
  chatMessageResponse: ChatMessageResponse;
  /** 控制是否应用气泡样式，默认为false */
  useChatBubbleStyle?: boolean;
  /** 点击“检定请求”按钮后，触发外层执行（以点击者身份发送并执行指令） */
  onExecuteCommandRequest?: (payload: { command: string; requestMessageId: number }) => void;
  isCommandRequestConsumed?: (requestMessageId: number) => boolean;
  onToggleSelection?: (messageId: number) => void;
  onEditWebgalChoose?: (messageId: number) => void;
  onPokeMessage?: (message: Message) => void;
  baseVersionMessage?: ChatMessageResponse | null;
  showFullMessageDiff?: boolean;
  showAddedMessageDiff?: boolean;
  /** 附着在消息正文里的扩展操作 */
  messageAction?: React.ReactNode;
}) {
  const message = chatMessageResponse.message;
  const annotations = useMemo(() => {
    const base = normalizeAnnotations(message.annotations);
    if (message.messageType === MESSAGE_TYPE.IMG && message.extra?.imageMessage?.background) {
      return base.includes(ANNOTATION_IDS.BACKGROUND) ? base : [...base, ANNOTATION_IDS.BACKGROUND];
    }
    return base;
  }, [message.annotations, message.extra?.imageMessage?.background, message.messageType]);
  const annotationMap = buildAnnotationMap();
  const effectAnnotation = annotations
    .map(id => annotationMap.get(id))
    .find(def => def?.category === "特效" && def.iconUrl);
  const effectPreview = effectAnnotation?.iconUrl
    ? {
        iconUrl: effectAnnotation.iconUrl,
        durationMs: getEffectDurationMs(effectAnnotation.id) ?? EFFECT_PREVIEW_DURATION_MS,
      }
    : null;
  const effectIconUrl = effectPreview?.iconUrl ?? null;
  const [effectPreviewVisible, setEffectPreviewVisible] = useState(false);
  const [effectPreviewToken, setEffectPreviewToken] = useState(0);
  const effectPreviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerEffectPreview = useCallback(() => {
    if (!effectIconUrl) {
      return;
    }
    setEffectPreviewVisible(true);
    setEffectPreviewToken(Date.now());
    if (effectPreviewTimerRef.current) {
      clearTimeout(effectPreviewTimerRef.current);
    }
    effectPreviewTimerRef.current = setTimeout(() => {
      setEffectPreviewVisible(false);
    }, effectPreview?.durationMs ?? EFFECT_PREVIEW_DURATION_MS);
  }, [effectIconUrl, effectPreview?.durationMs]);
  useEffect(() => () => {
    if (effectPreviewTimerRef.current) {
      clearTimeout(effectPreviewTimerRef.current);
    }
  }, []);
  const roomContext = use(RoomContext);
  const isFailedMessage = isFailedRoomMessage(message);
  const handleRetryFailedMessage = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const request = buildRoomMessageRetryRequest(message);
    if (!request || !roomContext.sendMessageWithInsert || !roomContext.chatHistory) {
      appToast.error("这条消息暂时无法重新发送");
      return;
    }
    await roomContext.chatHistory.removeMessageById(message.messageId);
    await roomContext.sendMessageWithInsert(request);
  }, [message, roomContext]);
  const handleRemoveFailedMessage = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    await roomContext.chatHistory?.removeMessageById(message.messageId);
  }, [message.messageId, roomContext.chatHistory]);
  const roleFromRoom = roomContext.roomAllRoles?.find(item => item.roleId === chatMessageResponse.message.roleId);
  const useRoleRequest = useGetRoleQuery(chatMessageResponse.message.roleId ?? 0, { enabled: !roleFromRoom });
  const role = roleFromRoom ?? useRoleRequest.data?.data;
  const roleDeleted = !roleFromRoom && isRoleNotFoundApiError(useRoleRequest.error);

  const updateMessageMutation = useUpdateMessageMutation();

  const userId = useGlobalUserId();

  const spaceContext = use(SpaceContext);
  const setInsertAfterMessageId = useRoomUiStore(state => state.setInsertAfterMessageId);
  const setReplyMessage = useRoomUiStore(state => state.setReplyMessage);
  const roomUiStoreApi = useRoomUiStoreApi();
  const isAvatarSamplerActive = useRoomUiStore(state => state.isAvatarSamplerActive);
  const setAvatarSamplerActive = useRoomUiStore(state => state.setAvatarSamplerActive);
  const useChatBubbleStyleFromStore = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  const webgalLinkMode = useRoomPreferenceStore(state => state.webgalLinkMode);
  const runModeEnabled = useRoomPreferenceStore(state => state.runModeEnabled);
  useChatBubbleStyle = useChatBubbleStyle ?? useChatBubbleStyleFromStore;
  const setCurRoleIdForRoom = useRoomRoleSelectionStore(state => state.setCurRoleIdForRoom);
  const setCurAvatarIdForRole = useRoomRoleSelectionStore(state => state.setCurAvatarIdForRole);

  const isMobile = getScreenSize() === "sm";

  const [isEditingContent, setIsEditingContent] = useState(false);
  const editInputRef = useRef<ChatInputAreaHandle | null>(null);
  const avatarClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 判断是否为旁白（无角色）- 包括 roleId 为空/undefined/0/负数 的情况
  const isNarrator = !message.roleId || message.roleId <= 0;
  // 判断是否为黑屏文字
  const isIntroText = message.messageType === MESSAGE_TYPE.INTRO_TEXT;
  const isSystemRowMessage = isSystemRowMessageType(message.messageType);
  const createTime = message.createTime;
  const updateTime = message.updateTime;
  const formattedTime = formatMessageHeaderTime(createTime, updateTime);
  // 获取自定义角色名（如果有）
  const customRoleName = message.customRoleName as string | undefined;
  // 获取显示的角色名（黑屏文字不显示）
  const displayRoleName = getDisplayRoleName({
    roleId: message.roleId,
    roleName: role?.roleName,
    customRoleName,
    isIntroText,
    zeroRoleIsNarrator: true,
    fallback: roleDeleted ? "角色已删除" : "未选择角色",
  });
  const isOutOfCharacterTextMessage = message.messageType === MESSAGE_TYPE.TEXT
    && isOutOfCharacterSpeech(message.content);
  const shouldUseUserAvatar = isOutOfCharacterTextMessage;
  const speakerDisplayName = displayRoleName;
  const chatMessageMetaRowClass = isOutOfCharacterTextMessage
    ? "flex items-center gap-2 w-full min-w-0 relative"
    : getChatMessageMetaRowClass();
  const versionDiff = useMemo(() => {
    if (!baseVersionMessage) {
      return showFullMessageDiff && showAddedMessageDiff ? buildMessageTextDiff("", message.content ?? "") : null;
    }
    return buildMessageTextDiff(baseVersionMessage.message.content ?? "", message.content ?? "");
  }, [baseVersionMessage, message.content, showAddedMessageDiff, showFullMessageDiff]);
  const canShowVersionDiff = Boolean(versionDiff && (showFullMessageDiff || versionDiff.hasChanges));
  const versionDiffPreview = canShowVersionDiff && showFullMessageDiff && versionDiff
    ? (
        <div className="mt-2 w-full max-w-3xl">
          <MessageTextDiffPreview diff={versionDiff} footerAction={messageAction} />
        </div>
      )
    : null;
  const messageActionFallback = messageAction && !versionDiffPreview
    ? <div className="mt-2 flex justify-end">{messageAction}</div>
    : null;
  const shouldHideOriginalContentInFullDiff = Boolean(versionDiffPreview);
  const canEdit = userId === message.userId || spaceContext.isSpaceOwner;

  // 更新消息并同步到本地缓存
  const updateMessageAndSync = useCallback((newMessage: Message) => {
    const hasChanges = JSON.stringify(chatMessageResponse.message) !== JSON.stringify(newMessage);
    if (!hasChanges) {
      return;
    }

    roomUiStoreApi.getState().pushMessageUndo({
      type: "update",
      before: chatMessageResponse.message,
      after: newMessage,
    });

    const optimisticResponse = {
      ...chatMessageResponse,
      message: newMessage,
    };
    roomContext.chatHistory?.addOrUpdateMessage(optimisticResponse);
    if (roomContext.updateAndRerenderMessageInWebGAL) {
      roomContext.updateAndRerenderMessageInWebGAL(chatMessageResponse, optimisticResponse, false);
    }

    updateMessageMutation.mutate(newMessage, {
      onSuccess: (response) => {
        const committedResponse = {
          ...chatMessageResponse,
          message: response?.data ?? newMessage,
        };
        roomContext.chatHistory?.addOrUpdateMessage(committedResponse);
        if (
          roomContext.updateAndRerenderMessageInWebGAL
          && !areRealtimeRenderMessagesEquivalent(optimisticResponse.message, committedResponse.message)
        ) {
          roomContext.updateAndRerenderMessageInWebGAL(optimisticResponse, committedResponse, false);
        }
      },
      onError: (error) => {
        console.error("更新消息失败", error);
        roomContext.chatHistory?.addOrUpdateMessage(chatMessageResponse);
        if (roomContext.updateAndRerenderMessageInWebGAL) {
          roomContext.updateAndRerenderMessageInWebGAL(optimisticResponse, chatMessageResponse, false);
        }
        appToast.error("更新消息失败，已恢复原内容");
      },
    });
  }, [chatMessageResponse, roomContext, roomUiStoreApi, updateMessageMutation]);

  const roleNameEditor = useInlineTextEditor<HTMLSpanElement>({
    enabled: canEdit,
    initialValue: customRoleName || role?.roleName || "",
    normalize: normalizeInlineRoleName,
    onCommit: (trimmedName) => {
      updateMessageAndSync({
        ...message,
        customRoleName: trimmedName || undefined, // 空字符串时清除自定义名称
      } as Message);
    },
  });
  const showRoleNameEditor = !isIntroText
    && !isSystemRowMessage
    && !isOutOfCharacterTextMessage
    && roleNameEditor.isEditing;

  function handleExpressionChange(avatarId: number) {
    const newMessage: Message = {
      ...message,
      avatarId,
    };
    updateMessageAndSync(newMessage);
  }

  function handleRoleChange(new_roleId: number) {
    const newMessage: Message = {
      ...message,
      roleId: new_roleId,
      avatarId: roomContext.roomRolesThatUserOwn.find(role => role.roleId === new_roleId)?.avatarId ?? -1,
    };
    updateMessageAndSync(newMessage);
  }

  const handleUpdateAnnotations = useCallback((next: string[]) => {
    const nextAnnotations = normalizeAnnotations(next);
    const annotationsChanged = !areAnnotationsEqual(message.annotations, nextAnnotations);
    if (message.messageType === MESSAGE_TYPE.IMG && message.extra?.imageMessage) {
      const nextBackground = hasAnnotation(nextAnnotations, ANNOTATION_IDS.BACKGROUND);
      const currentBackground = Boolean(message.extra.imageMessage.background);
      if (!annotationsChanged && nextBackground === currentBackground) {
        return;
      }
      if (nextBackground !== currentBackground) {
        updateMessageAndSync({
          ...message,
          annotations: nextAnnotations,
          extra: {
            ...message.extra,
            imageMessage: {
              ...message.extra.imageMessage,
              background: nextBackground,
            },
          },
        });
        return;
      }
    }
    if (message.messageType === MESSAGE_TYPE.SOUND && message.extra?.soundMessage) {
      const nextPurpose = getNextSyncedSoundMessagePurpose({
        previousAnnotations: message.annotations,
        nextAnnotations,
        currentPurpose: message.extra.soundMessage.purpose,
      });
      const currentPurpose = typeof message.extra.soundMessage.purpose === "string"
        ? message.extra.soundMessage.purpose.trim().toLowerCase()
        : undefined;
      const purposeChanged = currentPurpose !== nextPurpose;
      if (!annotationsChanged && !purposeChanged) {
        return;
      }
      updateMessageAndSync({
        ...message,
        annotations: nextAnnotations,
        extra: {
          ...message.extra,
          soundMessage: {
            ...message.extra.soundMessage,
            ...(nextPurpose ? { purpose: nextPurpose } : { purpose: undefined }),
          },
        },
      });
      return;
    }
    if (!annotationsChanged) {
      return;
    }
    updateMessageAndSync({
      ...message,
      annotations: nextAnnotations,
    });
  }, [message, updateMessageAndSync]);

  const handleToggleAnnotation = useCallback((id: string) => {
    handleUpdateAnnotations(toggleAnnotation(annotations, id));
  }, [annotations, handleUpdateAnnotations]);

  const handleOpenAnnotations = useCallback(() => {
    openMessageAnnotationPicker({
      initialSelected: annotations,
      messageType: message.messageType,
      onChange: handleUpdateAnnotations,
    });
  }, [annotations, handleUpdateAnnotations, message.messageType]);

  const shouldShowMessageAnnotations = webgalLinkMode || runModeEnabled;
  const renderAnnotationsBar = (className?: string) => shouldShowMessageAnnotations
    ? (
        <MessageAnnotationsBar
          annotations={annotations}
          canEdit={canEdit}
          onToggle={handleToggleAnnotation}
          onOpenPicker={handleOpenAnnotations}
          showWhenEmpty={webgalLinkMode}
          alwaysShowAddButton={webgalLinkMode}
          showAddButton={webgalLinkMode}
          showNormalModeAnnotationsOnly={false}
          compact={isMobile}
          className={className}
        />
      )
    : null;

  const isEditableContentMessage = message.messageType === MESSAGE_TYPE.TEXT
    || message.messageType === MESSAGE_TYPE.INTRO_TEXT
    || message.messageType === MESSAGE_TYPE.IMG
    || message.messageType === MESSAGE_TYPE.SOUND
    || message.messageType === MESSAGE_TYPE.POKE;
  const canEditContent = canEdit && isEditableContentMessage;
  const canShowTextStyleToolbar = isEditingContent
    && canEdit
    && (isEditableContentMessage || message.messageType === MESSAGE_TYPE.DICE);
  const textStyleToolbar = canShowTextStyleToolbar
    ? (
        <TextStyleToolbar
          chatInputRef={editInputRef}
          visible={canShowTextStyleToolbar}
          className="text-style-toolbar"
        />
      )
    : null;
  const shouldIgnoreEditBlur = useCallback((target: EventTarget | null) => {
    const element = target as HTMLElement | null;
    if (!element) {
      return false;
    }
    return Boolean(element.closest(".text-style-toolbar") || element.closest(".modal"));
  }, []);
  const canViewHiddenDiceReply = canCurrentUserViewHiddenDiceReply(message, {
    currentUserId: roomContext.curMember?.userId,
    memberType: roomContext.curMember?.memberType,
  });

  const handleReplyClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setReplyMessage(message);
  }, [message, setReplyMessage]);

  const handleToggleSelectionClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleSelection?.(message.messageId);
  }, [message.messageId, onToggleSelection]);

  const handleInsertAfterClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setInsertAfterMessageId(message.messageId);
  }, [message.messageId, setInsertAfterMessageId]);

  const handleOpenAnnotationsClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleOpenAnnotations();
  }, [handleOpenAnnotations]);

  const handleToggleIntroText = useCallback(() => {
    if (!canEdit)
      return;

    const newMessageType = isIntroText ? MESSAGE_TYPE.TEXT : MESSAGE_TYPE.INTRO_TEXT;
    const newMessage = {
      ...message,
      messageType: newMessageType,
    } as Message;

    updateMessageAndSync(newMessage);
  }, [canEdit, isIntroText, message, updateMessageAndSync]);

  const handleToggleIntroTextClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    handleToggleIntroText();
  }, [handleToggleIntroText]);

  const handleEditMessageClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window === "undefined") {
      return;
    }
    const target = document.querySelector(
      `[data-message-id="${message.messageId}"] .editable-field`,
    ) as HTMLElement | null;
    if (!target) {
      return;
    }
    target.dispatchEvent(new MouseEvent("dblclick", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: target.offsetLeft + target.offsetWidth / 2,
      clientY: target.offsetTop + target.offsetHeight / 2,
    }));
  }, [message.messageId]);

  const handleEditWebgalChooseClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onEditWebgalChoose?.(message.messageId);
  }, [message.messageId, onEditWebgalChoose]);

  const handleOpenContextMenu = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window === "undefined") {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: rect.right,
      clientY: rect.bottom,
    }));
  }, []);

  const toggleIntroTextLabel = isIntroText ? "转为对话" : "转为黑屏";

  const messageHoverToolbar = (
    <div
      className={getChatMessageHoverToolbarClass(isMobile)}
    >
      {onToggleSelection && (
        <HoverToolbarActionButton label="多选" onClick={handleToggleSelectionClick}>
          <ListUnordered className="size-4" />
        </HoverToolbarActionButton>
      )}
      <HoverToolbarActionButton label="回复" onClick={handleReplyClick}>
        <CommentOutline className="size-4" />
      </HoverToolbarActionButton>
      {canEdit && (
        <HoverToolbarActionButton label="添加标注" onClick={handleOpenAnnotationsClick}>
          <EmojiIconWhite className="size-4" />
        </HoverToolbarActionButton>
      )}
      {canEdit && (message.messageType === MESSAGE_TYPE.TEXT || message.messageType === MESSAGE_TYPE.INTRO_TEXT) && (
        <HoverToolbarActionButton label={toggleIntroTextLabel} onClick={handleToggleIntroTextClick}>
          <ScreenIcon className="size-4 text-black" />
        </HoverToolbarActionButton>
      )}
      <HoverToolbarActionButton label="插入消息" onClick={handleInsertAfterClick}>
        <InsertLineBelow className="size-4" />
      </HoverToolbarActionButton>
      {canEditContent && (
        <HoverToolbarActionButton label="编辑" onClick={handleEditMessageClick}>
          <Edit2Outline className="size-4" />
        </HoverToolbarActionButton>
      )}
      {canEdit && message.messageType === MESSAGE_TYPE.WEBGAL_CHOOSE && onEditWebgalChoose && (
        <HoverToolbarActionButton label="编辑选择" onClick={handleEditWebgalChooseClick}>
          <Edit2Outline className="size-4" />
        </HoverToolbarActionButton>
      )}
      <HoverToolbarActionButton label="更多" onClick={handleOpenContextMenu}>
        <MoreMenu className="size-4" />
      </HoverToolbarActionButton>
    </div>
  );

  const handleAvatarSample = useCallback(() => {
    const roomId = roomContext.roomId ?? -1;
    const targetRoleId = message.roleId ?? 0;
    const targetAvatarId = message.avatarId ?? -1;
    if (roomId <= 0) {
      appToast.error("未找到房间，无法取样");
      return;
    }
    if (targetRoleId === 0 || targetAvatarId <= 0) {
      appToast.error("该消息没有可取样的头像");
      return;
    }
    if (targetRoleId <= 0 && !spaceContext.isSpaceOwner) {
      appToast.error("只有主持人可以取样旁白头像");
      return;
    }
    if (targetRoleId > 0 && !roomContext.roomRolesThatUserOwn.some(role => role.roleId === targetRoleId)) {
      appToast.error("该角色不可用");
      return;
    }
    setCurRoleIdForRoom(roomId, targetRoleId);
    setCurAvatarIdForRole(targetRoleId, targetAvatarId);
    setAvatarSamplerActive(false);
  }, [
    message.avatarId,
    message.roleId,
    roomContext.roomId,
    roomContext.roomRolesThatUserOwn,
    setAvatarSamplerActive,
    setCurAvatarIdForRole,
    setCurRoleIdForRoom,
    spaceContext.isSpaceOwner,
  ]);

  const openExpressionChooser = (fullScreen: boolean) => {
    toastWindow(
      onClose => (
        <RoomContext value={roomContext}>
          <div className={fullScreen ? "flex h-full min-h-0 flex-col" : `
            flex flex-col
          `}>
            <ExpressionChooser
              roleId={message.roleId ?? -1}
              selectedAvatarId={message.avatarId ?? undefined}
              handleExpressionChange={(avatarId) => {
                handleExpressionChange(avatarId);
                onClose();
              }}
              handleRoleChange={(roleId) => {
                handleRoleChange(roleId);
                onClose();
              }}
              onRequestClose={onClose}
              defaultFullscreen={fullScreen}
              fullscreenLayoutMode={fullScreen ? "fill" : "dialog"}
              onRequestFullscreen={(next) => {
                onClose();
                openExpressionChooser(next);
              }}
            />
          </div>
        </RoomContext>
      ),
      { fullScreen },
    );
  };

  function handleAvatarClick(event?: React.MouseEvent<HTMLDivElement>) {
    if (isAvatarSamplerActive) {
      event?.preventDefault();
      event?.stopPropagation();
      handleAvatarSample();
      return;
    }
    if (canEdit) {
      if (avatarClickTimerRef.current) {
        clearTimeout(avatarClickTimerRef.current);
      }
      avatarClickTimerRef.current = setTimeout(() => {
        avatarClickTimerRef.current = null;
        openExpressionChooser(isMobile);
      }, 220);
    }
  }

  const handlePokeAvatarDoubleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!onPokeMessage || !(message.roleId && message.roleId > 0)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (avatarClickTimerRef.current) {
      clearTimeout(avatarClickTimerRef.current);
      avatarClickTimerRef.current = null;
    }
    onPokeMessage(message);
  }, [message, onPokeMessage]);

  useEffect(() => {
    return () => {
      if (avatarClickTimerRef.current) {
        clearTimeout(avatarClickTimerRef.current);
      }
    };
  }, []);

  const handleContentUpdate = useCallback((content: string) => {
    if (message.content !== content) {
      updateMessageAndSync({
        ...message,
        content,
      });
    }
  }, [message, updateMessageAndSync]);

  const handleDiceContentUpdate = useCallback((content: string) => {
    const currentExtra = message.extra as Record<string, any> | undefined;
    const diceTurn = currentExtra?.diceTurn;
    if (diceTurn && typeof diceTurn === "object" && !Array.isArray(diceTurn)) {
      if (message.content === content && diceTurn.command === content) {
        return;
      }
      updateMessageAndSync({
        ...message,
        content,
        extra: {
          ...message.extra,
          diceTurn: {
            ...diceTurn,
            command: content,
          },
        },
      });
      return;
    }

    if (message.content === content && currentExtra?.diceResult?.result === content) {
      return;
    }
    updateMessageAndSync({
      ...message,
      content,
      extra: {
        ...message.extra,
        diceResult: { result: content },
      },
    });
  }, [message, updateMessageAndSync]);

  // 处理角色名编辑
  function handleRoleNameClick(event: React.SyntheticEvent<HTMLElement>) {
    if (canEdit) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // 不可编辑时，@角色
    const roleName = role?.roleName?.trim() || "Undefined";
    const inputElement = document.querySelector(".chatInputTextarea") as HTMLTextAreaElement;
    if (inputElement) {
      const currentText = inputElement.value;
      const atText = `@${roleName} `;
      if (!currentText.includes(atText)) {
        inputElement.value = currentText + atText;
        inputElement.focus();
        const event = new Event("input", { bubbles: true });
        inputElement.dispatchEvent(event);
      }
    }
  }

  function handleRoleNameDoubleClick(event: React.MouseEvent<HTMLElement>) {
    if (!canEdit) {
      return;
    }
    roleNameEditor.startEditing(event);
  }

  const handleReplyPreviewClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!message.replyMessageId) {
      return;
    }
    roomContext.scrollToGivenMessage?.(message.replyMessageId);
  }, [message.replyMessageId, roomContext]);

  const renderedContent = (() => {
    if (message.status === 1) {
      return <span className="text-xs text-base-content/60">[原消息已删除]</span>;
    }

    const replyNode = message.replyMessageId
      ? (
          <button
            type="button"
            className="
              mb-1 flex flex-col gap-0.5 rounded-md border border-base-300/60
              bg-base-100/70 px-2 py-1 text-left text-xs text-base-content/70
              hover:bg-base-200/70
            "
            onClick={handleReplyPreviewClick}
          >
            <span className="text-[10px] text-base-content/50">回复</span>
            <PreviewMessage message={message.replyMessageId} className="block" withMediaPreview />
          </button>
        )
      : null;

    const extra = message.extra as any;
    const docCardPayload = extra?.docCard;
    const hasDocCard = message.messageType === MESSAGE_TYPE.DOC_CARD || Boolean(docCardPayload);
    const hasClueCard = message.messageType === MESSAGE_TYPE.CLUE_CARD || Boolean(extra?.clueMessage);
    const roomJumpPayload = extractRoomJumpPayload(message.extra);
    const hasRoomJump = message.messageType === MESSAGE_TYPE.ROOM_JUMP || Boolean(roomJumpPayload);

    const commandRequest = extra?.commandRequest as CommandRequestPayload | undefined;
    const hasCommandRequest = message.messageType === MESSAGE_TYPE.COMMAND_REQUEST || Boolean(commandRequest);

    const bodyNode = (() => {
      if (hasDocCard) {
        return <DocCardMessage messageResponse={chatMessageResponse} />;
      }

      if (hasClueCard) {
        return <ClueCardMessage message={message} />;
      }

      if (hasRoomJump) {
        return <RoomJumpMessage messageResponse={chatMessageResponse} />;
      }

      if (hasCommandRequest) {
        const commandText = String(commandRequest?.command ?? message.content ?? "").trim();
        const allowedRoleIds = Array.isArray(commandRequest?.allowedRoleIds)
          ? commandRequest!.allowedRoleIds!.filter(id => typeof id === "number")
          : [];
        const curRoleId = roomContext.curRoleId ?? -1;
        const isSpectator = isObserverLike(roomContext.curMember?.memberType);
        const noRole = curRoleId <= 0;
        const allowAll = Boolean(commandRequest?.allowAll);
        const alreadyConsumed = isCommandRequestConsumed?.(message.messageId) ?? false;
        let disableReason = "";
        if (!commandText) {
          disableReason = "指令为空";
        }
        else if (!onExecuteCommandRequest) {
          disableReason = "当前无法执行";
        }
        else if (alreadyConsumed) {
          disableReason = "该请求已执行";
        }
        else if (noRole && !spaceContext.isSpaceOwner && !isSpectator) {
          disableReason = "旁白仅主持可用";
        }
        else if (allowedRoleIds.length > 0 && !allowedRoleIds.includes(curRoleId)) {
          disableReason = "当前角色不可执行";
        }
        const hintText = disableReason || "点击此进行检定";
        const handleCommandRequestClick = (event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
          if (disableReason) {
            appToast.error(disableReason);
            return;
          }
          onExecuteCommandRequest?.({
            command: commandText,
            requestMessageId: message.messageId,
          });
        };

        return (
          <button
            type="button"
            className={`
              w-full rounded-md border border-base-300 bg-base-100/80 px-3 py-2
              text-left transition
              ${
              disableReason ? "opacity-60 cursor-not-allowed" : `
                hover:border-info/60 hover:bg-base-200/80
              `
            }
            `}
            onClick={handleCommandRequestClick}
            aria-disabled={Boolean(disableReason)}
            title={hintText}
          >
            <div className="
              flex items-center gap-2 text-xs text-base-content/70
            ">
              <Badge tone="info">检定请求</Badge>
              {allowAll && <span className="text-[10px] text-base-content/50">全员</span>}
            </div>
            <div className="mt-1 text-sm font-mono wrap-break-word">
              {commandText || "[空指令]"}
            </div>
            <div className="mt-1 text-[10px] text-base-content/50">
              {hintText}
            </div>
          </button>
        );
      }

      switch (message.messageType) {
        case MESSAGE_TYPE.TEXT:
          return (
            <EditableMessageContent
              content={message.content}
              onCommit={handleContentUpdate}
              className={`
                editable-field whitespace-pre-wrap wrap-break-word
                ${isOutOfCharacterTextMessage ? `italic text-base-content/60` : ""}
              `}
              editorClassName={`min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded w-full ${isOutOfCharacterTextMessage ? "italic text-base-content/60" : ""}`}
              onEditingChange={setIsEditingContent}
              editInputRef={editInputRef}
              shouldIgnoreBlur={shouldIgnoreEditBlur}
              canEdit={canEditContent}
            />
          );
        case MESSAGE_TYPE.INTRO_TEXT:
          return (
            <div className="
              rounded-lg bg-black text-white px-3 py-2 shadow-inner
            ">
              <EditableMessageContent
                content={message.content}
                onCommit={handleContentUpdate}
                className="
                  editable-field whitespace-pre-wrap wrap-break-word text-white
                "
                editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded w-full text-white"
                onEditingChange={setIsEditingContent}
                editInputRef={editInputRef}
                shouldIgnoreBlur={shouldIgnoreEditBlur}
                canEdit={canEditContent}
              />
            </div>
          );
        case MESSAGE_TYPE.IMG:
          return (
            <div className="flex min-w-0 flex-col gap-1">
              <MessageContentRenderer
                message={{ ...message, content: "" }}
                annotations={annotations}
                cacheKeyBase={`chat:${message.messageId}`}
              />
              {(message.content || canEditContent) && (
                <EditableMessageContent
                  content={message.content ?? ""}
                  onCommit={handleContentUpdate}
                  className={`
                    editable-field whitespace-pre-wrap wrap-break-word text-sm
                    text-base-content/80
                    ${message.content ? "" : `sr-only`}
                  `}
                  editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded w-full text-sm text-base-content/80"
                  placeholder="添加图片说明"
                  onEditingChange={setIsEditingContent}
                  editInputRef={editInputRef}
                  shouldIgnoreBlur={shouldIgnoreEditBlur}
                  canEdit={canEditContent}
                />
              )}
            </div>
          );
        case MESSAGE_TYPE.SOUND:
          return (
            <div className="flex min-w-0 flex-col gap-1">
              <MessageContentRenderer
                message={{ ...message, content: "" }}
                annotations={annotations}
                cacheKeyBase={`chat:${message.messageId}`}
              />
              {(message.content || canEditContent) && (
                <EditableMessageContent
                  content={message.content ?? ""}
                  onCommit={handleContentUpdate}
                  className={`
                    editable-field whitespace-pre-wrap wrap-break-word text-sm
                    text-base-content/80
                    ${message.content ? "" : `sr-only`}
                  `}
                  editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded w-full text-sm text-base-content/80"
                  placeholder="添加语音文本"
                  onEditingChange={setIsEditingContent}
                  editInputRef={editInputRef}
                  shouldIgnoreBlur={shouldIgnoreEditBlur}
                  canEdit={canEditContent}
                />
              )}
            </div>
          );
        case MESSAGE_TYPE.STATE_EVENT:
          return <StateMessageCard message={message} />;
        case MESSAGE_TYPE.POKE:
          return (
            <div className="
              rounded-md border border-base-300/60
              bg-base-200/45 px-3 py-1.5
              text-center text-sm text-base-content/80
            ">
              <EditableMessageContent
                content={message.content ?? ""}
                onCommit={handleContentUpdate}
                className="editable-field whitespace-pre-wrap wrap-break-word"
                editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded w-full text-center"
                onEditingChange={setIsEditingContent}
                editInputRef={editInputRef}
                shouldIgnoreBlur={shouldIgnoreEditBlur}
                canEdit={canEditContent}
              />
            </div>
          );
        case MESSAGE_TYPE.FORWARD:
          return <ForwardMessage messageResponse={chatMessageResponse} />;
        case MESSAGE_TYPE.DICE: {
          if (extra?.diceTurn) {
            const diceTurnData = getDiceTurnRenderData(message.extra, message.content, canViewHiddenDiceReply);
            const commandContent = diceTurnData.command || message.content || "";
            const roomRoles = roomContext.roomAllRoles ?? [];
            return (
              <div className="flex min-w-0 flex-col gap-2 text-sm">
                <div className="rounded-md bg-base-200/55 px-2.5 py-2">
                  <div className="
                    mb-1 text-[10px] font-medium text-base-content/50
                  ">指令</div>
                  <EditableMessageContent
                    content={commandContent}
                    onCommit={handleDiceContentUpdate}
                    className="
                      editable-field whitespace-pre-wrap wrap-break-word
                    "
                    editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded w-full"
                    onEditingChange={setIsEditingContent}
                    editInputRef={editInputRef}
                    shouldIgnoreBlur={shouldIgnoreEditBlur}
                    canEdit={canEdit}
                  />
                </div>
                <div className="
                  flex min-w-0 flex-col gap-1.5 border-l-2 border-info/25
                  pl-2.5
                ">
                  {diceTurnData.replies.length > 0
                    ? diceTurnData.replies.map((reply, index) => (
                        <DiceTurnReplyItem
                          key={`${reply.roleId ?? "dicer"}:${index}`}
                          canViewHiddenDiceReply={canViewHiddenDiceReply}
                          useChatBubbleStyle={Boolean(useChatBubbleStyle)}
                          reply={reply}
                          roomRoles={roomRoles}
                        />
                      ))
                    : (
                        <div className="
                          whitespace-pre-wrap wrap-break-word
                          text-base-content/70
                        ">
                          [骰子结果]
                        </div>
                      )}
                </div>
              </div>
            );
          }
          const diceResult = extra?.diceResult;
          const result = diceResult?.result || message.content || "";
          return (
            <div className="text-sm">
              <div>
                <EditableMessageContent
                  content={result}
                  onCommit={handleDiceContentUpdate}
                  className="editable-field whitespace-pre-wrap wrap-break-word"
                  editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded w-full"
                  onEditingChange={setIsEditingContent}
                  editInputRef={editInputRef}
                  shouldIgnoreBlur={shouldIgnoreEditBlur}
                  canEdit={canEdit}
                />
              </div>
            </div>
          );
        }
        default:
          return (
            <MessageContentRenderer
              message={message}
              annotations={annotations}
              cacheKeyBase={`chat:${message.messageId}`}
            />
          );
      }
    })();

    if (replyNode) {
      return (
        <div className="flex flex-col gap-1">
          {replyNode}
          {bodyNode}
        </div>
      );
    }

    return bodyNode;
  })();

  return (
    <div>
      {textStyleToolbar}
      {isSystemRowMessage
        ? (
            <div
              className={`
                group relative flex w-full justify-center
              `}
            >
              {messageHoverToolbar}
              <div className="
                flex w-full max-w-4xl items-start justify-center gap-1.5 px-1.5
                sm:px-3
              ">
                <div className="min-w-0 max-w-full shrink">
                  {renderedContent}
                </div>
              </div>
            </div>
          )
        : useChatBubbleStyle
          ? (
              <div
                className={CHAT_MESSAGE_ROW_CLASS}
              >
                {messageHoverToolbar}
                {/* Avatar */}
                <div
                  className={`
                    shrink-0
                    ${
                    isIntroText
                      ? "invisible cursor-default"
                      : shouldUseUserAvatar
                        ? "cursor-default"
                        : (isAvatarSamplerActive ? "cursor-crosshair" : (canEdit ? `
                          cursor-pointer
                        ` : `cursor-default`))
                  }
                  `}
                  onClick={isIntroText || shouldUseUserAvatar ? undefined : handleAvatarClick}
                  onDoubleClick={isIntroText || shouldUseUserAvatar ? undefined : handlePokeAvatarDoubleClick}
                >
                  {shouldUseUserAvatar
                    ? (
                        <UserAvatarByUser
                          user={{ userId: message.userId }}
                          width={isMobile ? 10 : 12}
                          isRounded={true}
                          stopToastWindow={true}
                          clickEnterProfilePage={false}
                        />
                      )
                    : isNarrator
                      ? (
                          <div className={`
                            group/narrator
                            ${narratorAvatarFrameClassName}
                            ${isMobile ? `size-10` : `size-12`}
                          `}>
                            <NarratorIcon className={`
                              size-4
                              ${narratorAvatarIconClassName}
                            `} />
                          </div>
                        )
                      : (
                          <RoleAvatarComponent
                            avatarId={message.avatarId ?? 0}
                            avatarUrl={buildAvatarUrl(message.avatarFileId)}
                            avatarThumbUrl={buildAvatarThumbUrl(message.avatarFileId)}
                            roleId={message.roleId ?? undefined}
                            width={isMobile ? 10 : 12}
                            isRounded={true}
                            withTitle={false}
                            stopToastWindow={true}
                            alt={speakerDisplayName || "角色"}
                            useDefaultAvatarFallback={false}
                          />
                        )}
                </div>
                <div className="flex flex-col items-start">
                  <div className={chatMessageMetaRowClass}>
                    {showRoleNameEditor
                      ? (
                          <span
                            ref={roleNameEditor.editorRef as React.RefObject<HTMLSpanElement>}
                            className="
                              block min-w-10 max-w-full truncate pb-0.5
                              text-sm font-medium text-base-content/85
                              sm:pb-1 sm:text-sm
                              rounded bg-base-content/6 cursor-text
                              focus:outline-none focus:ring-0
                            "
                            contentEditable
                            suppressContentEditableWarning
                            aria-label="角色名"
                            onInput={roleNameEditor.syncDraft}
                            onKeyDown={roleNameEditor.handleKeyDown}
                            onBlur={roleNameEditor.commit}
                          />
                        )
                      : (
                          !isIntroText && speakerDisplayName
                            ? (
                                <div className="
                                  relative flex min-w-0 max-w-full items-center
                                  gap-2
                                ">
                                  <span
                                    onMouseDown={isOutOfCharacterTextMessage ? undefined : roleNameEditor.preventMultiClickSelection}
                                    onClick={isOutOfCharacterTextMessage ? undefined : handleRoleNameClick}
                                    onDoubleClick={isOutOfCharacterTextMessage ? undefined : handleRoleNameDoubleClick}
                                    role={!isOutOfCharacterTextMessage ? "button" : undefined}
                                    tabIndex={!isOutOfCharacterTextMessage ? 0 : undefined}
                                    title={speakerDisplayName}
                                    onKeyDown={!isOutOfCharacterTextMessage
                                      ? (e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          handleRoleNameClick(e);
                                        }
                                      }
                                      : undefined}
                                    className={`
                                      ${roleNameHitTargetClassName}
                                      block min-w-10 max-w-full truncate pb-0.5
                                      text-sm transition-colors duration-200
                                      sm:pb-1 sm:text-sm
                                      ${
                                      isOutOfCharacterTextMessage
                                        ? `
                                          font-medium text-base-content/60
                                          cursor-default
                                        `
                                        : `
                                          font-medium text-base-content/85
                                          ${canEdit ? "cursor-text" : "cursor-pointer"}
                                          hover:text-base-content
                                        `
                                    }
                                    `}
                                  >
                                    {`【${speakerDisplayName}】`}
                                  </span>
                                  {formattedTime && (
                                    <span className={bubbleMessageTimeClassName}>
                                      {formattedTime}
                                    </span>
                                  )}
                                  {effectPreviewVisible && effectIconUrl && (
                                    <MediaImage
                                      src={`${effectIconUrl}?t=${effectPreviewToken}`}
                                      alt=""
                                      className="
                                        pointer-events-none absolute left-full
                                        -top-2
                                        sm:-top-3
                                        ml-2 size-16
                                        sm:size-20
                                        object-contain scale-150 origin-left
                                      "
                                    />
                                  )}
                                </div>
                              )
                            : (
                                <div className="
                                  relative flex min-w-0 max-w-full items-center
                                  gap-2
                                ">
                                  <span className={bubbleMessageNamePlaceholderClassName} aria-hidden="true">
                                    占位
                                  </span>
                                  {formattedTime && (
                                    <span className={bubbleMessageTimeClassName}>
                                      {formattedTime}
                                    </span>
                                  )}
                                  {effectPreviewVisible && effectIconUrl && (
                                    <MediaImage
                                      src={`${effectIconUrl}?t=${effectPreviewToken}`}
                                      alt=""
                                      className="
                                        pointer-events-none absolute left-full
                                        -top-2
                                        sm:-top-3
                                        ml-2 size-16
                                        sm:size-20
                                        object-contain scale-150 origin-left
                                      "
                                    />
                                  )}
                                </div>
                              )
                        )}
                  </div>
                  {!shouldHideOriginalContentInFullDiff && (
                    <div
                      className={`
                        ${CHAT_MESSAGE_BUBBLE_BASE_CLASS}
                        cursor-pointer
                        ${
                        isOutOfCharacterTextMessage
                          ? `
                            border border-dashed border-base-content/15
                            bg-base-content/4 text-base-content/70 shadow-none
                            hover:bg-base-content/6 hover:shadow-none
                          `
                          : `
                            bg-base-200
                            hover:shadow-lg hover:bg-base-300
                          `
                      }
                      `}
                      onClick={triggerEffectPreview}
                    >
                      {renderedContent}
                    </div>
                  )}
                  {versionDiffPreview}
                  {messageActionFallback}
                  {renderAnnotationsBar(CHAT_MESSAGE_ANNOTATIONS_CLASS)}
                </div>
              </div>
            )
          : (
              <div
                className="
                  flex w-full py-1.5
                  sm:py-2
                  relative
                "
              >
                {messageHoverToolbar}
                {/* 圆角矩形头像 */}
                <div className="
                  shrink-0 pr-2
                  sm:pr-3
                ">
                  <div
                    className={`
                      size-9
                      sm:size-20.5
                      rounded-md overflow-hidden
                      ${
                      isIntroText
                        ? "invisible cursor-default"
                        : shouldUseUserAvatar
                          ? "cursor-default"
                          : (canEdit ? "cursor-pointer" : "cursor-default")
                    }
                    `}
                    onClick={isIntroText || shouldUseUserAvatar ? undefined : handleAvatarClick}
                    onDoubleClick={isIntroText || shouldUseUserAvatar ? undefined : handlePokeAvatarDoubleClick}
                  >
                    {shouldUseUserAvatar
                      ? (
                          <UserAvatarByUser
                            user={{ userId: message.userId }}
                            width={isMobile ? 10 : 21}
                            isRounded={false}
                            stopToastWindow={true}
                            clickEnterProfilePage={false}
                          />
                        )
                      : isNarrator
                        ? (
                            <div className="
                              group/narrator size-full flex items-center
                              justify-center bg-base-200/65 text-base-content/70
                              transition-colors duration-150 ease-out
                              motion-reduce:transition-none
                              hover:bg-base-300/70 hover:text-base-content/85
                            ">
                              <NarratorIcon className="
                                size-5 transition-transform duration-150
                                ease-out
                                motion-reduce:transition-none
                                group-hover/narrator:scale-105
                              " />
                            </div>
                          )
                        : (
                            <RoleAvatarComponent
                              avatarId={message.avatarId ?? 0}
                              avatarUrl={buildAvatarUrl(message.avatarFileId)}
                              avatarThumbUrl={buildAvatarThumbUrl(message.avatarFileId)}
                              roleId={message.roleId ?? undefined}
                              width={isMobile ? 10 : 21}
                              isRounded={false}
                              withTitle={false}
                              stopToastWindow={true}
                              alt={speakerDisplayName || "角色"}
                              useDefaultAvatarFallback={false}
                            >
                            </RoleAvatarComponent>
                          )}
                  </div>
                </div>
                {/* 消息内容 */}
                <div className="
                  flex-1 min-w-0 pr-2
                  sm:pr-5
                ">
                  {/* 角色名 */}
                  <div className="
                    flex min-w-0 max-w-full items-center gap-2
                    relative
                  ">
                    {showRoleNameEditor
                      ? (
                          <div
                            className="
                              inline-flex min-w-10 max-w-full items-baseline
                              text-sm/5 font-semibold
                              transition-colors duration-200 sm:text-base/6
                              cursor-text
                            "
                            aria-label="角色名"
                          >
                            <span aria-hidden="true">【</span>
                            <span
                              ref={roleNameEditor.editorRef as React.RefObject<HTMLSpanElement>}
                              className="
                                min-w-4 max-w-full truncate rounded
                                bg-base-content/6
                                focus:outline-none focus:ring-0
                              "
                              contentEditable
                              suppressContentEditableWarning
                              onInput={roleNameEditor.syncDraft}
                              onKeyDown={roleNameEditor.handleKeyDown}
                              onBlur={roleNameEditor.commit}
                            />
                            <span aria-hidden="true">】</span>
                          </div>
                        )
                      : (
                          !isIntroText && speakerDisplayName
                            ? (
                                <div className="
                                  relative flex min-w-0 max-w-full items-center
                                  gap-2
                                ">
                                  <div
                                    className={`
                                      ${roleNameHitTargetClassName}
                                      min-w-10 max-w-full text-sm/5
                                      transition-colors duration-200
                                      sm:text-base/6
                                      ${
                                      isOutOfCharacterTextMessage
                                        ? `
                                          font-medium text-base-content/60
                                          cursor-default
                                        `
                                        : `
                                          font-semibold
                                          ${userId === message.userId ? "cursor-text" : "cursor-pointer"}
                                          hover:text-base-content
                                        `
                                    }
                                    `}
                                    onMouseDown={isOutOfCharacterTextMessage ? undefined : roleNameEditor.preventMultiClickSelection}
                                    onClick={isOutOfCharacterTextMessage ? undefined : handleRoleNameClick}
                                    onDoubleClick={isOutOfCharacterTextMessage ? undefined : handleRoleNameDoubleClick}
                                    role={!isOutOfCharacterTextMessage ? "button" : undefined}
                                    tabIndex={!isOutOfCharacterTextMessage ? 0 : undefined}
                                    title={speakerDisplayName}
                                    onKeyDown={!isOutOfCharacterTextMessage
                                      ? (e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          handleRoleNameClick(e);
                                        }
                                      }
                                      : undefined}
                                  >
                                    <div className="block min-w-0 truncate">
                                      {`【${speakerDisplayName}】`}
                                    </div>
                                  </div>
                                  {formattedTime && (
                                    <span className={plainMessageTimeClassName}>
                                      {formattedTime}
                                    </span>
                                  )}
                                  {effectPreviewVisible && effectIconUrl && (
                                    <MediaImage
                                      src={`${effectIconUrl}?t=${effectPreviewToken}`}
                                      alt=""
                                      className="
                                        pointer-events-none absolute left-full
                                        -top-2
                                        sm:-top-3
                                        ml-2 size-16
                                        sm:size-20
                                        object-contain scale-150 origin-left
                                      "
                                    />
                                  )}
                                </div>
                              )
                            : (
                                <div className="
                                  relative flex min-w-0 max-w-full items-center
                                  gap-2
                                ">
                                  <div className={plainMessageNamePlaceholderClassName} aria-hidden="true">
                                    <div className="block min-w-0 truncate">【占位】</div>
                                  </div>
                                  {formattedTime && (
                                    <span className={plainMessageTimeClassName}>
                                      {formattedTime}
                                    </span>
                                  )}
                                  {effectPreviewVisible && effectIconUrl && (
                                    <MediaImage
                                      src={`${effectIconUrl}?t=${effectPreviewToken}`}
                                      alt=""
                                      className="
                                        pointer-events-none absolute left-full
                                        -top-2
                                        sm:-top-3
                                        ml-2 size-16
                                        sm:size-20
                                        object-contain scale-150 origin-left
                                      "
                                    />
                                  )}
                                </div>
                              )
                        )}
                  </div>
                  {!shouldHideOriginalContentInFullDiff && (
                    <div
                      className={`
                        relative transition-colors duration-200 rounded-lg px-1.5
                        py-0.5
                        sm:px-2 sm:py-0.5
                        cursor-pointer wrap-break-word text-base/normal
                        sm:text-sm
                        lg:text-base
                        ${
                        isOutOfCharacterTextMessage
                          ? `
                            border border-dashed border-base-content/15
                            bg-base-content/4 text-base-content/70
                          `
                          : "hover:bg-base-200/50"
                      }
                      `}
                      onClick={triggerEffectPreview}
                    >
                      {renderedContent}
                    </div>
                  )}
                  {versionDiffPreview}
                  {messageActionFallback}
                  {renderAnnotationsBar("mt-1 px-1.5 sm:mt-1.5 sm:px-2")}
                </div>
              </div>
            )}
      {isFailedMessage && (
        <div className="mt-1 flex items-center justify-end gap-1.5 pr-2 text-xs text-error">
          <span>发送失败</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-error/10"
            title="重新发送"
            aria-label="重新发送失败消息"
            onClick={handleRetryFailedMessage}
          >
            <ArrowClockwiseIcon className="size-3.5" />
            重试
          </button>
          <button
            type="button"
            className="inline-flex size-6 items-center justify-center rounded-md hover:bg-error/10"
            title="删除失败消息"
            aria-label="删除失败消息"
            onClick={handleRemoveFailedMessage}
          >
            <TrashSimpleIcon className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// 使用 React.memo 优化性能,避免不必要的重新渲染
// 只在 chatMessageResponse 的内容真正变化时才重新渲染
export const ChatBubble = React.memo(ChatBubbleComponent, (prevProps, nextProps) => {
  // 自定义比较函数:只比较消息的关键属性
  const prevMsg = prevProps.chatMessageResponse.message;
  const nextMsg = nextProps.chatMessageResponse.message;

  // 如果消息ID不同,肯定需要重新渲染
  if (prevMsg.messageId !== nextMsg.messageId) {
    return false;
  }

  // 检查所有可能影响渲染的属性
  const isEqual = (
    prevMsg.content === nextMsg.content
    && prevMsg.avatarId === nextMsg.avatarId
    && prevMsg.roleId === nextMsg.roleId
    && prevMsg.createTime === nextMsg.createTime
    && prevMsg.updateTime === nextMsg.updateTime
    && prevMsg.messageType === nextMsg.messageType
    && prevMsg.status === nextMsg.status
    && (prevMsg as { tcLocalSyncState?: string }).tcLocalSyncState === (nextMsg as { tcLocalSyncState?: string }).tcLocalSyncState
    && prevMsg.replyMessageId === nextMsg.replyMessageId
    && prevMsg.inheritedArchiveMessageId === nextMsg.inheritedArchiveMessageId
    && prevMsg.versionState === nextMsg.versionState
    && prevProps.baseVersionMessage?.message.messageId === nextProps.baseVersionMessage?.message.messageId
    && prevProps.baseVersionMessage?.message.content === nextProps.baseVersionMessage?.message.content
    && prevProps.showFullMessageDiff === nextProps.showFullMessageDiff
    && prevProps.showAddedMessageDiff === nextProps.showAddedMessageDiff
    && prevProps.useChatBubbleStyle === nextProps.useChatBubbleStyle
    && prevProps.messageAction === nextProps.messageAction
    && prevProps.onPokeMessage === nextProps.onPokeMessage
  );

  // 如果基础属性不相等,直接返回 false
  if (!isEqual) {
    return false;
  }

  const prevCommandRequestConsumed = prevProps.isCommandRequestConsumed?.(prevMsg.messageId) ?? false;
  const nextCommandRequestConsumed = nextProps.isCommandRequestConsumed?.(nextMsg.messageId) ?? false;
  if (prevCommandRequestConsumed !== nextCommandRequestConsumed) {
    return false;
  }

  const prevAnnotations = prevMsg.annotations ?? [];
  const nextAnnotations = nextMsg.annotations ?? [];
  if (prevAnnotations.length !== nextAnnotations.length) {
    return false;
  }
  for (let i = 0; i < prevAnnotations.length; i += 1) {
    if (prevAnnotations[i] !== nextAnnotations[i]) {
      return false;
    }
  }

  // 深度比较 extra 对象
  if (prevMsg.extra === nextMsg.extra) {
    // 继续检查 webgal
  }
  else if (!prevMsg.extra || !nextMsg.extra) {
    return false;
  }
  else {
    // 比较 extra 的关键属性
    const prevExtra = prevMsg.extra;
    const nextExtra = nextMsg.extra;

    if (prevExtra.imageMessage !== nextExtra.imageMessage) {
      if (!prevExtra.imageMessage || !nextExtra.imageMessage) {
        return false;
      }
      if (JSON.stringify(prevExtra.imageMessage.source) !== JSON.stringify(nextExtra.imageMessage.source)
        || prevExtra.imageMessage.background !== nextExtra.imageMessage.background
        || prevExtra.imageMessage.width !== nextExtra.imageMessage.width
        || prevExtra.imageMessage.height !== nextExtra.imageMessage.height) {
        return false;
      }
    }

    if (prevExtra.fileMessage !== nextExtra.fileMessage) {
      if (!prevExtra.fileMessage && !nextExtra.fileMessage) {
        // 都没有,继续检查其他属性
      }
      else if (!prevExtra.fileMessage || !nextExtra.fileMessage) {
        return false;
      }
      else if (prevExtra.fileMessage.fileId !== nextExtra.fileMessage.fileId
        || prevExtra.fileMessage.mediaType !== nextExtra.fileMessage.mediaType) {
        return false;
      }
    }

    if (JSON.stringify(prevExtra.forwardMessage) !== JSON.stringify(nextExtra.forwardMessage)) {
      return false;
    }

    if (JSON.stringify(prevExtra.soundMessage) !== JSON.stringify(nextExtra.soundMessage)) {
      return false;
    }

    if (JSON.stringify((prevExtra as any).videoMessage) !== JSON.stringify((nextExtra as any).videoMessage)) {
      return false;
    }

    if (JSON.stringify(prevExtra.diceResult) !== JSON.stringify(nextExtra.diceResult)) {
      return false;
    }

    if (JSON.stringify((prevExtra as any).diceTurn) !== JSON.stringify((nextExtra as any).diceTurn)) {
      return false;
    }

    if (JSON.stringify((prevExtra as any).commandRequest) !== JSON.stringify((nextExtra as any).commandRequest)) {
      return false;
    }
  }

  // 检查 webgal 设置
  const prevWebgal = prevMsg.webgal as any;
  const nextWebgal = nextMsg.webgal as any;
  if (JSON.stringify(prevWebgal) !== JSON.stringify(nextWebgal)) {
    return false;
  }

  return true;
});

ChatBubble.displayName = "ChatBubble";

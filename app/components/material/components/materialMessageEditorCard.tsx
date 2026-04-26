import type { MouseEvent } from "react";
import type { UserRole } from "../../../../api";
import type { RoomContextType } from "@/components/chat/core/roomContext";
import type { ChatInputAreaHandle } from "@/components/chat/input/chatInputArea";
import type { MessageDraft, MessageDraftIdentity } from "@/types/messageDraft";
import { TrashIcon } from "@phosphor-icons/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { RoomContext } from "@/components/chat/core/roomContext";
import { ExpressionChooser } from "@/components/chat/input/expressionChooser";
import TextStyleToolbar from "@/components/chat/input/textStyleToolbar";
import MessageAnnotationsBar from "@/components/chat/message/annotations/messageAnnotationsBar";
import { openMessageAnnotationPicker } from "@/components/chat/message/annotations/openMessageAnnotationPicker";
import EditableMessageContent from "@/components/chat/message/editableMessageContent";
import {
  CHAT_MESSAGE_ANNOTATIONS_CLASS,
  CHAT_MESSAGE_BUBBLE_DEFAULT_CLASS,
  CHAT_MESSAGE_HOVER_TOOLBAR_CLASS,
  CHAT_MESSAGE_META_ROW_CLASS,
  CHAT_MESSAGE_ROW_CLASS,
} from "@/components/chat/message/messageCardStyle";
import MessageContentRenderer from "@/components/chat/message/messageContentRenderer";
import { useRoomPreferenceStore } from "@/components/chat/stores/roomPreferenceStore";
import { getDisplayRoleName } from "@/components/chat/utils/roleDisplayName";
import RoleAvatarComponent from "@/components/common/roleAvatar";
import toastWindow from "@/components/common/toastWindow/toastWindow";
import { Edit2Outline, EmojiIconWhite, NarratorIcon } from "@/icons";
import {
  ANNOTATION_IDS,
  areAnnotationsEqual,
  hasAnnotation,
  normalizeAnnotations,
  toggleAnnotation,
} from "@/types/messageAnnotations";
import { MESSAGE_TYPE } from "@/types/voiceRenderTypes";
import { getScreenSize } from "@/utils/getScreenSize";
import { isRoleNotFoundApiError } from "@/utils/roleApiError";
import { useGetRoleQuery } from "../../../../api/hooks/RoleAndAvatarHooks";

interface MaterialMessageEditorCardProps {
  message: MessageDraft;
  index: number;
  availableRoles: UserRole[];
  fallbackRoleId: number;
  fallbackAvatarId: number;
  onChange: (updater: (message: MessageDraft) => MessageDraft) => void;
  onDelete: () => void;
  onAdoptIdentity?: (identity: MessageDraftIdentity) => void;
}

function resolveDefaultAvatarId(roles: UserRole[], roleId: number) {
  if (roleId <= 0) {
    return -1;
  }
  const role = roles.find(item => item.roleId === roleId);
  return typeof role?.avatarId === "number" && role.avatarId > 0 ? role.avatarId : -1;
}

export default function MaterialMessageEditorCard({
  message,
  index,
  availableRoles,
  fallbackRoleId,
  fallbackAvatarId,
  onChange,
  onDelete,
  onAdoptIdentity,
}: MaterialMessageEditorCardProps) {
  const normalizedRoleId = typeof message.roleId === "number" ? message.roleId : 0;
  const normalizedAvatarId = typeof message.avatarId === "number" ? message.avatarId : -1;
  const annotations = useMemo(() => {
    const base = normalizeAnnotations(message.annotations);
    if (message.messageType === MESSAGE_TYPE.IMG && (message.extra as any)?.imageMessage?.background) {
      return base.includes(ANNOTATION_IDS.BACKGROUND) ? base : [...base, ANNOTATION_IDS.BACKGROUND];
    }
    return base;
  }, [message.annotations, message.extra, message.messageType]);
  const useRoleRequest = useGetRoleQuery(normalizedRoleId > 0 ? normalizedRoleId : -1);
  const role = useRoleRequest.data?.data;
  const roleDeleted = isRoleNotFoundApiError(useRoleRequest.error);
  const isIntroText = message.messageType === MESSAGE_TYPE.INTRO_TEXT;
  const hasExplicitIdentity = normalizedRoleId !== 0 || Boolean(message.customRoleName?.trim());
  const showIdentity = hasExplicitIdentity && !isIntroText;
  const isNarrator = normalizedRoleId < 0;
  const displayRoleName = getDisplayRoleName({
    roleId: normalizedRoleId,
    roleName: role?.roleName,
    customRoleName: message.customRoleName,
    isIntroText,
    fallback: roleDeleted ? "角色已删除" : "",
  });
  const [isEditingRoleName, setIsEditingRoleName] = useState(false);
  const [editingRoleName, setEditingRoleName] = useState("");
  const [isEditingContent, setIsEditingContent] = useState(false);
  const editInputRef = useRef<ChatInputAreaHandle | null>(null);
  const isMobile = getScreenSize() === "sm";
  const useChatBubbleStyle = useRoomPreferenceStore(state => state.useChatBubbleStyle);
  const canEditContent = message.messageType === MESSAGE_TYPE.TEXT
    || message.messageType === MESSAGE_TYPE.INTRO_TEXT
    || message.messageType === MESSAGE_TYPE.DICE;
  const canShowTextStyleToolbar = isEditingContent && canEditContent;
  const textStyleToolbar = canShowTextStyleToolbar
    ? (
        <TextStyleToolbar
          chatInputRef={editInputRef}
          visible={canShowTextStyleToolbar}
          className="text-style-toolbar"
        />
      )
    : null;

  const roomContextValue = useMemo<RoomContextType>(() => ({
    roomId: undefined,
    roomMembers: [],
    curMember: undefined,
    roomRolesThatUserOwn: availableRoles,
    curRoleId: normalizedRoleId,
    curAvatarId: normalizedAvatarId,
    spaceId: undefined,
    useChatBubbleStyle,
    chatHistory: undefined,
    scrollToGivenMessage: undefined,
    jumpToMessageInWebGAL: undefined,
    updateAndRerenderMessageInWebGAL: undefined,
    rerenderHistoryInWebGAL: undefined,
    sendMessageWithInsert: undefined,
  }), [availableRoles, normalizedAvatarId, normalizedRoleId, useChatBubbleStyle]);

  const updateMessage = useCallback((updater: (current: MessageDraft) => MessageDraft) => {
    onChange((current) => {
      const next = updater(current);
      return {
        ...next,
        extra: next.extra ?? {},
      };
    });
  }, [onChange]);

  const updateMessageIdentity = useCallback((nextRoleId: number, nextAvatarId: number) => {
    const nextMessage: MessageDraft = {
      ...message,
      roleId: nextRoleId > 0 ? nextRoleId : (nextRoleId < 0 ? -1 : undefined),
      avatarId: nextRoleId > 0
        ? (nextAvatarId > 0 ? nextAvatarId : undefined)
        : undefined,
    };
    updateMessage(() => nextMessage);
    onAdoptIdentity?.({
      roleId: nextMessage.roleId,
      avatarId: nextMessage.avatarId,
      customRoleName: nextMessage.customRoleName,
    });
  }, [message, onAdoptIdentity, updateMessage]);

  const openExpressionChooser = useCallback(function openExpressionChooser(fullScreen: boolean) {
    toastWindow(
      onClose => (
        <RoomContext value={roomContextValue}>
          <div className={fullScreen ? "flex h-full min-h-0 flex-col" : "flex flex-col"}>
            <ExpressionChooser
              roleId={normalizedRoleId}
              handleExpressionChange={(avatarId) => {
                updateMessageIdentity(normalizedRoleId > 0 ? normalizedRoleId : fallbackRoleId, avatarId);
                onClose();
              }}
              handleRoleChange={(roleId) => {
                const nextAvatarId = roleId > 0
                  ? resolveDefaultAvatarId(availableRoles, roleId)
                  : -1;
                updateMessageIdentity(roleId, nextAvatarId);
              }}
              showNarratorOption={false}
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
  }, [
    availableRoles,
    fallbackRoleId,
    normalizedRoleId,
    roomContextValue,
    updateMessageIdentity,
  ]);

  const handleAvatarClick = useCallback(() => {
    openExpressionChooser(isMobile);
  }, [isMobile, openExpressionChooser]);

  const handleRoleNameClick = useCallback(() => {
    setEditingRoleName((message.customRoleName ?? role?.roleName ?? "").trim());
    setIsEditingRoleName(true);
  }, [message.customRoleName, role?.roleName]);

  const handleRoleNameSave = useCallback(() => {
    const trimmedName = editingRoleName.trim();
    updateMessage((current) => {
      const nextMessage = {
        ...current,
        customRoleName: trimmedName || undefined,
      };
      onAdoptIdentity?.({
        roleId: nextMessage.roleId,
        avatarId: nextMessage.avatarId,
        customRoleName: nextMessage.customRoleName,
      });
      return nextMessage;
    });
    setIsEditingRoleName(false);
  }, [editingRoleName, onAdoptIdentity, updateMessage]);

  const handleContentUpdate = useCallback((content: string) => {
    updateMessage(current => ({
      ...current,
      content,
    }));
  }, [updateMessage]);

  const handleDiceContentUpdate = useCallback((content: string) => {
    updateMessage(current => ({
      ...current,
      content,
      extra: {
        ...(current.extra ?? {}),
        diceResult: { result: content },
      },
    }));
  }, [updateMessage]);

  const handleUpdateAnnotations = useCallback((next: string[]) => {
    const nextAnnotations = normalizeAnnotations(next);
    const annotationsChanged = !areAnnotationsEqual(message.annotations, nextAnnotations);
    if (message.messageType === MESSAGE_TYPE.IMG && (message.extra as any)?.imageMessage) {
      const currentExtra = (message.extra ?? {}) as Record<string, any>;
      const currentImageMessage = currentExtra.imageMessage ?? {};
      const nextBackground = hasAnnotation(nextAnnotations, ANNOTATION_IDS.BACKGROUND);
      const currentBackground = Boolean(currentImageMessage.background);
      if (!annotationsChanged && nextBackground === currentBackground) {
        return;
      }
      updateMessage(current => ({
        ...current,
        annotations: nextAnnotations,
        extra: {
          ...(current.extra ?? {}),
          imageMessage: {
            ...(((current.extra ?? {}) as Record<string, any>).imageMessage ?? {}),
            background: nextBackground,
          },
        },
      }));
      return;
    }
    if (!annotationsChanged) {
      return;
    }
    updateMessage(current => ({
      ...current,
      annotations: nextAnnotations,
    }));
  }, [message.annotations, message.extra, message.messageType, updateMessage]);

  const handleToggleAnnotation = useCallback((id: string) => {
    handleUpdateAnnotations(toggleAnnotation(annotations, id));
  }, [annotations, handleUpdateAnnotations]);

  const handleOpenAnnotations = useCallback(() => {
    openMessageAnnotationPicker({
      initialSelected: annotations,
      onChange: handleUpdateAnnotations,
    });
  }, [annotations, handleUpdateAnnotations]);

  const handleToggleNarrator = useCallback(() => {
    if (normalizedRoleId <= 0) {
      const nextRoleId = fallbackRoleId > 0 ? fallbackRoleId : 0;
      const nextAvatarId = nextRoleId > 0
        ? (fallbackAvatarId > 0 ? fallbackAvatarId : resolveDefaultAvatarId(availableRoles, nextRoleId))
        : -1;
      updateMessageIdentity(nextRoleId, nextAvatarId);
      return;
    }
    updateMessageIdentity(-1, -1);
  }, [
    availableRoles,
    fallbackAvatarId,
    fallbackRoleId,
    normalizedRoleId,
    updateMessageIdentity,
  ]);

  const shouldIgnoreEditBlur = useCallback((target: EventTarget | null) => {
    const element = target as HTMLElement | null;
    if (!element) {
      return false;
    }
    return Boolean(element.closest(".text-style-toolbar") || element.closest(".modal"));
  }, []);

  const handleEditMessageClick = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window === "undefined") {
      return;
    }
    const target = document.querySelector(
      `[data-material-message-index="${index}"] .editable-field`,
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
  }, [index]);

  const renderedContent = (() => {
    if (message.messageType === MESSAGE_TYPE.TEXT) {
      return (
        <EditableMessageContent
          content={message.content ?? ""}
          onCommit={handleContentUpdate}
          className="editable-field whitespace-pre-wrap break-words"
          editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded-[8px] w-full"
          onEditingChange={setIsEditingContent}
          editInputRef={editInputRef}
          shouldIgnoreBlur={shouldIgnoreEditBlur}
          canEdit={true}
        />
      );
    }

    if (message.messageType === MESSAGE_TYPE.INTRO_TEXT) {
      return (
        <EditableMessageContent
          content={message.content ?? ""}
          onCommit={handleContentUpdate}
          className="editable-field whitespace-pre-wrap break-words"
          editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded-[8px] w-full"
          onEditingChange={setIsEditingContent}
          editInputRef={editInputRef}
          shouldIgnoreBlur={shouldIgnoreEditBlur}
          canEdit={true}
        />
      );
    }

    if (message.messageType === MESSAGE_TYPE.DICE) {
      const diceResult = ((message.extra ?? {}) as Record<string, any>).diceResult;
      const result = diceResult?.result || message.content || "";
      return (
        <div className="relative text-sm">
          <span className="badge badge-accent badge-xs absolute right-0 top-0">骰娘</span>
          <div className="pr-10 pt-1">
            <EditableMessageContent
              content={result}
              onCommit={handleDiceContentUpdate}
              className="editable-field whitespace-pre-wrap break-words"
              editorClassName="min-w-[18rem] sm:min-w-[26rem] bg-transparent border-0 rounded-[8px] w-full"
              onEditingChange={setIsEditingContent}
              editInputRef={editInputRef}
              shouldIgnoreBlur={shouldIgnoreEditBlur}
              canEdit={true}
            />
          </div>
        </div>
      );
    }

    return (
      <MessageContentRenderer
        message={{
          ...message,
          content: message.content ?? "",
          messageId: index + 1,
          messageType: message.messageType ?? MESSAGE_TYPE.TEXT,
          roomId: undefined,
          status: 0,
        }}
        annotations={annotations}
        cacheKeyBase={`material-editor:${index}`}
      />
    );
  })();

  const messageHoverToolbar = (
    <div className={CHAT_MESSAGE_HOVER_TOOLBAR_CLASS}>
      <button
        type="button"
        className="btn btn-ghost btn-xs h-7 w-7 min-h-0 rounded-full p-0 text-base-content/70 hover:bg-base-300/70 hover:text-base-content"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleOpenAnnotations();
        }}
        title="添加标注"
        aria-label="添加标注"
      >
        <EmojiIconWhite className="h-4 w-4" />
      </button>
      {showIdentity && (
        <button
          type="button"
          className="btn btn-ghost btn-xs h-7 w-7 min-h-0 rounded-full p-0 text-base-content/70 hover:bg-base-300/70 hover:text-base-content"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleToggleNarrator();
          }}
          title={isNarrator ? "恢复角色" : "切为旁白"}
          aria-label={isNarrator ? "恢复角色" : "切为旁白"}
        >
          <NarratorIcon className="h-4 w-4" />
        </button>
      )}
      {canEditContent && (
        <button
          type="button"
          className="btn btn-ghost btn-xs h-7 w-7 min-h-0 rounded-full p-0 text-base-content/70 hover:bg-base-300/70 hover:text-base-content"
          onClick={handleEditMessageClick}
          title="编辑"
          aria-label="编辑"
        >
          <Edit2Outline className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        className="btn btn-ghost btn-xs h-7 w-7 min-h-0 rounded-full p-0 text-base-content/70 hover:bg-error/10 hover:text-error"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDelete();
        }}
        title="删除素材条目"
        aria-label="删除素材条目"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );

  const roleNameEditor = (
    <div className="flex items-center gap-1">
      <input
        type="text"
        className={`input ${useChatBubbleStyle ? "input-xs px-2" : "input-sm px-3"} input-bordered w-40 bg-base-200 border-base-300 shadow-sm focus:outline-none focus:border-info`}
        value={editingRoleName}
        onChange={e => setEditingRoleName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleRoleNameSave();
          }
          if (e.key === "Escape") {
            setIsEditingRoleName(false);
          }
        }}
        placeholder="输入角色名"
        autoFocus
      />
      <button type="button" className={`btn ${useChatBubbleStyle ? "btn-xs" : "btn-sm"} btn-primary`} onClick={handleRoleNameSave}>✓</button>
      <button type="button" className={`btn ${useChatBubbleStyle ? "btn-xs" : "btn-sm"} btn-ghost`} onClick={() => setIsEditingRoleName(false)}>✕</button>
    </div>
  );

  const bubbleRoleNameNode = showIdentity
    ? (
        <button
          type="button"
          className="block min-w-0 truncate pb-0.5 text-left text-sm font-medium text-base-content/85 transition-colors hover:text-primary sm:pb-1"
          onClick={handleRoleNameClick}
        >
          {displayRoleName}
        </button>
      )
    : null;

  const classicRoleNameNode = showIdentity
    ? (
        <div
          className="text-sm sm:text-base min-w-0 flex-shrink font-semibold cursor-pointer transition-all duration-200 hover:text-primary"
          onClick={handleRoleNameClick}
        >
          <div className="truncate">{`【${displayRoleName}】`}</div>
        </div>
      )
    : null;

  const annotationsBar = (
    <MessageAnnotationsBar
      annotations={annotations}
      canEdit={true}
      onToggle={handleToggleAnnotation}
      onOpenPicker={handleOpenAnnotations}
      showWhenEmpty={true}
      alwaysShowAddButton={true}
      showAddButton={true}
      compact={isMobile}
      className={useChatBubbleStyle ? CHAT_MESSAGE_ANNOTATIONS_CLASS : "mt-1.5"}
    />
  );

  return (
    <div className="group relative" data-material-message-index={index}>
      {textStyleToolbar}
      {useChatBubbleStyle
        ? (
            <div className={CHAT_MESSAGE_ROW_CLASS}>
              {messageHoverToolbar}
              {showIdentity && (
                <div className="shrink-0 cursor-pointer" onClick={handleAvatarClick}>
                  {isNarrator
                    ? (
                        <div className={`flex items-center justify-center rounded-full bg-base-200/60 ${isMobile ? "h-10 w-10" : "h-12 w-12"}`}>
                          <NarratorIcon className="h-4 w-4 text-base-content/70" />
                        </div>
                      )
                    : (
                        <RoleAvatarComponent
                          avatarId={normalizedAvatarId > 0 ? normalizedAvatarId : 0}
                          roleId={normalizedRoleId > 0 ? normalizedRoleId : undefined}
                          width={isMobile ? 10 : 12}
                          isRounded={true}
                          withTitle={false}
                          stopToastWindow={true}
                          useDefaultAvatarFallback={false}
                        />
                      )}
                </div>
              )}

              <div className="flex min-w-0 flex-1 flex-col items-start">
                {showIdentity && (
                  <div className={CHAT_MESSAGE_META_ROW_CLASS}>
                    {isEditingRoleName ? roleNameEditor : bubbleRoleNameNode}
                  </div>
                )}

                <div className={CHAT_MESSAGE_BUBBLE_DEFAULT_CLASS}>
                  {renderedContent}
                </div>

                {annotationsBar}
              </div>
            </div>
          )
        : (
            <div className="flex w-full py-1.5 sm:py-2 relative">
              {messageHoverToolbar}
              {showIdentity && (
                <div className="shrink-0 pr-2 sm:pr-3">
                  <div
                    className="w-9 h-9 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-md overflow-hidden cursor-pointer"
                    onClick={handleAvatarClick}
                  >
                    {isNarrator
                      ? (
                          <div className="w-full h-full flex items-center justify-center bg-base-200/60">
                            <NarratorIcon className="w-5 h-5 text-base-content/70" />
                          </div>
                        )
                      : (
                          <RoleAvatarComponent
                            avatarId={normalizedAvatarId > 0 ? normalizedAvatarId : 0}
                            roleId={normalizedRoleId > 0 ? normalizedRoleId : undefined}
                            width={isMobile ? 10 : 20}
                            isRounded={false}
                            withTitle={false}
                            stopToastWindow={true}
                            useDefaultAvatarFallback={false}
                          />
                        )}
                  </div>
                </div>
              )}

              <div className="flex-1 min-w-0 p-0.5 sm:p-1 pr-2 sm:pr-5">
                {showIdentity && (
                  <div className="flex items-center w-full gap-2 sm:pr-80 relative">
                    {isEditingRoleName ? roleNameEditor : classicRoleNameNode}
                  </div>
                )}

                <div className="relative transition-all duration-200 rounded-lg p-1.5 sm:p-2 break-words text-base sm:text-sm lg:text-base hover:bg-base-200/50">
                  {renderedContent}
                </div>

                {annotationsBar}
              </div>
            </div>
          )}
    </div>
  );
}

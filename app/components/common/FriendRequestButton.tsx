import type { Ref } from "react";
import { UserPlusIcon } from "@phosphor-icons/react";
import { useCheckFriendQuery, useSendFriendRequestMutation } from "api/hooks/friendQueryHooks";
import { useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useGlobalUserId } from "@/components/globalContextProvider";

type FriendRequestButtonVariant = "button" | "menu-item";

interface FriendRequestButtonProps {
  targetUserId?: number | null;
  targetUsername?: string | null;
  className?: string;
  variant?: FriendRequestButtonVariant;
  showIcon?: boolean;
  first?: boolean;
  firstItemRef?: Ref<HTMLButtonElement>;
  onAfterClick?: () => void;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === "object") {
    const anyError = error as any;
    const body = anyError?.body;
    const errMsg = body?.errMsg ?? body?.message ?? anyError?.errMsg ?? anyError?.message;
    if (typeof errMsg === "string" && errMsg.trim()) {
      return errMsg.trim();
    }
  }

  return "好友申请发送失败";
}

function getButtonLabel({
  actionLabel,
  isChecking,
  isSending,
  isFriend,
  status,
}: {
  actionLabel: string;
  isChecking: boolean;
  isSending: boolean;
  isFriend?: boolean;
  status?: number;
}) {
  if (isSending)
    return "发送中...";
  if (isChecking)
    return "查询中...";
  if (isFriend || status === 2)
    return "已是好友";
  if (status === 1)
    return "已申请";
  if (status === 3)
    return "已拉黑";
  return actionLabel;
}

export function FriendRequestButton({
  targetUserId,
  targetUsername,
  className,
  variant = "button",
  showIcon = true,
  first = false,
  firstItemRef,
  onAfterClick,
}: FriendRequestButtonProps) {
  const dialogId = useId();
  const loginUserId = useGlobalUserId() ?? -1;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("你好，我想加你为好友");
  const validTargetUserId = typeof targetUserId === "number" && targetUserId > 0 ? targetUserId : -1;
  const isSelf = validTargetUserId === loginUserId;
  const friendCheckQuery = useCheckFriendQuery(validTargetUserId, validTargetUserId > 0 && !isSelf);
  const sendFriendRequestMutation = useSendFriendRequestMutation();

  const friendCheck = friendCheckQuery.data?.data;
  const isChecking = friendCheckQuery.isLoading && !friendCheck;
  const isBlocked = friendCheck?.status === 3;
  const isPending = friendCheck?.status === 1;
  const isFriend = friendCheck?.isFriend === true || friendCheck?.status === 2;
  const isRelationshipStatus = isFriend || isPending || isBlocked;
  const actionLabel = variant === "menu-item" ? "发送好友申请" : "加好友";
  const label = getButtonLabel({
    actionLabel,
    isChecking,
    isSending: sendFriendRequestMutation.isPending,
    isFriend,
    status: friendCheck?.status,
  });
  const disabled = validTargetUserId <= 0
    || isSelf
    || isChecking
    || sendFriendRequestMutation.isPending
    || isFriend
    || isPending
    || isBlocked;

  const dialogSubtitle = useMemo(() => {
    const displayName = targetUsername?.trim();
    return displayName
      ? `向 ${displayName} 发送申请`
      : `向 UID ${validTargetUserId} 发送申请`;
  }, [targetUsername, validTargetUserId]);

  function openDialog() {
    if (disabled || validTargetUserId <= 0) {
      return;
    }
    setVerifyMsg("你好，我想加你为好友");
    setIsDialogOpen(true);
  }

  async function handleSendFriendRequest() {
    const trimmedVerifyMsg = verifyMsg.trim();
    if (!trimmedVerifyMsg || validTargetUserId <= 0) {
      return;
    }

    try {
      await sendFriendRequestMutation.mutateAsync({
        targetUserId: validTargetUserId,
        verifyMsg: trimmedVerifyMsg,
      });
      toast.success("好友申请已发送");
      setIsDialogOpen(false);
      onAfterClick?.();
    }
    catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  if (isSelf) {
    return null;
  }

  const portalTarget = typeof document === "undefined" ? null : document.body;
  const dialog = isDialogOpen && portalTarget
    ? createPortal(
        <div
          className="
            fixed inset-0 z-[1000] flex items-center justify-center bg-black/35
            p-4
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${dialogId}-title`}
          onClick={(event) => {
            if (event.target === event.currentTarget && !sendFriendRequestMutation.isPending) {
              setIsDialogOpen(false);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !sendFriendRequestMutation.isPending) {
              setIsDialogOpen(false);
            }
          }}
        >
          <form
            className="
              w-full max-w-sm rounded-lg border border-base-300 bg-base-100 p-4
              shadow-xl
            "
            onSubmit={(event) => {
              event.preventDefault();
              void handleSendFriendRequest();
            }}
          >
            <h3 id={`${dialogId}-title`} className="text-base font-semibold">发送好友申请</h3>
            <p className="mt-1 text-sm text-base-content/60">{dialogSubtitle}</p>
            <label htmlFor={`${dialogId}-verify`} className="
              mt-4 block text-sm font-medium
            ">
              验证信息
            </label>
            <textarea
              id={`${dialogId}-verify`}
              className="
                textarea textarea-bordered mt-2 min-h-24 w-full resize-none
                text-sm
              "
              value={verifyMsg}
              onChange={event => setVerifyMsg(event.target.value)}
              disabled={sendFriendRequestMutation.isPending}

            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-sm"
                disabled={sendFriendRequestMutation.isPending}
                onClick={() => setIsDialogOpen(false)}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-sm btn-primary"
                disabled={sendFriendRequestMutation.isPending || verifyMsg.trim().length === 0}
              >
                {sendFriendRequestMutation.isPending ? "发送中..." : "发送"}
              </button>
            </div>
          </form>
        </div>,
        portalTarget,
      )
    : null;

  if (variant === "menu-item") {
    return (
      <>
        <li>
          <button
            ref={first ? firstItemRef : undefined}
            type="button"
            className={`
              ${className ?? "justify-start w-full text-left"}
              whitespace-nowrap
            `}
            disabled={disabled}
            onClick={openDialog}
          >
            {showIcon && !isRelationshipStatus && <UserPlusIcon className="
              size-4 shrink-0
            " weight="regular" />}
            <span className="whitespace-nowrap">{label}</span>
          </button>
        </li>
        {dialog}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`
          ${className ?? `
            btn btn-sm flex h-8 items-center gap-2 border border-gray-300 px-3
            hover:text-primary
          `}
          whitespace-nowrap
        `}
        disabled={disabled}
        onClick={openDialog}
        aria-label={label}
      >
        {showIcon && !isRelationshipStatus && <UserPlusIcon className="
          size-4 shrink-0
        " weight="regular" />}
        <span className="whitespace-nowrap text-sm">{label}</span>
      </button>
      {dialog}
    </>
  );
}

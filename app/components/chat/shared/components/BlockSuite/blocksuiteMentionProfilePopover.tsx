import type { UserProfileInfoResponse } from "../../../../../../api/models/UserProfileInfoResponse";
import type { BlocksuiteMentionProfilePopoverState } from "./blocksuiteMentionProfilePopover.shared";
import { ArrowSquareOut, CircleNotch, UserCircle } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGetUserProfileQuery } from "../../../../../../api/hooks/UserHooks";
import UserStatusDot from "../../../../common/userStatusBadge.jsx";
import {
  buildBlocksuiteMentionPopoverPosition,
  getBlocksuiteMentionProfileHref,
} from "./blocksuiteMentionProfilePopover.shared";

export function BlocksuiteMentionProfileCardView(props: {
  userId: string;
  href: string;
  user: UserProfileInfoResponse | null;
  isLoading: boolean;
  isError: boolean;
}) {
  const { userId, href, user, isLoading, isError } = props;
  const username = user?.username?.trim() || "未知用户";
  const description = user?.description?.trim() || "这个人还没有填写个人简介。";
  const avatar = user?.avatarThumbUrl?.trim() || user?.avatar?.trim() || "";

  return (
    <div className="flex h-full flex-col bg-base-100 text-base-content">
      <div className="flex items-start justify-between gap-3 border-b border-base-300/80 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-base-content/50">Mention Profile</p>
          <p className="mt-1 text-sm text-base-content/70">
            UID
            {" "}
            {userId}
          </p>
        </div>
        <a
          href={href}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-base-300 bg-base-100 text-base-content/70 transition hover:border-primary/40 hover:text-primary"
          aria-label="打开个人主页"
        >
          <ArrowSquareOut size={18} weight="bold" />
        </a>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-base-300 bg-base-200">
              {avatar
                ? (
                    <img src={avatar} alt={username} className="h-full w-full object-cover" />
                  )
                : (
                    <UserCircle size={42} className="text-base-content/35" weight="duotone" />
                  )}
            </div>
            <UserStatusDot
              status={user?.activeStatus}
              size="sm"
              className="absolute right-0 bottom-0 ring-2 ring-base-100"
            />
          </div>

          <div className="min-w-0 flex-1">
            {isLoading
              ? (
                  <div className="space-y-2 pt-1">
                    <div className="h-5 w-28 animate-pulse rounded-md bg-base-200" />
                    <div className="h-4 w-full animate-pulse rounded-md bg-base-200" />
                    <div className="h-4 w-2/3 animate-pulse rounded-md bg-base-200" />
                  </div>
                )
              : (
                  <>
                    <a href={href} className="block truncate text-lg font-semibold hover:text-primary">
                      {username}
                    </a>
                    <p className="mt-2 line-clamp-4 text-sm leading-6 text-base-content/75">
                      {isError ? "用户资料加载失败，请点击右上角进入主页重试。" : description}
                    </p>
                  </>
                )}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between rounded-md border border-base-300/80 bg-base-200/35 px-3 py-2 text-xs text-base-content/65">
          <span>{isError ? "资料暂不可用" : "资料来自宿主页面查询"}</span>
          {isLoading
            ? (
                <span className="inline-flex items-center gap-1.5">
                  <CircleNotch size={14} className="animate-spin" />
                  加载中
                </span>
              )
            : (
                <a href={href} className="font-medium text-primary hover:underline">
                  查看完整资料
                </a>
              )}
        </div>
      </div>
    </div>
  );
}

export function BlocksuiteMentionProfilePopover(props: {
  state: BlocksuiteMentionProfilePopoverState | null;
  onRequestClose: () => void;
  onHoverChange?: (hovered: boolean) => void;
}) {
  const { state, onRequestClose, onHoverChange } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const numericUserId = Number.parseInt(state?.userId ?? "0", 10);
  const profileQuery = useGetUserProfileQuery(numericUserId, {
    enabled: Number.isFinite(numericUserId) && numericUserId > 0,
    staleTime: 5 * 60 * 1000,
  });
  const href = getBlocksuiteMentionProfileHref(state?.userId ?? "0");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted)
      return;
    if (!state)
      return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onRequestClose();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root)
        return;
      if (e.target instanceof Node && root.contains(e.target))
        return;
      onRequestClose();
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [mounted, onRequestClose, state]);

  const style = useMemo(() => {
    if (!state)
      return null;
    const { top, left, width, height } = buildBlocksuiteMentionPopoverPosition(state.anchorRect, 420, 360);
    return {
      position: "fixed" as const,
      top,
      left,
      width,
      height,
      // 需要盖住 blocksuite iframe/画布。全屏时也会进入新的 stacking context，尽量用足够大的值。
      zIndex: 2147483000,
    };
  }, [state]);

  if (!mounted)
    return null;
  if (!state || !style)
    return null;
  if (typeof document === "undefined")
    return null;

  const docAny = document as any;
  // 关键：浏览器 Fullscreen API 生效时，只有 fullscreenElement 及其后代会被渲染。
  // 如果 portal 到 body，就会“存在但看不见”，退出全屏才会看到。
  const fullscreenEl: Element | null = docAny.fullscreenElement
    ?? docAny.webkitFullscreenElement
    ?? docAny.msFullscreenElement
    ?? null;
  const portalTarget = fullscreenEl ?? document.body;

  return createPortal(
    <div
      ref={rootRef}
      style={style}
      className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-2xl"
      onPointerEnter={() => onHoverChange?.(true)}
      onPointerLeave={() => onHoverChange?.(false)}
    >
      <BlocksuiteMentionProfileCardView
        userId={state.userId}
        href={href}
        user={profileQuery.data?.data ?? null}
        isLoading={profileQuery.isLoading}
        isError={profileQuery.isError}
      />
    </div>,
    portalTarget,
  );
}

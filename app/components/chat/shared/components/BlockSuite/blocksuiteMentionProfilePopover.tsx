import type { UserProfileInfoResponse } from "@tuanchat/openapi-client/models/UserProfileInfoResponse";
import type { UserRole } from "@tuanchat/openapi-client/models/UserRole";
import type { BlocksuiteMentionProfilePopoverState } from "./blocksuiteMentionProfilePopover.shared";
import { ArrowSquareOut, CircleNotch, UserCircle } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGetRoleQuery } from "../../../../../../api/hooks/RoleAndAvatarHooks";
import { useGetUserProfileQuery } from "../../../../../../api/hooks/UserHooks";
import { RoleDetailPagePopup } from "../../../../common/roleDetailPagePopup";
import { ToastWindow } from "../../../../common/toastWindow/ToastWindowComponent";
import UserStatusDot from "../../../../common/userStatusBadge.jsx";
import { getScreenSize } from "@/utils/getScreenSize";
import {
  buildBlocksuiteMentionPopoverPosition,
  getBlocksuiteMentionProfileHref,
} from "./blocksuiteMentionProfilePopover.shared";

function getRoleTypeLabel(type: number | undefined) {
  if (type === 1)
    return "骰娘";
  if (type === 2)
    return "NPC";
  return "角色";
}

function isNpcRole(role: UserRole | null | undefined) {
  return role?.type === 2 || role?.npc === true;
}

export function BlocksuiteMentionProfileCardView(props:
  | {
    kind: "user";
    userId: string;
    href: string;
    user: UserProfileInfoResponse | null;
    isLoading: boolean;
    isError: boolean;
  }
  | {
    kind: "role";
    roleId: string;
    href: string | null;
    role: UserRole | null;
    isLoading: boolean;
    isError: boolean;
    onOpenRoleDetail?: () => void;
  }) {
  if (props.kind === "role") {
    const { roleId, href, role, isLoading, isError, onOpenRoleDetail } = props;
    const roleName = role?.roleName?.trim() || "未知角色";
    const description = role?.description?.trim() || "这个角色还没有填写简介。";
    const avatar = role?.avatarThumbUrl?.trim() || role?.avatarUrl?.trim() || "";
    const typeLabel = getRoleTypeLabel(role?.type);
    const isNpc = isNpcRole(role);
    const shouldOpenPopup = isNpc || !href;
    const roleActionLabel = shouldOpenPopup ? "查看 NPC 详情" : "查看角色详情";

    return (
      <div className="flex h-full flex-col bg-base-100 text-base-content">
        <div className="flex items-start justify-between gap-3 border-b border-base-300/80 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-base-content/50">提及角色</p>
            <p className="mt-1 text-sm text-base-content/70">
              RID
              {" "}
              {roleId}
            </p>
          </div>
          {shouldOpenPopup
            ? (
                <button
                  type="button"
                  onClick={onOpenRoleDetail}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-base-300 bg-base-100 text-base-content/70 transition hover:border-primary/40 hover:text-primary"
                  aria-label={shouldOpenPopup ? "打开 NPC 详情" : "打开角色详情"}
                >
                  <ArrowSquareOut size={18} weight="bold" />
                </button>
              )
            : (
                <a
                  href={href}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-base-300 bg-base-100 text-base-content/70 transition hover:border-primary/40 hover:text-primary"
                  aria-label="打开角色详情"
                >
                  <ArrowSquareOut size={18} weight="bold" />
                </a>
              )}
        </div>

        <div className="flex flex-1 flex-col gap-4 px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-base-300 bg-base-200">
              {avatar
                ? (
                    <img src={avatar} alt={roleName} className="h-full w-full object-cover" />
                  )
                : (
                    <UserCircle size={42} className="text-base-content/35" weight="duotone" />
                  )}
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
                      <div className="flex flex-wrap items-center gap-2">
                        {shouldOpenPopup
                          ? (
                              <button
                                type="button"
                                onClick={onOpenRoleDetail}
                                className="block min-w-0 truncate text-left text-lg font-semibold hover:text-primary"
                              >
                                {roleName}
                              </button>
                            )
                          : (
                              <a href={href ?? undefined} className="block min-w-0 truncate text-lg font-semibold hover:text-primary">
                                {roleName}
                              </a>
                            )}
                        <span className="rounded-full border border-base-300 px-2 py-0.5 text-xs text-base-content/60">
                          {typeLabel}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-4 text-sm leading-6 text-base-content/75">
                        {isError ? "角色资料加载失败，请点击右上角进入详情页重试。" : description}
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
                  shouldOpenPopup
                    ? (
                        <button type="button" onClick={onOpenRoleDetail} className="font-medium text-primary hover:underline">
                          {roleActionLabel}
                        </button>
                      )
                    : (
                        <a href={href ?? undefined} className="font-medium text-primary hover:underline">
                          查看角色详情
                        </a>
                      )
                )}
          </div>
        </div>
      </div>
    );
  }

  const { userId, href, user, isLoading, isError } = props;
  const username = user?.username?.trim() || "未知用户";
  const description = user?.description?.trim() || "这个人还没有填写个人简介。";
  const avatar = user?.avatarThumbUrl?.trim() || user?.avatar?.trim() || "";

  return (
    <div className="flex h-full flex-col bg-base-100 text-base-content">
      <div className="flex items-start justify-between gap-3 border-b border-base-300/80 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-base-content/50">提及用户</p>
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
  const [roleDetailTarget, setRoleDetailTarget] = useState<{
    roleId: number;
    roleTypeHint?: number;
    roleOwnerUserIdHint?: number;
  } | null>(null);
  const numericTargetId = Number.parseInt(state?.targetId ?? "0", 10);
  const isUserTarget = state?.targetKind === "user";
  const isRoleTarget = state?.targetKind === "role";
  const profileQuery = useGetUserProfileQuery(numericTargetId, {
    enabled: isUserTarget && Number.isFinite(numericTargetId) && numericTargetId > 0,
    staleTime: 5 * 60 * 1000,
  });
  const roleQuery = useGetRoleQuery(isRoleTarget && Number.isFinite(numericTargetId) && numericTargetId > 0 ? numericTargetId : -1);
  const href = state
    ? getBlocksuiteMentionProfileHref(state)
    : getBlocksuiteMentionProfileHref({ targetKind: "user", targetId: "0" });
  const userHref = href ?? "/profile/0";

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
  const currentRole = roleQuery.data?.data ?? null;
  const popoverState = state;
  const popoverStyle = style;

  return createPortal(
    <>
      {popoverState && popoverStyle
        ? (
            <div
              ref={rootRef}
              style={popoverStyle}
              className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-2xl"
              onPointerEnter={() => onHoverChange?.(true)}
              onPointerLeave={() => onHoverChange?.(false)}
            >
              {popoverState.targetKind === "role"
                ? (
                    <BlocksuiteMentionProfileCardView
                      kind="role"
                      roleId={popoverState.targetId}
                      href={href}
                      role={currentRole}
                      isLoading={roleQuery.isLoading}
                      isError={roleQuery.isError}
                      onOpenRoleDetail={() => {
                        const roleId = Number.parseInt(popoverState.targetId, 10);
                        if (!Number.isFinite(roleId) || roleId <= 0) {
                          return;
                        }
                        setRoleDetailTarget({
                          roleId,
                          roleTypeHint: currentRole?.type,
                          roleOwnerUserIdHint: currentRole?.userId,
                        });
                        onRequestClose();
                      }}
                    />
                  )
                : (
                    <BlocksuiteMentionProfileCardView
                      kind="user"
                      userId={popoverState.targetId}
                      href={userHref}
                      user={profileQuery.data?.data ?? null}
                      isLoading={profileQuery.isLoading}
                      isError={profileQuery.isError}
                    />
                  )}
            </div>
          )
        : null}
      <ToastWindow
        isOpen={Boolean(roleDetailTarget)}
        onClose={() => setRoleDetailTarget(null)}
        fullScreen={getScreenSize() === "sm"}
      >
        <div className="justify-center w-full">
          <RoleDetailPagePopup
            roleId={roleDetailTarget?.roleId ?? -1}
            roleTypeHint={roleDetailTarget?.roleTypeHint}
            roleOwnerUserIdHint={roleDetailTarget?.roleOwnerUserIdHint}
            onClose={() => setRoleDetailTarget(null)}
          />
        </div>
      </ToastWindow>
    </>,
    portalTarget,
  );
}


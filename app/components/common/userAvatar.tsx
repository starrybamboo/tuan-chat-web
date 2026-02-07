import { use, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router";
import { RoomContext } from "@/components/chat/core/roomContext";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import { UserDetail } from "@/components/common/userDetail";

import { useGlobalContext } from "@/components/globalContextProvider";
import { useGetSpaceMembersQuery } from "../../../api/hooks/chatQueryHooks";
import { useGetUserInfoQuery } from "../../../api/hooks/UserHooks";

// 如果是 import 的sizeMap 就不能在className中用了, 于是复制了一份, 够丑的 :(
const sizeMap = {
  6: "w-6 h-6", // 24px
  8: "w-8 h-8", // 32px
  10: "w-10 h-10", // 40px
  12: "w-12 h-12", // 48px
  18: "w-18 h-18", // 72px
  20: "w-20 h-20", // 80px
  24: "w-24 h-24", // 96px
  30: "w-30 h-30", // 120px
  32: "w-32 h-32", // 128px
  36: "w-36 h-36", // 144px
} as const;

/**
 * 用户头像组件
 * Props:
 *  - userId: 用户ID
 *  - width: 头像宽度尺寸 key
 *  - isRounded: 是否圆形
 *  - withName: 是否显示用户名
 *  - stopToastWindow: 是否禁止悬浮弹窗（只控制弹窗显示）
 *  - clickEnterProfilePage: 点击头像是否跳转个人主页（只控制点击行为）
 *  - uniqueKey: 弹窗唯一标识
 */
export default function UserAvatarComponent({
  userId,
  width,
  isRounded,
  withName = false,
  stopToastWindow = false,
  uniqueKey,
  clickEnterProfilePage = true,
}: {
  userId: number;
  width: keyof typeof sizeMap; // 头像的宽度
  isRounded: boolean; // 是否是圆的
  withName?: boolean; // 是否显示名字
  stopToastWindow?: boolean; // hover 是否会产生userDetail弹窗
  uniqueKey?: string; // 用于控制弹窗的唯一key，默认是userId
  clickEnterProfilePage?: boolean; // 点击头像是否直接个人主页
}) {
  const userQuery = useGetUserInfoQuery(userId);
  // 控制用户详情的toastWindow
  const toastWindowKey = uniqueKey ? `userPop${uniqueKey}` : `userPop${userId}`;

  // 改为内部 hover 状态，不再放到 URL 上
  // 兼容旧的 searchParam，不再使用，仅保持读取避免影响外部 URL
  useSearchParamsState<boolean>(toastWindowKey, false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasMountedDetail, setHasMountedDetail] = useState(false); // 首次点击后再加载内容
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; placement: "right" | "left" } | null>(null);

  const { spaceId: urlSpaceId } = useParams();
  const spaceId = Number(urlSpaceId);
  // 仅用于在弹窗中可能需要的上下文信息（当前不再直接使用成员状态进行操作）
  useGetSpaceMembersQuery(spaceId);
  use(RoomContext); // 仍保持对上下文的订阅以便未来扩展
  useGlobalContext();

  // 成员管理逻辑已迁移到 MemberLists 组件，保留最小数据上下文

  // hover 逻辑：悬停打开，移出后延迟关闭；允许在 Portal 内容上保持
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const OPEN_DELAY = 120; // ms
  const CLOSE_DELAY = 180; // ms

  const clearTimers = () => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const doOpen = () => {
    setHasMountedDetail(true);
    setIsOpen(true);
  };
  const doClose = () => setIsOpen(false);

  // 悬浮逻辑：只受 stopToastWindow 控制
  const handleMouseEnter = () => {
    if (stopToastWindow)
      return; // 不显示弹窗
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (isOpen)
      return; // 已打开
    openTimerRef.current = window.setTimeout(doOpen, OPEN_DELAY);
  };

  const handleMouseLeave = () => {
    if (stopToastWindow)
      return;
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    closeTimerRef.current = window.setTimeout(doClose, CLOSE_DELAY);
  };

  // 点击跳转逻辑：只受 clickEnterProfilePage 控制
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!clickEnterProfilePage)
      return; // 不响应点击跳转
    e.stopPropagation();
    window.location.href = `/profile/${userId}`;
  }, [clickEnterProfilePage, userId]);

  // 根据 clickEnterProfilePage 决定是否添加点击样式
  const containerClass = `relative inline-flex ${withName ? "flex-row items-center gap-2" : "flex-col items-center"} group ${clickEnterProfilePage ? "cursor-pointer" : ""}`;

  // 计算定位：优先右侧，不够则左侧
  const recompute = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const cardW = 360; // 约等于 22rem (352) + margin
    const cardH = 420; // 估计高度，后续用 ResizeObserver 可更精确
    const gap = 8;
    let placement: "right" | "left" = "right";
    let left = rect.right + gap;
    if (left + cardW > viewportW) {
      // 尝试左侧
      if (rect.left - gap - cardW > 0) {
        placement = "left";
        left = rect.left - gap - cardW;
      }
      else {
        // clamp 到窗口内
        left = Math.min(Math.max(8, viewportW - cardW - 8), left);
      }
    }
    let top = rect.top + (rect.height / 2) - cardH / 2;
    top = Math.min(Math.max(8, top), viewportH - cardH - 8);
    setPos({ left, top, placement });
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      recompute();
    }
  }, [isOpen, recompute]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handler = () => recompute();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [isOpen, recompute]);

  // 外部点击与 ESC 关闭
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onDocClick = (e: MouseEvent) => {
      const anchor = anchorRef.current;
      const portalNode = portalRef.current;
      if (
        (anchor && (anchor === e.target || anchor.contains(e.target as Node)))
        || (portalNode && portalNode.contains(e.target as Node))
      ) {
        return;
      }
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  // 卸载前清理 timer
  useEffect(() => () => clearTimers(), []);

  // Portal 容器
  useEffect(() => {
    if (!portalRef.current) {
      const div = document.createElement("div");
      div.setAttribute("data-avatar-portal", "");
      document.body.appendChild(div);
      portalRef.current = div;
    }
    return () => {
      // 不删除以复用
    };
  }, []);

  return (
    <div
      ref={anchorRef}
      className={containerClass}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="avatar">
        <div className={`${sizeMap[width]} rounded${isRounded ? "-full" : ""}`}>
          <img
            src={userQuery.isPending || userQuery.error || !userQuery.data?.data?.avatar ? undefined : userQuery.data?.data?.avatar}
            alt="Avatar"
            className={`transition-transform ${clickEnterProfilePage ? "hover:scale-110" : ""}`}
          />
        </div>
      </div>
      {withName && (
        <div
          className={`text-sm whitespace-nowrap min-w-0 ${(userQuery.data?.data?.username ?? "").length > 8 ? "truncate max-w-[10em]" : ""} ${clickEnterProfilePage ? "hover:underline" : ""}`}
        >
          {userQuery.data?.data?.username}
        </div>
      )}
      {/* Portal 卡片：只受 stopToastWindow 控制 */}
      {portalRef.current && hasMountedDetail && isOpen && !stopToastWindow && pos && createPortal(
        <div
          style={{
            position: "fixed",
            left: pos.left,
            top: pos.top,
            zIndex: 9999,
          }}
          className={`group/avatar-card transition transform origin-${pos.placement === "right" ? "left" : "right"} animate-in fade-in zoom-in duration-150`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <UserDetail userId={userId} />
        </div>,
        portalRef.current,
      )}
    </div>
  );
}

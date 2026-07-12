import type React from "react";

import { UserCirclePlusIcon } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useMemo } from "react";

import type { PrivateChatTab } from "@/components/chat/chatPageLayoutContext";

import { useChatPageLayoutContext } from "@/components/chat/chatPageLayoutContext";
import { privateChatTabIndicatorMotionProps } from "@/components/common/motion/privateChatMotion";
import { RoomChatIcon } from "@/icons";
import { useGetFriendRequestPageQuery } from "api/hooks/friendQueryHooks";

export default function PrivateChatTopTabs() {
  const { privateChatTab, setPrivateChatTab } = useChatPageLayoutContext();

  const friendRequestPageQuery = useGetFriendRequestPageQuery({ pageNo: 1, pageSize: 50 });
  const hasPendingRequests = useMemo(() => {
    const list = friendRequestPageQuery.data?.data?.list || [];
    return list.some((r: any) => r?.type === "received" && r?.status === 1);
  }, [friendRequestPageQuery.data]);

  const tabs: { id: PrivateChatTab; label: string; badge?: boolean; icon: React.ReactNode }[] = [
    { id: "chat", label: "私聊", icon: <RoomChatIcon className="size-4" /> },
    { id: "new-friends", label: "新朋友", badge: hasPendingRequests, icon: <UserCirclePlusIcon className="
      size-4
    " weight="regular" /> },
  ];

  return (
    <nav className="
      flex shrink-0 flex-col gap-1 border-b border-base-300 px-2 py-2
      dark:border-base-300
    " aria-label="私信导航">
      {tabs.map((tab) => {
        const isActive = privateChatTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={isActive}
            className={[
              "relative flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-medium transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info/50",
              isActive
                ? "bg-base-300/70 text-info shadow-sm dark:bg-base-300/50"
                : "text-base-content/60 hover:bg-base-200/60 hover:text-base-content dark:hover:bg-base-300/30",
            ].join(" ")}
            onClick={() => setPrivateChatTab(tab.id)}
          >
            {isActive && (
              <motion.span
                layoutId="private-chat-active-tab"
                className="absolute inset-0 rounded-md ring-1 ring-info/30"
                transition={privateChatTabIndicatorMotionProps}
              />
            )}
            <span className="relative z-10 shrink-0 opacity-80">{tab.icon}</span>
            <span className="relative z-10 min-w-0 flex-1 truncate">{tab.label}</span>
            {tab.badge && (
              <motion.span
                className="relative z-10 h-2 w-2 shrink-0 rounded-full bg-error"
                aria-label="有待处理请求"
                animate={{ scale: [1, 1.35, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

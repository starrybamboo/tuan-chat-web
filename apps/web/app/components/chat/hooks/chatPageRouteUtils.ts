import type { SpaceDetailTab } from "@/components/chat/chatPage.types";
import type { PrivateChatTab } from "@/components/chat/chatPageLayoutContext";

import { SPACE_DETAIL_TABS } from "@/components/chat/chatPage.types";
import { parseSpaceDocId } from "@/components/chat/infra/doc/space/spaceDocId";
import { appendPathQuery } from "@/utils/pathQuery";

export type DocRouteInfo = {
  decodedDocId: string | null;
  activeDocId: string | null;
  isInvalidSpaceDocId: boolean;
};

export function getDocRouteInfo(params: { isDocRoute: boolean; rawDocId?: string }): DocRouteInfo {
  const rawDocId = typeof params.rawDocId === "string" ? params.rawDocId : "";
  if (!params.isDocRoute || !rawDocId) {
    return {
      decodedDocId: null,
      activeDocId: null,
      isInvalidSpaceDocId: false,
    };
  }

  const decoded = decodeURIComponent(rawDocId);

  if (/^\d+$/.test(decoded)) {
    const id = Number(decoded);
    if (Number.isFinite(id) && id > 0) {
      return {
        decodedDocId: decoded,
        activeDocId: decoded,
        isInvalidSpaceDocId: false,
      };
    }
  }

  const parsed = parseSpaceDocId(decoded);
  if (parsed?.kind !== "independent") {
    return {
      decodedDocId: decoded,
      activeDocId: null,
      isInvalidSpaceDocId: true,
    };
  }

  return {
    decodedDocId: decoded,
    activeDocId: decoded,
    isInvalidSpaceDocId: false,
  };
}

export function parsePositiveNumber(value?: string): number | null {
  if (!value)
    return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0)
    return null;
  return numeric;
}

export function getSpaceDetailRouteTab(params: {
  isPrivateChatMode: boolean;
  urlMessageId?: string;
  urlRoomId?: string;
}): SpaceDetailTab | null {
  if (params.isPrivateChatMode || params.urlMessageId)
    return null;
  if (!params.urlRoomId)
    return null;
  const maybeTab = params.urlRoomId as SpaceDetailTab;
  return SPACE_DETAIL_TABS.has(maybeTab) ? maybeTab : null;
}

export function getIsRoomSettingRoute(params: {
  activeRoomId: number | null;
  isDocRoute: boolean;
  pathname: string;
  roomSettingMatched: boolean;
}) {
  if (params.isDocRoute) {
    return false;
  }

  if (params.roomSettingMatched) {
    return true;
  }

  return params.activeRoomId != null && params.pathname.endsWith("/setting");
}

/**
 * 将私聊页的 tab 查询参数映射为页面状态。
 * 未显式指定或遇到未知值时，默认进入私聊首页。
 */
export function resolvePrivateChatTab(tabParam?: string | null): PrivateChatTab {
  if (tabParam === "new-friends")
    return "new-friends";
  return "chat";
}

/**
 * 具体私聊会话路由优先展示聊天面板，避免列表 tab 残留到 `/chat/private/:roomId`。
 */
export function resolvePrivateChatTabForRoute(params: {
  activeRoomId?: number | null;
  tabParam?: string | null;
}): PrivateChatTab {
  if (typeof params.activeRoomId === "number" && params.activeRoomId > 0) {
    return "chat";
  }
  return resolvePrivateChatTab(params.tabParam);
}

export function buildPrivateChatRoomPath(
  roomId: number,
  searchParams: URLSearchParams,
  targetMessageId?: number | null,
) {
  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.delete("tab");
  const messagePath = targetMessageId ? `/${targetMessageId}` : "";
  return appendPathQuery(`/chat/private/${roomId}${messagePath}`, nextSearchParams);
}

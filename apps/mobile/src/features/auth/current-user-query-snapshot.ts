import { getMyUserInfoQueryKey } from "@tuanchat/query/users";

import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
} from "../../lib/use-mobile-query-snapshot";

const CURRENT_USER_QUERY_SNAPSHOT_VERSION = 1;
const CURRENT_USER_QUERY_SNAPSHOT_SCOPE = "current-user-profile";

type CurrentUserQuerySnapshotContext = {
  isAuthenticated: boolean;
  userId?: number | null;
};

/** 构造按账号隔离且不过期的当前用户资料恢复快照配置。 */
export function createCurrentUserQuerySnapshotOptions(context: CurrentUserQuerySnapshotContext) {
  return {
    enabled: canUseMobileUserScopedSnapshot(context),
    key: createMobileQuerySnapshotKey([
      CURRENT_USER_QUERY_SNAPSHOT_SCOPE,
      CURRENT_USER_QUERY_SNAPSHOT_VERSION,
      getMyUserInfoQueryKey(),
    ]),
    scope: CURRENT_USER_QUERY_SNAPSHOT_SCOPE,
    ttlMs: null,
    userId: context.userId,
  } as const;
}

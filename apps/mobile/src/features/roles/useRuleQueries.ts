import type { Rule } from "@tuanchat/openapi-client/models/Rule";

import {
  getRuleDetailQueryKey,
  getRulePageQueryKey,
  useRuleDetailQuery as useSharedRuleDetailQuery,
  useRulePageQuery as useSharedRulePageQuery,
} from "@tuanchat/query/rules";

import { useAuthSession } from "@/features/auth/auth-session";
import { mobileApiClient } from "@/lib/api";
import {
  canUseMobileUserScopedSnapshot,
  createMobileQuerySnapshotKey,
  useMobileQuerySnapshot,
} from "@/lib/use-mobile-query-snapshot";

const RULE_PAGE_SNAPSHOT_TTL_MS = 10 * 60_000;
const RULE_DETAIL_SNAPSHOT_TTL_MS = 30 * 60_000;

type RulePageSnapshot = {
  list: Rule[];
  meta?: {
    isLast?: boolean;
    pageNo?: number;
    pageSize?: number;
    totalRecords?: number;
  };
};

export function useRulePageQuery(page: number, keyword?: string, pageSize?: number, options?: { enabled?: boolean }) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = options?.enabled ?? true;
  const query = useSharedRulePageQuery(mobileApiClient, page, keyword, pageSize, {
    ...options,
    enabled,
  });
  const snapshotSourceQuery: Omit<typeof query, "data"> & { data: RulePageSnapshot | undefined } = {
    ...query,
    data: {
      list: query.data ?? [],
      meta: query.meta,
    },
  };
  const snapshotQuery = useMobileQuerySnapshot<RulePageSnapshot, typeof snapshotSourceQuery>(
    snapshotSourceQuery,
    {
      enabled: canUseMobileUserScopedSnapshot({
        enabled,
        isAuthenticated,
        userId: session?.userId,
      }),
      key: createMobileQuerySnapshotKey(getRulePageQueryKey(page, keyword, pageSize)),
      scope: "rule-page",
      ttlMs: RULE_PAGE_SNAPSHOT_TTL_MS,
      userId: session?.userId,
    },
  ) as Omit<typeof query, "data"> & {
    data: RulePageSnapshot | undefined;
    isLoading: boolean;
    isPending: boolean;
    isRestoredFromSnapshot: boolean;
  };

  return {
    ...snapshotQuery,
    data: snapshotQuery.data?.list ?? [],
    meta: snapshotQuery.data?.meta,
  };
}

export function useRuleDetailQuery(ruleId: number, options?: { enabled?: boolean }) {
  const { isAuthenticated, session } = useAuthSession();
  const enabled = (options?.enabled ?? true) && ruleId > 0;
  const query = useSharedRuleDetailQuery(mobileApiClient, ruleId, {
    ...options,
    enabled,
  });

  return useMobileQuerySnapshot(query, {
    enabled: canUseMobileUserScopedSnapshot({
      enabled,
      isAuthenticated,
      userId: session?.userId,
    }),
    key: createMobileQuerySnapshotKey(getRuleDetailQueryKey(ruleId)),
    scope: "rule-detail",
    ttlMs: RULE_DETAIL_SNAPSHOT_TTL_MS,
    userId: session?.userId,
  });
}

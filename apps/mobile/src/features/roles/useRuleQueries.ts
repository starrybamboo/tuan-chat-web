import {
  useRuleDetailQuery as useSharedRuleDetailQuery,
  useRulePageQuery as useSharedRulePageQuery,
} from "@tuanchat/query/rules";

import { mobileApiClient } from "@/lib/api";

export function useRulePageQuery(page: number, keyword?: string, pageSize?: number) {
  return useSharedRulePageQuery(mobileApiClient, page, keyword, pageSize);
}

export function useRuleDetailQuery(ruleId: number, options?: { enabled?: boolean }) {
  return useSharedRuleDetailQuery(mobileApiClient, ruleId, options);
}

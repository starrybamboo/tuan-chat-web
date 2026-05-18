import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import type { Rule } from "@tuanchat/openapi-client/models/Rule";
import type { TuanChat } from "@tuanchat/openapi-client/TuanChat";

type RuleClient = Pick<TuanChat, "ruleController">;

export function getRulePageQueryKey(page: number, keyword?: string, pageSize?: number) {
  return ["rules", { page, keyword, pageSize }] as const;
}

export function getRuleDetailQueryKey(ruleId: number) {
  return ["ruleDetail", ruleId] as const;
}

async function fetchRulePage(
  client: RuleClient,
  page: number,
  keyword?: string,
  pageSize: number = 8,
) {
  const res = await client.ruleController.getRulePage({
    pageNo: page,
    pageSize,
    keyword,
  });
  const list = (res.success && res.data?.list) ? (res.data.list as Rule[]) : ([] as Rule[]);
  const meta = {
    pageNo: res.data?.pageNo,
    pageSize: res.data?.pageSize,
    totalRecords: res.data?.totalRecords,
    isLast: res.data?.isLast,
  };
  return { list, meta };
}

export function useRulePageQuery(
  client: RuleClient,
  page: number,
  keyword?: string,
  pageSize: number = 8,
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: getRulePageQueryKey(page, keyword, pageSize),
    queryFn: () => fetchRulePage(client, page, keyword, pageSize),
    placeholderData: (previousData) => previousData,
    staleTime: 10_000,
  });

  const isLast = query.data?.meta?.isLast;

  useEffect(() => {
    if (isLast) return;
    queryClient.prefetchQuery({
      queryKey: getRulePageQueryKey(page + 1, keyword, pageSize),
      queryFn: () => fetchRulePage(client, page + 1, keyword, pageSize),
    });
  }, [page, keyword, pageSize, isLast, queryClient, client]);

  return {
    ...query,
    data: query.data?.list ?? ([] as Rule[]),
    meta: query.data?.meta,
  };
}

export function useRuleDetailQuery(
  client: RuleClient,
  ruleId: number,
  options: { enabled?: boolean } = {},
) {
  return useQuery<Rule>({
    queryKey: getRuleDetailQueryKey(ruleId),
    queryFn: async () => {
      const res = await client.ruleController.getRuleDetail(ruleId);
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error("获取规则详情失败");
    },
    enabled: (options.enabled ?? true) && ruleId > 0,
    staleTime: 300_000,
  });
}

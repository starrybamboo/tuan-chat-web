import { useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import type {RuleCloneRequest} from "../models/RuleCloneRequest";
import type {RuleCreateRequest} from "../models/RuleCreateRequest";
import type {RulePageRequest} from "../models/RulePageRequest";
import type {RuleUpdateRequest} from "../models/RuleUpdateRequest";
import type {Rule} from "../models/Rule";
import type { PageBaseRespRuleResponse } from "../models/PageBaseRespRuleResponse";

import {tuanchat} from "../instance";

/**
 * 更新规则
 */
export function useUpdateRuleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RuleUpdateRequest) => tuanchat.ruleController.updateRule(req),
        mutationKey: ['updateRule'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getRulePage'] });
            queryClient.invalidateQueries({ queryKey: ['getRuleDetail'] });
        }
    });
}

/**
 * 分页获取规则列表
 * 支持通过关键词搜索规则名称或描述
 * @param requestBody 分页请求参数
 * @param pageSize 每页大小，默认为10
 */
export function useGetRulePageInfiniteQuery(
    requestBody: RulePageRequest,
    pageSize: number = 10
) {
    return useInfiniteQuery({
        queryKey: ["getRulePage", requestBody],
        queryFn: async ({ pageParam }) => {
            const params = { ...requestBody, ...pageParam };
            return tuanchat.ruleController.getRulePage(params);
        },
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.data?.isLast) {
                return undefined;
            }
            return {
                ...requestBody,
                pageSize,
                pageNo: allPages.length + 1,
            };
        },
        initialPageParam: {
            ...requestBody,
            pageSize,
            pageNo: 1,
        } as RulePageRequest,
        staleTime: 30000, // 30秒缓存
        refetchOnWindowFocus: false,
    });
}

/**
 * 创建规则
 */
export function useCreateRuleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RuleCreateRequest) => tuanchat.ruleController.createRule(req),
        mutationKey: ['createRule'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getRulePage'] });
        }
    });
}

/**
 * 克隆规则
 */
export function useCloneRuleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: RuleCloneRequest) => tuanchat.ruleController.cloneRule(req),
        mutationKey: ['cloneRule'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getRulePage'] });
        }
    });
}

/**
 * 获取规则详情
 * @param ruleId 规则ID
 */
export function useGetRuleDetailQuery(ruleId: number) {
    return useQuery({
        queryKey: ['getRuleDetail', ruleId],
        queryFn: () => tuanchat.ruleController.getRuleDetail(ruleId),
        staleTime: 300000, // 5分钟缓存
        enabled: ruleId > 0 // 只有ruleId有效时才启用查询
    });
}
export function useGetRuleDetailQueries(ruleIds: number[]) {
    return useQueries({
        queries: ruleIds.map(ruleId => ({
            queryKey: ['getRuleDetail', ruleId],
            queryFn: () => tuanchat.ruleController.getRuleDetail(ruleId),
            staleTime: 300000,
            enabled: ruleId > 0
        }))
    });
}

/**
 * 删除规则
 */
export function useDeleteRuleMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (ruleId: number) => tuanchat.ruleController.deleteRule(ruleId),
        mutationKey: ['deleteRule'],
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['getRulePage'] });
            queryClient.invalidateQueries({ queryKey: ['getRuleDetail'] });
      // 兼容规则选择/列表等其它 queryKey
      queryClient.invalidateQueries({ queryKey: ['rules'] });
      queryClient.invalidateQueries({ queryKey: ['ruleList'] });
      queryClient.invalidateQueries({ queryKey: ['ruleDetail'] });
        }
    });
}

// 获取规则详情角色界面
export function useRuleDetailQuery(ruleId: number, options?: { enabled?: boolean }) {
    return useQuery({
      queryKey: ["ruleDetail", ruleId],
      queryFn: async (): Promise<Rule> => {
        const res = await tuanchat.ruleController.getRuleDetail(ruleId)
        if (res.success && res.data) {
          return res.data;
        }
        throw new Error('获取规则详情失败');
      },
      enabled: options?.enabled ?? true, // 默认启用，但允许通过 options 禁用
    })
  }

/**
 * 获取规则列表查询选项配置
 * 用于预取和条件查询
 * @param page 页码
 * @param keyword 搜索关键词
 * @param pageSize 每页大小
 */
function getRulesQueryOptions(page: number, keyword?: string, pageSize: number = 4, authorId?: number) {
  return {
    queryKey: ['rules', { page, keyword, pageSize, authorId }] as const,
    queryFn: () => fetchRules(page, keyword, pageSize, authorId),
    staleTime: 10 * 1000, // 10秒缓存
  };
}

/**
 * 获取规则列表（带分页和搜索）
 */
async function fetchRules(page: number, keyword?: string, pageSize: number = 4, authorId?: number) {
  const res = await tuanchat.ruleController.getRulePage({
    pageNo: page,
    pageSize,
    keyword,
    authorId,
  });
  const list = (res.success && res.data?.list) ? (res.data.list as unknown as Rule[]) : ([] as Rule[]);
  const meta: Pick<PageBaseRespRuleResponse, 'pageNo' | 'pageSize' | 'totalRecords' | 'isLast'> = {
    pageNo: res.data?.pageNo,
    pageSize: res.data?.pageSize,
    totalRecords: res.data?.totalRecords,
    isLast: res.data?.isLast,
  };
  return { list, meta };
}

/**
 * 使用规则列表 Hook（自动预取下一页）
 * @param page 页码
 * @param keyword 搜索关键词
 * @param pageSize 每页大小
 */
export function useRulePageQuery(page: number, keyword?: string, pageSize: number = 8) {
  const queryClient = useQueryClient();

  const query = useQuery({
    ...getRulesQueryOptions(page, keyword, pageSize),
    placeholderData: (previousData) => previousData, // 保持上一页数据避免闪烁
  });

  const isLast = query.data?.meta?.isLast;

  useEffect(() => {
    // 自动预取下一页数据，提升用户体验
    if (isLast) {
      return;
    }
    queryClient.prefetchQuery(getRulesQueryOptions(page + 1, keyword, pageSize));
  }, [page, keyword, pageSize, isLast, queryClient]);

  return {
    ...query,
    data: query.data?.list ?? ([] as Rule[]),
    meta: query.data?.meta,
  };
}

/**
 * 使用规则列表 Hook（Suspense 版本，自动预取下一页）
 * 使用 Suspense 边界处理加载状态，更符合 React 18+ 的模式
 * @param page 页码
 * @param keyword 搜索关键词
 * @param pageSize 每页大小
 * @param authorId 作者id
 */
export function useRulePageSuspenseQuery(page: number, keyword?: string, pageSize: number = 8, authorId?: number) {
  const queryClient = useQueryClient();

  const query = useSuspenseQuery({
    ...getRulesQueryOptions(page, keyword, pageSize, authorId),
  });

  const isLast = query.data?.meta?.isLast;

  useEffect(() => {
    // 自动预取下一页数据，提升用户体验
    if (isLast) {
      return;
    }
    queryClient.prefetchQuery(getRulesQueryOptions(page + 1, keyword, pageSize, authorId));
  }, [page, keyword, pageSize, authorId, isLast, queryClient]);

  return {
    ...query,
    data: query.data.list,
    meta: query.data.meta,
  };
}

export function useRuleListQuery() {
  return useQuery({
    queryKey: ["ruleList"],
    queryFn: async (): Promise<Rule[]> => {
      const res = await tuanchat.ruleController.getRulePage({ pageNo: 1, pageSize: 100 });
      if (res.success && res.data?.list) {
        return res.data.list;
      }
      throw new Error('获取规则列表失败');
    },
    staleTime: 300000, // 5分钟缓存
  });
}
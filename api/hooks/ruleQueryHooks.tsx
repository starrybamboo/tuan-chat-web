import {keepPreviousData, useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient} from "@tanstack/react-query";
import type {RuleCloneRequest} from "../models/RuleCloneRequest";
import type {RuleCreateRequest} from "../models/RuleCreateRequest";
import type {RulePageRequest} from "../models/RulePageRequest";
import type {RuleUpdateRequest} from "../models/RuleUpdateRequest";
import type {ApiResultLong} from "../models/ApiResultLong";
import type {ApiResultPageBaseRespRuleResponse} from "../models/ApiResultPageBaseRespRuleResponse";
import type {ApiResultRule} from "../models/ApiResultRule";
import type {ApiResultVoid} from "../models/ApiResultVoid";
import type {Rule} from "../models/Rule";

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
            if (!lastPage.data?.isLast) {
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

// 分页获取规则（useQuery 版本）
export function useRulePageQuery(params: RulePageRequest) {
    return useQuery<Rule[], Error>({
        queryKey: ["ruleList", params],
        queryFn: async (): Promise<Rule[]> => {
            const res = await tuanchat.ruleController.getRulePage(params);
            if (res.success && res.data?.list) {
                return res.data.list;
            }
            return [] as Rule[];
        },
        staleTime: 30_000,
        // 在翻页/搜索时保留上一页数据避免闪烁（React Query v5）
        placeholderData: keepPreviousData,
    });
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
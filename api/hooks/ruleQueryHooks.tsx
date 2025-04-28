import {useMutation, useQueries, useQuery, useQueryClient} from "@tanstack/react-query";
import type {RuleCloneRequest} from "../models/RuleCloneRequest";
import type {RuleCreateRequest} from "../models/RuleCreateRequest";
import type {RulePageRequest} from "../models/RulePageRequest";
import type {RuleUpdateRequest} from "../models/RuleUpdateRequest";
import type {ApiResultLong} from "../models/ApiResultLong";
import type {ApiResultPageBaseRespRuleResponse} from "../models/ApiResultPageBaseRespRuleResponse";
import type {ApiResultRule} from "../models/ApiResultRule";
import type {ApiResultVoid} from "../models/ApiResultVoid";
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
 * @param requestBody 分页请求参数
 */
export function useGetRulePageQuery(requestBody: RulePageRequest) {
    return useQuery({
        queryKey: ['getRulePage', requestBody],
        queryFn: () => tuanchat.ruleController.getRulePage(requestBody),
        staleTime: 300000 // 5分钟缓存
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

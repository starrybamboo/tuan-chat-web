import {useMutation, useQuery, useQueryClient, useQueries} from "@tanstack/react-query";
import type {AbilityUpdateRequest} from "../models/AbilityUpdateRequest";
import {tuanchat} from "../instance";
import type {AbilityFieldUpdateRequest} from "../models/AbilityFieldUpdateRequest";
import type {AbilitySetRequest} from "../models/AbilitySetRequest";
import type {AbilityFieldUpdateRequest2} from "../models/AbilityFieldUpdateRequest2";
import type {AbilityUpdateRequest2} from "../models/AbilityUpdateRequest2";

/**
 * 获取角色所有的ability
 */
export function useGetRoleAbilitiesQuery(roleId: number) {
    return useQuery({
        queryKey: ["listRoleAbility", roleId],
        queryFn: () => tuanchat.abilityController.listRoleAbility(roleId),
        staleTime: 10000,
        enabled: roleId > 0,
    });
}

/**
 * 批量获取多个角色的 ability（用于避免在循环中直接调用 Hook）
 */
export function useGetRolesAbilitiesQueries(roleIds: number[]) {
    const results = useQueries({
        queries: roleIds.map((roleId) => ({
            queryKey: ["listRoleAbility", roleId],
            queryFn: () => tuanchat.abilityController.listRoleAbility(roleId),
            staleTime: 10000,
            enabled: roleId > 0,
        })),
    });
    return results;
}

/**
 * 创建能力
 * 创建指定角色在指定规则下的能力信息，返回创建的能力ID
 */
export function useSetRoleAbilityMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: AbilitySetRequest) => tuanchat.abilityController.setRoleAbility(req),
        mutationKey: ["setRoleAbility"],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["listRoleAbility", variables.roleId] });
            queryClient.invalidateQueries({ queryKey: ["roleAbilityByRule"] });
        },
    });
}

export function useDeleteRoleAbilityMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (abilityId: number) => tuanchat.abilityController.deleteRoleAbility(abilityId),
        mutationKey: ["deleteRoleAbility"],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["listRoleAbility"] });
            queryClient.invalidateQueries({ queryKey: ["roleAbilityByRule"] });
        }
    })
}

export function useUpdateRoleAbilityMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: AbilityUpdateRequest) => tuanchat.abilityController.updateRoleAbility(req),
        mutationKey: ["updateRoleAbility"],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["listRoleAbility"] });
            queryClient.invalidateQueries({ queryKey: ["roleAbilityByRule"] });
        }
    })
}
export function useUpdateRoleAbilityByRoleIdMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: AbilityUpdateRequest2) => tuanchat.abilityController.updateRoleAbility1(req),
        mutationKey: ["updateRoleAbilityByRoleId"],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["listRoleAbility"] });
            queryClient.invalidateQueries({ queryKey: ["roleAbilityByRule"] });
        }
    })
}

export function useUpdateKeyFieldMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn:  (req: AbilityFieldUpdateRequest) => tuanchat.abilityController.updateRoleAbilityField(req),
        mutationKey: ["updateRoleAbilityField"],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["listRoleAbility"] });
            queryClient.invalidateQueries({ queryKey: ["roleAbilityByRule"] });
        }
    })
}
export function useUpdateKeyFieldByRoleIdMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn:  (req: AbilityFieldUpdateRequest2) => tuanchat.abilityController.updateRoleAbilityField1(req),
        mutationKey: ["updateRoleAbilityByRoleId"],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["listRoleAbility"] });
            queryClient.invalidateQueries({ queryKey: ["roleAbilityByRule"] });
        }
    })
}


// 获取能力,根据角色和规则
export function useAbilityByRuleAndRole(roleId:number,ruleId: number){
    return useQuery({
      queryKey: ["roleAbilityByRule", roleId, ruleId],
      queryFn: async () => {
        try {
          const res = await tuanchat.abilityController.getByRuleAndRole(ruleId, roleId);
          if (res.success && res.data) {
                      // 解析后端返回的 extra.copywriting 为 Record<string, string[]>
                      let extraCopywriting: Record<string, string[]> | undefined = undefined;
                      const extra = (res.data as any)?.extra as Record<string, unknown> | undefined;
                      const cw = extra && (extra as any).copywriting;
                      if (typeof cw === "string") {
                          try {
                              const parsed = JSON.parse(cw);
                              if (parsed && typeof parsed === "object") {
                                  extraCopywriting = parsed as Record<string, string[]>;
                              }
                          } catch {
                              // ignore parse errors
                          }
                      } else if (cw && typeof cw === "object") {
                          extraCopywriting = cw as Record<string, string[]>;
                      }
            return {
              abilityId : res.data.abilityId || 0 ,
              roleId: roleId,
              ruleId: ruleId,
              actTemplate: res.data.act || {}, // 表演字段
              basicDefault: res.data.basic || {}, // 基础属性
              abilityDefault: res.data.ability || {}, // 能力数据
                          skillDefault: res.data.skill || {}, // 技能数据
                          extraCopywriting,
            }
          }
          return null;
        } catch (error: any) {
          // 如果是客户端错误（4xx）或特定的"能力不存在"情况，返回空能力对象而不是抛错
          // 这样可以避免 React Query 的重试机制对不存在的资源进行多次请求
          const statusCode = error?.response?.status || error?.status;
          if (statusCode && statusCode >= 400 && statusCode < 500) {
            console.warn(`Ability not found for roleId: ${roleId}, ruleId: ${ruleId} (status: ${statusCode})`);
            return null;
          }
          // 对于服务端错误（5xx）或网络异常，重新抛错以触发重试机制
          throw error;
        }
      },
      // 仅对 4xx 客户端错误禁用重试；其他错误保留全局重试配置
      retry: (failureCount, error: any) => {
        const statusCode = error?.response?.status || error?.status;
        // 如果是 4xx 客户端错误，不重试
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          return false;
        }
        // 其他错误，保留默认重试逻辑
        return failureCount < 2;
      },
    })
  }

// ai车卡生成表演
export function useGenerateBasicInfoByRuleMutation() {
    return useMutation({
        mutationKey: ["getAiCar"],
        mutationFn: async ({ prompt, ruleId }: { prompt: string; ruleId: number }) => {
            const res = await tuanchat.roleGenerationController.generateBasicInfoByRule({
                ruleId,prompt
            });
            return res;
        }
    })
}


//ai车卡生成能力
export function useGenerateAbilityByRuleMutation() {
    return useMutation({
        mutationKey: ["getAiCarAbility"],
        mutationFn: async ({ prompt, ruleId }: { prompt: string; ruleId: number }) => {
            const res = await tuanchat.roleGenerationController.generateAbilityByRule({
                ruleId,prompt
            });
            return res;
        }
    })
}
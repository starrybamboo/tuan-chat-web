import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import type {AbilityUpdateRequest} from "../models/AbilityUpdateRequest";
import {tuanchat} from "../instance";
import type {AbilityFieldUpdateRequest} from "../models/AbilityFieldUpdateRequest";
import type {AbilitySetRequest} from "../models/AbilitySetRequest";

/**
 * 获取角色所有的ability
 */
export function useGetRoleAbilitiesQuery(roleId: number) {
    return useQuery({
        queryKey: ["listRoleAbility", roleId],
        queryFn: () => tuanchat.abilityController.listRoleAbility(roleId),
        staleTime: 10000,
    });
}

/**
 * 更新能力
 * 更新指定角色的能力信息，act和ability字段不能为null或者空json
 */
export function useGetRoleAbilityQuery(abilityId: number){
    return useQuery({
        queryKey: ["getRoleAbility", abilityId],
        queryFn: () => tuanchat.abilityController.getRoleAbility(abilityId),
        staleTime: 10000,
    });
}

/**
 * 创建能力
 * 创建指定角色在指定规则下的能力信息，返回创建的能力ID，act和ability字段不能为null或者空json
 */

export function useSetRoleAbilityMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (req: AbilitySetRequest) => tuanchat.abilityController.setRoleAbility(req),
        mutationKey: ["setRoleAbility"],
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["listRoleAbility", variables.roleId] });
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
        }
    })
}


// 获取能力,根据角色和规则
export function useAbilityByRuleAndRole(roleId:number,ruleId: number){
    return useQuery({
      queryKey: ["roleAbilityByRule", roleId, ruleId],
      queryFn: async () => {
        const res = await tuanchat.abilityController.getByRuleAndRole(ruleId, roleId);
        if (res.success && res.data) {
          return {
            id : res.data.abilityId || 0 ,
            performance: res.data.act || {}, // 表演字段
            numerical: res.data.ability || {} // 将ability包装在"0"键下作为默认约束组，很奇怪，不加这个会报类型错误，怀疑后端搞错了
            , // 数值约束
          }
        }
        return null;
      }
    })
  }

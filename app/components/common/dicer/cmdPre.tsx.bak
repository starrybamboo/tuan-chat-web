import {
  useGetRoleAbilitiesQuery,
  useSetRoleAbilityMutation,
  useUpdateKeyFieldMutation,
  useUpdateRoleAbilityMutation,
} from "api/hooks/abilityQueryHooks";

export default function useCmdPre(roleId: number, ruleId: number) {
  const abilityQuery = useGetRoleAbilitiesQuery(roleId);
  const abilityList = abilityQuery.data?.data ?? [];
  const curAbility = abilityList.find(a => a.ruleId === ruleId); // 当前规则下激活的能力组

  // // 通过以下的mutation来对后端发送引起数据变动的请求
  const updateAbilityMutation = useUpdateRoleAbilityMutation(); // 更改属性与能力字段
  const setAbilityMutation = useSetRoleAbilityMutation(); // 创建新的能力组
  const updateKeyFieldMutation = useUpdateKeyFieldMutation(); // 更新能力字段

  // 更新一组能力
  const updateAbilityGroup = (abilities: Record<string, number>) => {
    if (!curAbility)
      return;
    updateAbilityMutation.mutate({
      abilityId: curAbility.abilityId ?? -1,
      ability: { ...curAbility.ability, ...abilities },
      act: {},
    });
  };

  // 更新一个单独的能力，无法创建新能力
  const updateSingleAbility = (abilityStr: string) => {
    const [name, value] = abilityStr.split(":").map(item => item.trim());
    const num = Number.parseInt(value);
    updateAbilityMutation.mutate({
      abilityId: curAbility?.abilityId ?? -1,
      ability: { ...curAbility?.ability, [name]: num },
      act: {},
    });
  };

  // 删除一个能力
  const deleteAbility = (abilityStr: string) => {
    const name = abilityStr.trim();
    const abilityFields = { [name]: "" };
    updateKeyFieldMutation.mutate({
      abilityId: curAbility?.abilityId ?? -1,
      abilityFields,
      actFields: {},
    });
  };

  // 更新全部能力
  const updateFullAbility = (abilities: Record<string, number>) => {
    // 如果已存在全部能力就更新, 不然创建
    if (curAbility) {
      updateAbilityMutation.mutate({
        abilityId: curAbility.abilityId ?? -1,
        ability: abilities,
        act: {},
      });
    }
    else {
      setAbilityMutation.mutate({
        roleId,
        ruleId,
        act: {},
        ability: abilities,
      });
    }
  };

  return {
    curAbility,
    updateSingleAbility,
    updateAbilityGroup,
    updateFullAbility,
    deleteAbility,
  };
}

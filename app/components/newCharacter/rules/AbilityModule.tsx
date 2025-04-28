import {
  useDeleteRoleAbilityMutation,
  useGetRoleAbilityByRuleQuery,
  useSetRoleAbilityMutation,
  useUpdateRoleAbilityMutation,
} from "api/queryHooks";
import { useEffect, useState } from "react";
import Section from "../Section";

interface AbilityModuleProps {
  roleId: number;
  ruleId: number;
  isEditing?: boolean;
  performance?: Record<string, any>;
  numerical?: Record<string, any>;
  onAbilityChange?: (abilityData: any) => void;
}

export default function AbilityModule({
  roleId,
  ruleId,
  isEditing = false,
  performance = {},
  numerical = {},
  onAbilityChange,
}: AbilityModuleProps) {
  // 查询角色在当前规则下的能力
  const { data: ability, isLoading, refetch } = useGetRoleAbilityByRuleQuery(roleId, ruleId);

  // 能力操作的mutation
  const setAbilityMutation = useSetRoleAbilityMutation();
  const updateAbilityMutation = useUpdateRoleAbilityMutation();
  const deleteAbilityMutation = useDeleteRoleAbilityMutation();

  // 本地状态
  const [actFields, setActFields] = useState<Record<string, string>>({});
  const [abilityFields, setAbilityFields] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 初始化本地状态
  useEffect(() => {
    if (ability) {
      setActFields(ability.act || {});
      setAbilityFields(ability.ability || {});
      onAbilityChange?.(ability);
    }
    else if (!isLoading) {
      // 如果没有能力数据，使用规则提供的默认值初始化
      setActFields(performance || {});
      setAbilityFields(numerical || {});
    }
  }, [ability, isLoading, performance, numerical, onAbilityChange]);

  // 显示消息
  const showMessage = (text: string, type: "success" | "error") => {
    setMessage({ text, type });
    // 3秒后自动清除消息
    setTimeout(() => setMessage(null), 3000);
  };

  // 创建能力
  const handleCreateAbility = async () => {
    try {
      await setAbilityMutation.mutateAsync({
        roleId,
        ruleId,
        act: actFields,
        ability: abilityFields,
      });
      showMessage("创建能力成功", "success");
      refetch();
    }
    catch (error) {
      showMessage("创建能力失败", "error");
      console.error(error);
    }
  };

  // 更新能力
  const handleUpdateAbility = async () => {
    if (!ability?.abilityId)
      return;

    try {
      await updateAbilityMutation.mutateAsync({
        abilityId: ability.abilityId,
        act: actFields,
        ability: abilityFields,
      });
      showMessage("更新能力成功", "success");
      refetch();
    }
    catch (error) {
      showMessage("更新能力失败", "error");
      console.error(error);
    }
  };

  // 删除能力
  const handleDeleteAbility = async () => {
    if (!ability?.abilityId)
      return;

    try {
      await deleteAbilityMutation.mutateAsync(ability.abilityId);
      showMessage("删除能力成功", "success");
      refetch();
    }
    catch (error) {
      showMessage("删除能力失败", "error");
      console.error(error);
    }
  };

  // 更新表演字段
  const handleActChange = (key: string, value: string) => {
    const newAct = { ...actFields, [key]: value };
    setActFields(newAct);
    if (isEditing && ability) {
      onAbilityChange?.({ ...ability, act: newAct });
    }
  };

  // 更新数值字段
  const handleAbilityChange = (key: string, value: number) => {
    const newAbility = { ...abilityFields, [key]: value };
    setAbilityFields(newAbility);
    if (isEditing && ability) {
      onAbilityChange?.({ ...ability, ability: newAbility });
    }
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (isEditing && !ability) {
    return (
      <div className="space-y-6">
        {/* 消息提示 */}
        {message && (
          <div
            className={`p-2 rounded-md text-center ${
              message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex justify-center p-4">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none"
            onClick={handleCreateAbility}
            disabled={setAbilityMutation.isPending}
          >
            {setAbilityMutation.isPending ? "创建中..." : "创建角色能力"}
          </button>
        </div>
      </div>
    );
  }
  else {
    return (
      <div className="space-y-6">
        {/* 消息提示 */}
        {message && (
          <div
            className={`p-2 rounded-md text-center ${
              message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 表演字段部分 */}
        <Section title="表演字段">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(actFields).map(key => (
              <div key={key} className="mb-4">
                <div className="mb-1 font-medium text-gray-700">{key}</div>
                {isEditing
                  ? (
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={actFields[key] || ""}
                        onChange={e => handleActChange(key, e.target.value)}
                        rows={3}
                      />
                    )
                  : (
                      <div className="p-2 bg-gray-50 border border-gray-200 rounded-md min-h-[60px]">
                        {actFields[key] || "无描述"}
                      </div>
                    )}
              </div>
            ))}
          </div>
        </Section>

        {/* 能力值部分 */}
        <Section title="能力值">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.keys(abilityFields).map(key => (
              <div key={key} className="mb-2">
                <div className="mb-1 font-medium text-gray-700">{key}</div>
                {isEditing
                  ? (
                      <input
                        type="number"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        value={abilityFields[key] || 0}
                        onChange={e => handleAbilityChange(key, Number(e.target.value))}
                        min={0}
                        max={100}
                      />
                    )
                  : (
                      <div className="p-2 bg-gray-50 border border-gray-200 rounded-md min-h-[40px] flex items-center justify-center">
                        {abilityFields[key]}
                      </div>
                    )}
              </div>
            ))}
          </div>
        </Section>

        {/* 编辑模式下的操作按钮 */}
        {isEditing && ability && (
          <div className="flex justify-end space-x-4 mt-4">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none mr-2"
              onClick={handleUpdateAbility}
              disabled={updateAbilityMutation.isPending}
            >
              {updateAbilityMutation.isPending ? "保存中..." : "保存更改"}
            </button>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none"
              onClick={handleDeleteAbility}
              disabled={deleteAbilityMutation.isPending}
            >
              {deleteAbilityMutation.isPending ? "删除中..." : "删除能力"}
            </button>
          </div>
        )}
      </div>
    );
  }
}

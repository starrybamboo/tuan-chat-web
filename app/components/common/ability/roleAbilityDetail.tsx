import type { AbilityFieldUpdateRequest } from "../../../../api";
import AddAbilityWindow from "@/components/common/ability/addAbilityWindow";
import { PopWindow } from "@/components/common/popWindow";
import React, { useState } from "react";
import {
  useGetRoleAbilitiesQuery,
  useUpdateKeyFieldMutation,
  useUpdateRoleAbilityMutation,
} from "../../../../api/hooks/abilityQueryHooks";
import { useGetRuleDetailQueries } from "../../../../api/hooks/ruleQueryHooks";

export function RoleAbilityDetail({ roleId }: { roleId: number }) {
  const roleAbilityListQuery = useGetRoleAbilitiesQuery(roleId);
  const roleAbilityList = roleAbilityListQuery.data?.data ?? [];
  const ruleIds = roleAbilityList?.map(ability => ability.ruleId ?? -1) ?? [];
  const ruleQueries = useGetRuleDetailQueries(ruleIds);
  const rules = ruleQueries.map(query => query.data?.data ?? {}) ?? [];

  const [editingField, setEditingField] = useState<{
    abilityId: number;
    key: string;
    type: "ability" | "act";
    isKeyField: boolean;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editAddKey, setEditAddKey] = useState("");
  const [editAddValue, setEditAddValue] = useState("");

  // Mutations
  const updateAbilityMutation = useUpdateRoleAbilityMutation();
  const updateKeyFieldMutation = useUpdateKeyFieldMutation();

  const [isOpenAbilityWindow, setIsOpenAbilityWindow] = useState(false);

  // 统一处理字段更新
  const handleUpdate = (abilityId: number, type: "ability" | "act", key: string, updateValue: string, isKeyField: boolean) => {
    if (isKeyField) {
      const updateData: AbilityFieldUpdateRequest = (type === "ability")
        ? {
            abilityId,
            abilityFields: { [key]: updateValue },
          }
        : {
            abilityId,
            actFields: { [key]: updateValue },
          };
      updateKeyFieldMutation.mutate(updateData);
    }
    else {
      const updateData = (type === "ability")
        ? {
            abilityId,
            ability: { [key]: Number(updateValue) },
          }
        : {
            abilityId,
            act: { [key]: updateValue },
          };
      updateAbilityMutation.mutate(updateData);
    }

    setEditingField(null);
  };
  const handleDoubleClick = (abilityId: number, type: "ability" | "act", key: string, currentValue: string | number, isKeyField: boolean) => {
    setEditingField({ abilityId, type, key, isKeyField });
    setEditValue(isKeyField ? key : String(currentValue));
  };

  // 可编辑字段
  const renderEditableField = (
    abilityId: number,
    type: "ability" | "act",
    isKeyField: boolean, // 编辑字段是不是key
    key: string,
    value: string | number,
  ) => {
    const isEditing = editingField?.abilityId === abilityId
      && editingField?.type === type
      && editingField?.isKeyField === isKeyField
      && editingField?.key === key;
    return isEditing
      ? (
          <input
            type={type === "ability" && !isKeyField ? "number" : "text"}
            className="text-xs cursor-text border min-w-[10px] max-w-[40px]"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => handleUpdate(abilityId, type, key, editValue, isKeyField)}
            onKeyPress={e => e.key === "Enter" && handleUpdate(abilityId, type, key, editValue, isKeyField)}
            autoFocus
          />
        )
      : (
          <div
            className="text-xs cursor-text min-w-[10px] max-w-[40px]"
            onDoubleClick={() => handleDoubleClick(abilityId, type, key, value, isKeyField)}
          >
            {isKeyField ? key : value}
          </div>
        );
  };

  return (
    <div className="flex flex-col gap-2 overflow-auto h-[70vh] w-full">
      {roleAbilityList.map((ability, index) => {
        return (
          <div key={ability.abilityId} className="flex flex-col gap-1">
            <div className="collapse collapse-plus bg-base-100 border-base-300 border w-m">
              <input type="checkbox" />
              <div className="collapse-title font-semibold">
                {rules[index].ruleName ?? "未命名规则"}
                <span className="text-xs text-gray-500">{` id:${rules[index].ruleId}`}</span>
              </div>
              <div className="collapse-content flex flex-row gap-2 w-full">
                <div className="flex flex-col gap-1">
                  {/* 角色属性 */}
                  <div className="collapse collapse-plus bg-base-100 border-base-300 border m-2 w-full">
                    <input type="checkbox" />
                    <div className="collapse-title font-semibold">角色属性</div>
                    <div className="collapse-content flex flex-col gap-y-4">
                      <div className="flex gap-3 w-max justify-center items-center">
                        <input
                          type="text"
                          placeholder="属性名"
                          className="input"
                          onChange={e => setEditAddKey(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="值"
                          className="input"
                          onChange={e => setEditAddValue(e.target.value)}
                        />
                        <button className="btn-info btn " type="button" onClick={() => handleUpdate(ability.abilityId ?? -1, "ability", editAddKey, editAddValue, false)}>添加属性</button>
                      </div>

                      <div className="grid grid-cols-6 w-max">
                        {Object.entries(ability.ability ?? {}).map(([key, value]) => (
                          <div key={key} className="break-inside-avoid mb-2 ml-1 p-2 border rounded-lg">
                            <div className="flex justify-between">
                              {renderEditableField(ability.abilityId ?? -1, "ability", true, key, value)}
                              {renderEditableField(ability.abilityId ?? -1, "ability", false, key, value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* TODO */}
                  {/* // 角色能力 */}
                  <div className="collapse collapse-plus bg-base-100 border-base-300 border m-2 w-full">
                    <input type="checkbox" />
                    <div className="collapse-title font-semibold">角色能力</div>
                    <div className="collapse-content">
                      <div className="grid grid-cols-6 overflow-auto">

                        {Object.entries(ability.act ?? {}).map(([key, value]) => (
                          <div
                            key={key}
                            className="break-inside-avoid mb-2 ml-1 p-2 border rounded-lg"
                          >
                            <div className="flex justify-between">
                              {renderEditableField(ability.abilityId ?? -1, "act", true, key, value)}
                              {renderEditableField(ability.abilityId ?? -1, "act", false, key, value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex justify-center items-center flex-col gap-8">
        <button className="btn" type="button" onClick={() => setIsOpenAbilityWindow(true)}>新建一个能力组</button>
      </div>
      <PopWindow isOpen={isOpenAbilityWindow} onClose={() => setIsOpenAbilityWindow(false)}>
        <AddAbilityWindow roleId={roleId} onClose={() => setIsOpenAbilityWindow(false)} />
      </PopWindow>
    </div>
  );
}

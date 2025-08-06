import type { AbilityFieldUpdateRequest } from "../../../../api";
import { SpaceContext } from "@/components/chat/spaceContext";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import React, { use, useEffect, useState } from "react";
import {
  useGetRoleAbilitiesQuery,
  useUpdateKeyFieldMutation,
  useUpdateRoleAbilityMutation,
} from "../../../../api/hooks/abilityQueryHooks";

export function RoleAbilityDetail({ roleId }: { roleId: number }) {
  const roleAbilityListQuery = useGetRoleAbilitiesQuery(roleId);
  const roleAbilityList = roleAbilityListQuery.data?.data ?? [];

  const spaceContext = use(SpaceContext);
  const ability = roleAbilityList.find(ability => ability.ruleId === spaceContext.ruleId);

  const [searchKey, setSearchKey] = useSearchParamsState<string>("roleAbilitySearchKey", "");
  useEffect(() => {
    setSearchKey("");
  }, []);

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

  if (!ability) {
    return <></>;
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-base-100 rounded-box">
      <div key={ability.abilityId} className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 w-full">
          {/* 角色属性部分 */}
          <div className="card bg-base-200 p-4 flex flex-col gap-2">
            <div className="flex gap-4 ">
              <span className="card-title text-lg font-bold">角色属性</span>
              <input
                type="text"
                placeholder="搜索"
                className="input input-bordered flex-1"
                onChange={e => setSearchKey(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="属性名"
                  className="input input-bordered flex-1"
                  onChange={e => setEditAddKey(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="值"
                  className="input input-bordered flex-1"
                  onChange={e => setEditAddValue(e.target.value)}
                />
                <button
                  className="btn btn-info"
                  type="button"
                  onClick={() => handleUpdate(ability.abilityId ?? -1, "ability", editAddKey, editAddValue, false)}
                >
                  添加属性
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(ability.ability ?? {}).filter(([key]) => key.includes(searchKey)).map(([key, value]) => (
                  <div key={key} className="card bg-base-100 shadow-sm p-3">
                    <div className="flex justify-between">
                      {renderEditableField(ability.abilityId ?? -1, "ability", true, key, value)}
                      {renderEditableField(ability.abilityId ?? -1, "ability", false, key, value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 角色能力部分 */}
          <div className="card bg-base-200 p-4 items-center">
            <h3 className="card-title text-lg font-bold mb-4">角色能力</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(ability.act ?? {}).map(([key, value]) => (
                <div key={key} className="card bg-base-100 shadow-sm p-3">
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
  );
}

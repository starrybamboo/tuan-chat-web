import { useState } from "react";
import { useGetRoleAbilitiesQuery, useUpdateRoleAbilityMutation } from "../../../api/queryHooks";

export function RoleAbilityDetail({ roleId }: { roleId: number }) {
  const roleAbilityListQuery = useGetRoleAbilitiesQuery(roleId);

  const [editingField, setEditingField] = useState<{
    abilityId: number;
    key: string;
    type: "ability" | "act";
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editAddKey, setEditAddKey] = useState("");
  const [editAddValue, setEditAddValue] = useState("");

  // Mutations
  const updateAbilityMutation = useUpdateRoleAbilityMutation();
  // 统一处理字段更新
  const handleUpdate = (abilityId: number, type: "ability" | "act", key: string, value: string) => {
    // 当值变化时提交更新
    const updateData = (type === "ability")
      ? {
          abilityId,
          ability: { [key]: Number(value) },
        }
      : {
          abilityId,
          act: { [key]: value },
        };
    updateAbilityMutation.mutate(updateData);

    setEditingField(null);
  };
  const handleDoubleClick = (abilityId: number, type: "ability" | "act", key: string, currentValue: string | number) => {
    setEditingField({ abilityId, type, key });
    setEditValue(String(currentValue));
  };

  // 可编辑字段
  const renderEditableField = (
    abilityId: number,
    type: "ability" | "act",
    key: string,
    value: string | number,
  ) => {
    const isEditing = editingField?.abilityId === abilityId
      && editingField?.type === type
      && editingField?.key === key;
    return isEditing
      ? (
          <input
            type={type === "ability" ? "number" : "text"}
            className="text-xs text-gray-800 cursor-text border min-w-[10px] max-w-[40px]"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => handleUpdate(abilityId, type, key, editValue)}
            onKeyPress={e => e.key === "Enter" && handleUpdate(abilityId, type, key, editValue)}
            autoFocus
          />
        )
      : (
          <div
            className="text-xs text-gray-800 cursor-text min-w-[1   0px] max-w-[40px]"
            onDoubleClick={() => handleDoubleClick(abilityId, type, key, value)}
          >
            {value}
          </div>
        );
  };

  return (
    <div className="flex flex-col gap-2 overflow-auto h-[70vh] w-full">
      {roleAbilityListQuery.data?.data?.map((ability) => {
        return (
          <div key={ability.abilityId} className="flex flex-col gap-1">
            <div className="collapse collapse-plus bg-base-100 border-base-300 border w-m">
              <input type="checkbox" />
              <div className="collapse-title font-semibold">
                ruleId:
                {ability.ruleId}
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
                        <button className="btn-info btn " type="button" onClick={() => handleUpdate(ability.abilityId ?? -1, "ability", editAddKey, editAddValue)}>添加属性</button>
                      </div>

                      <div className="grid grid-cols-6 w-max">
                        {Object.entries(ability.ability ?? {}).map(([key, value]) => (
                          <div
                            key={key}
                            className="break-inside-avoid mb-2 ml-1 p-2 border rounded-lg"
                          >
                            <div className="flex justify-between">
                              <div
                                className="text-xs font-medium text-gray-500 truncate"
                              >
                                {key}
                              </div>
                              {renderEditableField(ability.abilityId ?? -1, "ability", key, value)}
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
                              <div
                                className="text-xs font-medium text-gray-500 truncate"
                              >
                                {key}
                              </div>
                              <div className="text-xs text-gray-800">{value}</div>
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
    </div>
  );
}

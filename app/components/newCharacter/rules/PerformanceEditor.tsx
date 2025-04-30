import type { PerformanceFields } from "../types";
import { useUpdateRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useEffect, useState } from "react";

interface PerformanceEditorProps {
  fields: { [key: string]: string };
  onChange: (fields: { [key: string]: string }) => void;
  abilityData: PerformanceFields;
  abilityId: number;
}

/**
 * 表演字段编辑器组件
 * 负责管理角色的表演相关字段，如性别、年龄、背景故事等
 * 包含短字段、长字段和携带物品三种不同的展示方式
 * 我找不到其他解决方法说实话，这些是AI大人提供的思路
 */
export default function PerformanceEditor({
  fields,
  onChange,
  abilityData,
  abilityId,
}: PerformanceEditorProps) {
  // 接入api
  const { mutate: updateFiledAbility } = useUpdateRoleAbilityMutation();
  const [localFields, setLocalFields] = useState(abilityData || fields);

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  // 是否编辑
  const [isEditing, setIsEditing] = useState(false);

  // 长字段，记得写入
  const longFieldKeys = [""];

  // 长字段（如背景故事等）
  const longFields = Object.entries(fields)
    .filter(([key]) => longFieldKeys.includes(key));

  const shortFields = Object.keys(abilityData || fields)
    .filter(key => key !== "携带物品" && !longFieldKeys.includes(key));

  // 计算每列应该显示的字段数量
  const longFieldCount = longFields.length;
  const leftColumnCount = Math.ceil(longFieldCount / 2);

  // 分割长字段为左右两列
  const leftLongFields = longFields.slice(0, leftColumnCount);
  const rightLongFields = longFields.slice(leftColumnCount);

  // 物品相关字段处理 - 提取携带物品信息
  const itemsString = fields["携带物品"] || "";
  const items = itemsString
    // 格式：物品名称1:描述1|物品名称2:描述2|...
    ? itemsString.split("|").map((item) => {
        const [name, desc = ""] = item.split(":");
        return { name, desc };
      })
    : [];

  useEffect(() => {
    setLocalFields(abilityData || fields);
  }, [abilityData]);

  const handleAdd = () => {
    if (newKey.trim()) {
      onChange({ ...fields, [newKey.trim()]: newValue });
      setNewKey("");
      setNewValue("");
    }
  };

  const handleAddItem = () => {
    if (newItemName.trim()) {
      const newItems = [
        ...items,
        { name: newItemName.trim(), desc: newItemDesc },
      ];

      const newItemsString = newItems
        .map(item => `${item.name}:${item.desc}`)
        .join("|");

      onChange({ ...fields, 携带物品: newItemsString });
      setNewItemName("");
      setNewItemDesc("");
    }
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);

    const newItemsString = newItems
      .map(item => `${item.name}:${item.desc}`)
      .join("|");

    onChange({ ...fields, 携带物品: newItemsString });
  };

  const handleUpdateItem = (index: number, name: string, desc: string) => {
    const newItems = [...items];
    newItems[index] = { name, desc };

    const newItemsString = newItems
      .map(item => `${item.name}:${item.desc}`)
      .join("|");

    onChange({ ...fields, 携带物品: newItemsString });
  };

  return (
    <div className="space-y-6 bg-base-200 rounded-lg p-4">
      <h3 className="font-bold mb-3">基本信息</h3>
      {/* 短字段区域 - 多列排布 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {shortFields.map(key => (
          <div key={key} className="flex flex-col">
            <label className="input">
              <span>{key}</span>
              <div className="w-px h-4 bg-base-content/20"></div>
              <input
                type="text"
                onChange={(e) => {
                  const newFields = { ...localFields, [key]: e.target.value };
                  onChange(newFields);
                  setLocalFields(newFields);
                }}
                readOnly={!isEditing}

                value={localFields[key] || ""}
              />
            </label>
          </div>
        ))}
      </div>

      {/* 长字段区域 */}
      <div className="flex gap-4">
        {/* 左侧列 */}
        <div className="flex-1 space-y-3">
          {leftLongFields.map(([key, value]) => (
            <fieldset key={key} className="feildset p-4">
              <legend className="fieldset-legend">{key}</legend>
              <textarea
                value={value}
                className="textarea w-full h-24 resize-none"
                onChange={(e) => {
                  onChange({ ...fields, [key]: e.target.value });
                }}
                disabled={!isEditing}
                // readOnly={!isEditing}
              />
            </fieldset>
          ))}
        </div>

        {/* 分隔线 */}
        {rightLongFields.length > 0 && (
          <div className="border-r border-base-300"></div>
        )}

        {/* 右侧列 */}
        <div className="flex-1 space-y-3">
          {rightLongFields.map(([key, value]) => (
            <div key={key} className="flex flex-col">
              <label className="text-sm font-medium mb-1">{key}</label>
              <textarea
                value={value}
                className="textarea textarea-bordered w-full h-24 resize-none"
                onChange={(e) => {
                  onChange({ ...fields, [key]: e.target.value });
                }}
                readOnly={!isEditing}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 物品区域 - 特殊布局 */}
      <div className="border-t border-base-300 pt-4 mt-4">
        <h3 className="font-bold mb-3">携带物品</h3>

        <div className="overflow-x-auto bg-base-200 rounded-lg">
          <table className="table table-zebra table-compact w-full">
            <thead>
              <tr>
                <th className="w-1/3">物品名称</th>
                <th>物品描述</th>
                <th className="w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                // eslint-disable-next-line react/no-array-index-key
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={item.name}
                      className="input input-bordered input-sm w-full"
                      onChange={(e) => {
                        handleUpdateItem(index, e.target.value, item.desc);
                      }}
                      readOnly={!isEditing}
                      placeholder={isEditing ? "新物品名称" : "请打开编辑模式"}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.desc}
                      className="input input-bordered input-sm w-full"
                      onChange={(e) => {
                        handleUpdateItem(index, item.name, e.target.value);
                      }}
                      readOnly={!isEditing}
                      placeholder={isEditing ? "物品描述" : "请打开编辑模式"}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-error btn-xs"
                      disabled={!isEditing}
                      onClick={() => handleRemoveItem(index)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}

              <tr>
                <td>
                  <input
                    type="text"
                    readOnly={!isEditing}
                    placeholder={isEditing ? "请输入" : "请打开编辑模式"}
                    className="input input-bordered input-sm w-full"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    readOnly={!isEditing}
                    placeholder={isEditing ? "请输入" : "请打开编辑模式"}
                    className="input input-bordered input-sm w-full"
                    value={newItemDesc}
                    onChange={e => setNewItemDesc(e.target.value)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    disabled={!isEditing}
                    onClick={handleAddItem}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 添加新字段区域 */}
      <div className="border-t border-base-300 pt-4 mt-4">
        <h3 className="font-bold mb-3">添加新字段</h3>
        <div className="flex gap-8 max-w-2xl">
          <input
            type="text"
            readOnly={!isEditing}
            placeholder={isEditing ? "字段名称" : "请打开编辑模式"}
            className="input input-bordered input-sm w-1/3"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
          />
          <input
            type="text"
            readOnly={!isEditing}
            placeholder={isEditing ? "值" : "请打开编辑模式"}
            className="input input-bordered input-sm w-1/2"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!isEditing}
            onClick={handleAdd}
          >
            添加字段
          </button>
        </div>
      </div>
      {/* 操作按钮 */}
      <div className="card-actions justify-end">
        {isEditing
          ? (
              <button
                type="submit"
                onClick={() => {
                  setIsEditing(false);
                  const updateData = {
                    abilityId: abilityId || 0,
                    act: fields,
                  };
                  updateFiledAbility(updateData);
                }}
                className="btn btn-primary"
              >
                退出
              </button>
            )
          : (
              <button type="button" onClick={() => setIsEditing(true)} className="btn btn-accent">
                编辑
              </button>
            )}
      </div>
    </div>
  );
}

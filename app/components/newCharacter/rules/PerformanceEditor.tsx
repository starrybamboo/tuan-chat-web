import { useUpdateKeyFieldMutation, useUpdateRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useState } from "react";

interface PerformanceEditorProps {
  fields: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  abilityData: Record<string, string>;
  abilityId: number;
}

/**
 * 表演字段编辑器组件
 * 负责管理角色的表演相关字段，如性别、年龄、背景故事等
 * 展示方式被划分为了 短字段、长字段和携带物品 三种不同的展示方式
 */
export default function PerformanceEditor({
  fields,
  onChange,
  abilityData,
  abilityId,
}: PerformanceEditorProps) {
  // 接入api
  const { mutate: updateFiledAbility } = useUpdateRoleAbilityMutation();
  const { mutate: updateKeyField } = useUpdateKeyFieldMutation();
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  // const [newItemName, setNewItemName] = useState("");
  // const [newItemDesc, setNewItemDesc] = useState("");
  // 是否编辑
  const [isEditing, setIsEditing] = useState(false);
  // 编辑状态过渡
  const [isTransitioning, setIsTransitioning] = useState(false);

  const longFieldKeys = [""];
  const shortFields = Object.keys(abilityData || fields)
    .filter(key => key !== "携带物品" && !longFieldKeys.includes(key));

  // 处理编辑模式切换
  const handleEditToggle = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
    else {
      setIsTransitioning(true);
      // 保存更改
      const updateData = {
        abilityId,
        act: fields,
        ability: {}, // 表演编辑器不修改能力字段，传空对象
      };
      updateFiledAbility(updateData, {
        onSuccess: () => {
          setTimeout(() => {
            setIsEditing(false);
            setIsTransitioning(false);
          }, 300);
        },
        onError: () => {
          setIsTransitioning(false);
        },
      });
    }
  };

  const handleDeleteField = (key: string) => {
    updateKeyField(
      {
        abilityId,
        actFields: {
          [key]: "",
        },
        abilityFields: {},
      },
    );
    delete fields[key];
    onChange(fields);
  };

  const handleAddField = () => {
    if (newKey.trim()) {
      onChange({ ...fields, [newKey.trim()]: newValue });
      setNewKey("");
      setNewValue("");
    }
  };

  return (
    <div className={`space-y-6 bg-base-200 rounded-lg p-4 transition-opacity duration-300 ${
      isTransitioning ? "opacity-50" : ""
    } ${
      isEditing ? "ring-2 ring-primary" : ""
    }`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">基本信息</h3>
        <button
          type="button"
          onClick={handleEditToggle}
          className={`btn btn-sm ${
            isEditing ? "btn-primary" : "btn-accent"
          } ${
            isTransitioning ? "scale-95" : ""
          }`}
          disabled={isTransitioning}
        >
          {isTransitioning
            ? (
                <span className="loading loading-spinner loading-xs"></span>
              )
            : isEditing
              ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    保存
                  </span>
                )
              : (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <path d="M11 4H4v14a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" />
                      <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    编辑
                  </span>
                )}
        </button>
      </div>

      {/* 短字段区域 - 多列排布 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:5 gap-6">
        {shortFields.map(key => (
          <div key={key} className="group">
            {isEditing
              ? (
            // 编辑模式下的UI
                  <div className="flex items-center gap-1">
                    <fieldset className="fieldset relative bg-base-200 border-base-300 rounded-box w-full">
                      <legend className="fieldset-legend text-sm">{key}</legend>
                      <textarea
                        onChange={(e) => {
                          const newFields = { ...fields, [key]: e.target.value };
                          onChange(newFields);
                        }}
                        value={fields[key] || ""}
                        className="textarea textarea-bordered bg-base-100 rounded-md w-full min-h-32 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary border-none outline-none resize-none"
                        rows={1}
                      />
                      <button
                        type="button"
                        className="absolute -top-6 -right-3 btn btn-ghost btn-xs text-error hover:bg-error/10 md:opacity-0 md:group-hover:opacity-100 opacity-70 rounded-full p-1"
                        onClick={() => handleDeleteField(key)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                          <path
                            fill="currentColor"
                            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                          />
                        </svg>
                      </button>
                    </fieldset>
                  </div>
                )
              : (
            // 非编辑模式下的UI
                  <div className="card bg-base-100 shadow-sm p-2 h-full">
                    {/* <div className="text-primary">{key}</div> */}
                    <div className="divider">{key}</div>
                    <div className="text-base-content mt-0.5 flex justify-center p-2">
                      <div className="text-left">
                        {fields[key] || <span className="text-base-content/50">未设置</span>}
                      </div>
                    </div>
                  </div>
                )}
          </div>
        ))}
      </div>

      {/* 添加新字段区域 */}
      {isEditing && (
        <fieldset className="border border-base-300 rounded-lg p-4 mt-4">
          <legend className="px-2 font-bold">添加新字段</legend>
          <label className="input flex items-center gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none mt-2">
            <input
              type="text"
              placeholder="字段名称"
              className="text-sm font-medium bg-transparent border-none focus:outline-none outline-none w-24 flex-shrink-0"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
            />
          </label>
          <div className="relative w-full">
            <textarea
              placeholder="值"
              className="textarea textarea-bordered bg-base-100 rounded-md w-full min-h-32 mt-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary border-none outline-none resize-none"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              rows={1}
            />
            <button
              type="button"
              className="btn btn-sm btn-primary absolute bottom-2 right-2"
              onClick={handleAddField}
              disabled={!newKey || !newValue}
            >
              添加字段
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}

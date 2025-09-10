import { useUpdateKeyFieldMutation, useUpdateRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useState } from "react";

// Type for numerical data - flat structure
type NumericalData = Record<string, string | number>;

// 字段类型枚举
type FieldType = "basic" | "ability" | "skill";

interface NumericalEditorProps {
  data: NumericalData;
  onChange: (data: NumericalData) => void;
  abilityId: number;
  title?: string;
  fieldType: FieldType; // 新增：指定要更新的字段类型
}

/**
 * 数值编辑器组件
 * 用于渲染和编辑数值数据的通用组件
 */
export default function NumericalEditor({
  data,
  onChange,
  abilityId,
  title = "数值数据",
  fieldType,
}: NumericalEditorProps) {
  const { mutate: updateFiledAbility } = useUpdateRoleAbilityMutation();
  const { mutate: updateKeyField } = useUpdateKeyFieldMutation();
  const [isEditing, setIsEditing] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [localData, setLocalData] = useState(data);
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [tempFieldKey, setTempFieldKey] = useState("");

  // 处理字段值更新
  const handleExitEditing = () => {
    setIsTransitioning(true);

    // 更新前端状态
    onChange(localData);

    // 更新后端数据 - 将所有值转换为字符串类型
    const stringData: Record<string, string> = {};
    Object.entries(localData).forEach(([key, value]) => {
      stringData[key] = String(value);
    });

    // 根据字段类型构建更新对象
    const updatedAbility: any = {
      abilityId,
    };

    // 根据fieldType设置对应的字段
    switch (fieldType) {
      case "basic":
        updatedAbility.basic = stringData;
        break;
      case "ability":
        updatedAbility.ability = stringData;
        break;
      case "skill":
        updatedAbility.skill = stringData;
        break;
    }

    updateFiledAbility(updatedAbility, {
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
  };

  // 处理字段值更新
  const handleFieldUpdate = (fieldKey: string, newValue: string) => {
    const updatedData = {
      ...localData,
      [fieldKey]: newValue,
    };
    setLocalData(updatedData);
  };

  // 添加新字段
  const handleAddField = () => {
    if (!newFieldKey.trim() || newFieldKey in localData) {
      return; // 字段名不能为空或重复
    }

    const updatedData = {
      ...localData,
      [newFieldKey]: newFieldValue,
    };
    setLocalData(updatedData);

    // 使用 API 更新字段 (根据 AbilityFieldUpdateRequest 定义)
    const fieldUpdateRequest = {
      abilityId,
      // 根据字段类型使用对应的字段
      ...(fieldType === "basic" && { basicFields: { [newFieldKey]: newFieldValue } }),
      ...(fieldType === "ability" && { abilityFields: { [newFieldKey]: newFieldValue } }),
      ...(fieldType === "skill" && { skillFields: { [newFieldKey]: newFieldValue } }),
    };

    updateKeyField(fieldUpdateRequest, {
      onSuccess: () => {
        onChange(updatedData);
        setNewFieldKey("");
        setNewFieldValue("");
      },
    });
  };

  // 删除字段
  const handleDeleteField = (fieldKey: string) => {
    const updatedData = { ...localData };
    delete updatedData[fieldKey];
    setLocalData(updatedData);

    // 使用 API 删除字段（传 null 表示删除）
    const fieldUpdateRequest = {
      abilityId,
      // 根据字段类型使用对应的字段
      ...(fieldType === "basic" && { basicFields: { [fieldKey]: null as any } }),
      ...(fieldType === "ability" && { abilityFields: { [fieldKey]: null as any } }),
      ...(fieldType === "skill" && { skillFields: { [fieldKey]: null as any } }),
    };

    updateKeyField(fieldUpdateRequest, {
      onSuccess: () => {
        onChange(updatedData);
      },
    });
  };

  // 修改字段名
  const handleRenameField = (oldKey: string, newKey: string) => {
    if (!newKey.trim() || newKey === oldKey || newKey in localData) {
      return; // 新字段名不能为空、相同或重复
    }

    const value = localData[oldKey];
    const updatedData = { ...localData };
    delete updatedData[oldKey];
    updatedData[newKey] = value;
    setLocalData(updatedData);

    // 删除旧字段，添加新字段
    const fieldUpdateRequest = {
      abilityId,
      // 根据字段类型使用对应的字段
      ...(fieldType === "basic" && {
        basicFields: {
          [oldKey]: null as any, // 删除旧字段，类型断言因为API支持null
          [newKey]: String(value), // 添加新字段
        },
      }),
      ...(fieldType === "ability" && {
        abilityFields: {
          [oldKey]: null as any,
          [newKey]: String(value),
        },
      }),
      ...(fieldType === "skill" && {
        skillFields: {
          [oldKey]: null as any,
          [newKey]: String(value),
        },
      }),
    };

    updateKeyField(fieldUpdateRequest, {
      onSuccess: () => {
        onChange(updatedData);
      },
    });
  };
  return (
    <div className={`space-y-6 bg-base-200 rounded-lg p-4 duration-300 transition-opacity ${
      isTransitioning ? "opacity-50" : ""
    } ${isEditing ? "ring-2 ring-primary" : ""}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold">{title}</h3>
        <button
          type="button"
          onClick={isEditing ? handleExitEditing : () => setIsEditing(true)}
          className={`btn btn-sm ${isEditing ? "btn-primary" : "btn-accent"
          } ${isTransitioning ? "scale-95" : ""
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

      <div className="bg-base-200 p-4 rounded-lg">
        <div className={
          isEditing
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
            : "grid grid-cols-2 md:flex md:flex-wrap gap-2 md:gap-6"
        }
        >
          {Object.entries(localData).map(([key, value]) => (
            <div key={key} className={isEditing ? "form-control" : "flex flex-col gap-1 flex-shrink-0"}>
              {isEditing
                ? (
                    <div className="form-control">
                      <label className="input flex items-center gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none">
                        {/* 字段名编辑 */}
                        {editingFieldKey === key
                          ? (
                              <input
                                type="text"
                                value={tempFieldKey}
                                onChange={e => setTempFieldKey(e.target.value)}
                                onBlur={() => {
                                  if (tempFieldKey.trim() && tempFieldKey !== key) {
                                    handleRenameField(key, tempFieldKey);
                                  }
                                  setEditingFieldKey(null);
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    if (tempFieldKey.trim() && tempFieldKey !== key) {
                                      handleRenameField(key, tempFieldKey);
                                    }
                                    setEditingFieldKey(null);
                                  }
                                }}
                                className="text-sm font-medium whitespace-nowrap bg-transparent border-none focus:outline-none outline-none flex-shrink-0"
                                autoFocus
                              />
                            )
                          : (
                              <span
                                className="text-sm font-medium whitespace-nowrap cursor-pointer hover:text-primary flex-shrink-0 text-left"
                                onClick={() => {
                                  setEditingFieldKey(key);
                                  setTempFieldKey(key);
                                }}
                                title="点击编辑字段名"
                              >
                                {key}
                              </span>
                            )}
                        <div className="w-px h-4 bg-base-content/20"></div>
                        {/* 字段值编辑 */}
                        <input
                          type="text"
                          value={String(value)}
                          onChange={e => handleFieldUpdate(key, e.target.value)}
                          className="grow focus:outline-none border-none outline-none"
                        />
                        {/* 删除按钮 */}
                        <button
                          type="button"
                          onClick={() => handleDeleteField(key)}
                          className="btn btn-ghost btn-xs text-error hover:bg-error/10"
                          title="删除字段"
                        >
                          ✕
                        </button>
                      </label>
                    </div>
                  )
                : (
                    <div className="flex items-center justify-between p-2 md:p-3 rounded-lg border bg-base-100/50 whitespace-nowrap border-base-content/10">
                      <span className="font-medium text-sm md:text-base flex-shrink-0 md:mr-8">{key}</span>
                      <span className="badge text-sm md:text-base flex-shrink-0 badge-ghost">
                        {String(value)}
                      </span>
                    </div>
                  )}
            </div>
          ))}

          {/* 添加新字段区域 */}
          {isEditing && (
            <div className="form-control col-span-full pt-2 border-t border-base-content/10">
              <span className="text-sm text-base-content/50 mb-2 select-none">添加新字段</span>
              <label className="input flex items-center gap-2 rounded-md transition focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:outline-none">
                <input
                  type="text"
                  value={newFieldKey}
                  onChange={e => setNewFieldKey(e.target.value)}
                  placeholder="字段名"
                  className="text-sm font-medium bg-transparent border-none focus:outline-none outline-none w-24 flex-shrink-0"
                />
                <div className="w-px h-4 bg-base-content/20"></div>
                <input
                  type="text"
                  value={newFieldValue}
                  onChange={e => setNewFieldValue(e.target.value)}
                  placeholder="字段值"
                  className="grow focus:outline-none border-none outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddField}
                  disabled={!newFieldKey.trim() || newFieldKey in localData}
                  className="btn btn-ghost btn-xs btn-primary"
                  title="添加字段"
                >
                  ✓
                </button>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

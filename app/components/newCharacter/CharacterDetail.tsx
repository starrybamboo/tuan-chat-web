import type { ChangeEvent } from "react";
import type { GameRule, Role } from "./types";
import RulesSection from "@/components/newCharacter/RulesSection";
import { useMutation } from "@tanstack/react-query";
import { tuanchat } from "api/instance";
import { useEffect, useState } from "react";
import NumericalEditor from "./NumericalEditor";
import PerformanceEditor from "./PerformanceEditor";
import Section from "./Section";

interface CharacterDetailProps {
  role: Role;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updatedRole: Role) => void;
  rules: GameRule[];
}

/**
 * 角色详情组件
 * 负责展示和编辑角色的详细信息，包括基本信息、规则选择、表演字段和数值约束
 */
export default function CharacterDetail({
  role,
  isEditing,
  onEdit,
  onSave,
  rules,
}: CharacterDetailProps) {
  // 确保 role.ruleData 存在
  const initialRole = {
    ...role,
    ruleData: role.ruleData || {},
  };

  const [localRole, setLocalRole] = useState(initialRole);
  const [currentRule, setCurrentRule] = useState<GameRule | undefined>(undefined);

  // 接口部分
  const { mutate: updateRole } = useMutation({
    mutationKey: ["UpdateRole"],
    mutationFn: async (data: Role) => {
      if (data.id !== 0) {
        const updateRes = await tuanchat.roleController.updateRole({
          roleId: data.id,
          roleName: data.name,
          description: data.description,
        });
        return updateRes;
      }
    },
    onError: (error: any) => {
      console.error("Mutation failed:", error);
      if (error.response && error.response.data) {
        console.error("Server response:", error.response.data);
      }
    },
  });

  // 初始化：当角色数据或规则列表改变时设置当前规则
  useEffect(() => {
    // 确保 role.ruleData 存在
    const updatedRole = {
      ...role,
      ruleData: role.ruleData || {},
    };

    setLocalRole(updatedRole);
    if (updatedRole.ruleId) {
      const foundRule = rules.find(r => r.id === updatedRole.ruleId);
      if (foundRule) {
        const ruleData = updatedRole.ruleData[foundRule.id] || {
          performance: foundRule.performance,
          numerical: foundRule.numerical,
        };
        setCurrentRule({
          ...foundRule,
          performance: ruleData.performance,
          numerical: ruleData.numerical,
        });
      }
    }
    else if (rules.length > 0) {
      const defaultRule = rules[0];
      setLocalRole(prev => ({ ...prev, ruleId: defaultRule.id }));
      setCurrentRule(defaultRule);
    }
  }, [role, rules]);

  // 保存时，将当前规则数据合并到 localRole.ruleData 中
  const handleSave = () => {
    let updatedRole = localRole;
    if (localRole.ruleId && currentRule) {
      updatedRole = {
        ...localRole,
        ruleData: {
          ...localRole.ruleData,
          [localRole.ruleId]: {
            performance: currentRule.performance,
            numerical: currentRule.numerical,
          },
        },
      };
    }

    // 调用API更新角色信息
    updateRole(updatedRole);
    // 调用父组件的保存回调
    onSave(updatedRole);
    updateRole(localRole);
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setLocalRole(prev => ({ ...prev, avatar: previewUrl }));
    }
  };

  // 处理规则切换
  const handleRuleChange = (newRuleId: string) => {
    if (localRole.ruleId && currentRule) {
      setLocalRole(prev => ({
        ...prev,
        ruleData: {
          ...prev.ruleData,
          [prev.ruleId]: {
            performance: currentRule.performance,
            numerical: currentRule.numerical,
          },
        },
      }));
    }

    const newRule = rules.find(r => r.id === newRuleId);
    if (newRule) {
      const storedData = localRole.ruleData?.[newRuleId] || {
        performance: newRule.performance,
        numerical: newRule.numerical,
      };

      setLocalRole(prev => ({
        ...prev,
        ruleId: newRuleId,
      }));

      setCurrentRule({
        ...newRule,
        performance: storedData.performance,
        numerical: storedData.numerical,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 基础信息卡片 */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-start gap-4">
            <AvatarSection
              avatar={localRole.avatar}
              isEditing={isEditing}
              onChange={handleAvatarChange}
            />

            <div className="flex-1 space-y-4">
              <Section title="基本信息">
                {isEditing
                  ? (
                      <>
                        <p>
                          角色ID号：
                          {localRole.id}
                        </p>
                        <input
                          type="text"
                          value={localRole.name}
                          onChange={e => setLocalRole(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="角色名称"
                          className="input input-bordered w-full text-lg font-bold"
                        />
                        <textarea
                          value={localRole.description}
                          onChange={e =>
                            setLocalRole(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="角色描述"
                          className="textarea textarea-bordered w-full h-24 resize-none"
                        />
                      </>
                    )
                  : (
                      <>
                        <h2 className="card-title text-2xl">
                          {localRole.name || "未命名角色"}
                        </h2>
                        <p>
                          角色ID号：
                          {localRole.id}
                        </p>
                        <p className="text-base-content/70 whitespace-pre-wrap">
                          {localRole.description || "暂无描述"}
                        </p>
                      </>
                    )}
              </Section>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="card-actions justify-end">
            {isEditing
              ? (
                  <button onClick={handleSave} className="btn btn-primary">
                    保存
                  </button>
                )
              : (
                  <button onClick={onEdit} className="btn btn-ghost">
                    编辑
                  </button>
                )}
          </div>
        </div>
      </div>

      {/* 扩展模块 */}
      <div className="space-y-6">
        <RulesSection
          rules={rules}
          currentRuleId={localRole.ruleId || ""}
          onRuleChange={handleRuleChange}
        />

        {currentRule && (
          <>
            <Section title="表演字段配置">
              <PerformanceEditor
                fields={currentRule.performance}
                onChange={performance =>
                  setCurrentRule(prev => (prev ? { ...prev, performance } : prev))}
                isEditing={isEditing}
              />
            </Section>

            <Section title="数值约束配置">
              <NumericalEditor
                constraints={currentRule.numerical}
                onChange={numerical =>
                  setCurrentRule(prev => (prev ? { ...prev, numerical } : prev))}
                isEditing={isEditing}
              />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 头像组件
 * 用于展示和上传角色头像
 */
function AvatarSection({
  avatar,
  isEditing,
  onChange,
}: {
  avatar?: string;
  isEditing: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="avatar">
        <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
          {avatar
            ? (
                <img src={avatar} alt="角色头像" className="object-cover" />
              )
            : (
                <div className="bg-neutral-content flex items-center justify-center">
                  <span className="text-neutral">无头像</span>
                </div>
              )}
        </div>
      </div>
      {isEditing && (
        <input
          type="file"
          accept="image/*"
          className="file-input file-input-xs w-full max-w-xs"
          onChange={onChange}
        />
      )}
    </div>
  );
}

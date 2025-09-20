import type { Role } from "../types";
import type { CharacterData } from "./types";
import { useGenerateAbilityByRuleMutation, useGenerateBasicInfoByRuleMutation, useSetRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useCreateRoleMutation, useUpdateRoleWithLocalMutation, useUploadAvatarMutation } from "api/queryHooks";
import { useEffect, useState } from "react";
import RulesSection from "../rules/RulesSection";
import Section from "../Section";
import AIGenerationCard from "./components/AIGenerationCard";
import AttributeEditor from "./components/AttributeEditor";
import CreatePageHeader from "./components/CreatePageHeader";

interface AICreateRoleProps {
  onBack?: () => void;
  onComplete?: (characterData: Role, ruleId?: number) => void;
  // 添加状态维护相关的props
  setRoles?: React.Dispatch<React.SetStateAction<Role[]>>;
  setSelectedRoleId?: (id: number | null) => void;
  onSave?: (updatedRole: Role) => void;
}

/**
 * AI智能创建角色组件
 * 通过AI辅助，一站式完成角色创建
 */
export default function AICreateRole({
  onBack,
  onComplete,
  setRoles,
  setSelectedRoleId,
  onSave,
}: AICreateRoleProps) {
  // 角色数据状态
  const [characterData, setCharacterData] = useState<CharacterData>({
    name: "",
    description: "",
    avatar: "",
    ruleId: 0,
    act: {},
    basic: {},
    ability: {},
    skill: {},
  });

  // AI相关状态
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGenerationStep, setCurrentGenerationStep] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // 表单验证
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 跟踪当前已加载的规则ID，用于检测规则变更
  const [loadedRuleId, setLoadedRuleId] = useState<number>(0);

  // API hooks
  const { mutateAsync: createRole } = useCreateRoleMutation();
  const { mutateAsync: uploadAvatar } = useUploadAvatarMutation();
  const { mutate: generateBasicInfoByRule } = useGenerateBasicInfoByRuleMutation();
  const { mutate: generateAbilityByRule } = useGenerateAbilityByRuleMutation();
  const { mutate: setRoleAbility } = useSetRoleAbilityMutation();
  // 添加更新角色的hook，只有在onSave存在时才使用
  const { mutate: updateRole } = useUpdateRoleWithLocalMutation(onSave || (() => { }));

  // 获取规则详情
  const selectedRuleId = characterData.ruleId || 0;
  const isValidRuleId = !Number.isNaN(selectedRuleId) && selectedRuleId > 0;
  const { data: ruleDetailData } = useRuleDetailQuery(selectedRuleId, {
    enabled: isValidRuleId, // 只有当 ruleId 有效时才发送请求
  });

  // 常量
  const NAME_MAX = 10;
  const DESC_MAX = 140;

  // 检查是否可以保存
  const canSave = characterData.name.trim()
    && characterData.description.trim()
    && characterData.ruleId;

  // 检查基础信息是否完整（用于AI生成）
  const isBasicInfoComplete = characterData.name.trim()
    && characterData.description.trim()
    && characterData.ruleId;

  // 处理规则系统变更
  const handleruleIdChange = (currentRuleId: number) => {
    setCharacterData(prev => ({ ...prev, ruleId: currentRuleId }));

    // 重置已加载的规则ID，这样可以触发新规则的数据初始化
    setLoadedRuleId(0);

    // 清除错误信息
    if (errors.ruleId) {
      setErrors(prev => ({ ...prev, ruleId: "" }));
    }
  };

  // 当规则数据加载完成时，自动填充默认属性
  useEffect(() => {
    // 当规则有效且规则数据加载完成时，并且（首次加载或规则发生了变更）
    if (isValidRuleId && ruleDetailData && characterData.ruleId
      && (loadedRuleId === 0 || loadedRuleId !== selectedRuleId)) {
      // 转换 actTemplate 为字符串类型
      const actData: Record<string, string> = {};
      if (ruleDetailData.actTemplate) {
        Object.entries(ruleDetailData.actTemplate).forEach(([key, value]) => {
          actData[key] = String(value);
        });
      }

      // 处理 basicDefault，统一转换为字符串
      const basicData: Record<string, string> = {};
      if (ruleDetailData.basicDefault) {
        Object.entries(ruleDetailData.basicDefault).forEach(([key, value]) => {
          basicData[key] = String(value);
        });
      }

      // 处理 abilityFormula，统一转换为字符串
      const abilityData: Record<string, string> = {};
      if (ruleDetailData.abilityFormula) {
        Object.entries(ruleDetailData.abilityFormula).forEach(([key, value]) => {
          abilityData[key] = String(value);
        });
      }

      // 处理 skillDefault，统一转换为字符串
      const skillData: Record<string, string> = {};
      if (ruleDetailData.skillDefault) {
        Object.entries(ruleDetailData.skillDefault).forEach(([key, value]) => {
          skillData[key] = String(value);
        });
      }

      setCharacterData(prev => ({
        ...prev,
        act: ruleDetailData.actTemplate || {},
        basic: ruleDetailData.basicDefault || {},
        ability: ruleDetailData.abilityFormula || {},
        skill: ruleDetailData.skillDefault || {},
      }));

      // 记录已加载的规则ID
      setLoadedRuleId(selectedRuleId);
    }
  }, [isValidRuleId, ruleDetailData, characterData.ruleId, loadedRuleId, selectedRuleId]);

  // 处理基础信息变更
  const handleBasicInfoChange = (field: string, value: string) => {
    setCharacterData(prev => ({ ...prev, [field]: value }));

    // 清除对应字段的错误
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  // 处理属性变更
  const handleAttributeChange = (
    section: "act" | "basic" | "ability" | "skill",
    key: string,
    value: string,
  ) => {
    setCharacterData(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  // 处理添加字段
  const handleAddField = (
    section: "act" | "basic" | "ability" | "skill",
    key: string,
    value: string,
  ) => {
    setCharacterData(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  // 处理删除字段
  const handleDeleteField = (
    section: "act" | "basic" | "ability" | "skill",
    key: string,
  ) => {
    setCharacterData((prev) => {
      const newSection = { ...prev[section] };
      delete newSection[key];
      return {
        ...prev,
        [section]: newSection,
      };
    });
  };

  // 处理重命名字段
  const handleRenameField = (
    section: "act" | "basic" | "ability" | "skill",
    oldKey: string,
    newKey: string,
  ) => {
    setCharacterData((prev) => {
      const value = prev[section][oldKey];
      const newSection = { ...prev[section] };
      delete newSection[oldKey];
      newSection[newKey] = value;
      return {
        ...prev,
        [section]: newSection,
      };
    });
  };

  // AI生成处理
  const handleAIGenerate = async () => {
    // 验证基础信息是否完整
    if (!isBasicInfoComplete) {
      // 设置错误提示
      const newErrors: Record<string, string> = {};
      if (!characterData.name.trim()) {
        newErrors.name = "请先填写角色名称";
      }
      if (!characterData.description.trim()) {
        newErrors.description = "请先填写角色描述";
      }
      if (!characterData.ruleId) {
        newErrors.ruleId = "请先选择规则系统";
      }
      setErrors(newErrors);
      return;
    }

    if (!aiPrompt.trim()) {
      return;
    }

    if (!isValidRuleId) {
      return;
    }

    setIsGenerating(true);
    setCurrentGenerationStep("开始生成");

    try {
      const ruleId = selectedRuleId; // 使用已验证的 ruleId

      // 生成角色表演能力 (act)
      setCurrentGenerationStep("生成角色表演能力...");
      await new Promise((resolve) => {
        generateBasicInfoByRule(
          { ruleId, prompt: aiPrompt },
          {
            onSuccess: (data) => {
              if (data?.data) {
                const actData: Record<string, string> = {};
                Object.entries(data.data).forEach(([key, value]) => {
                  actData[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
                });

                setCharacterData(prev => ({
                  ...prev,
                  act: { ...prev.act, ...actData },
                }));
              }
              resolve(data);
            },
            onError: (error) => {
              console.error("生成角色表演能力失败:", error);
              resolve(null);
            },
          },
        );
      });

      // 生成基础信息、能力数据和技能 (basic + ability + skill)
      setCurrentGenerationStep("生成基础信息、能力数据和技能...");
      await new Promise((resolve) => {
        generateAbilityByRule(
          { ruleId, prompt: aiPrompt },
          {
            onSuccess: (data) => {
              if (data?.data) {
                // 处理返回的嵌套数据结构
                const responseData = data.data;

                // 提取 basic 数据
                const basicData: Record<string, string> = {};
                if (responseData.basic) {
                  Object.entries(responseData.basic).forEach(([key, value]) => {
                    basicData[key] = String(value);
                  });
                }

                // 提取 ability 数据（对应"属性"字段）
                const abilityData: Record<string, string> = {};
                if (responseData.属性 || responseData.ability) {
                  const abilitySource = responseData.属性 || responseData.ability;
                  Object.entries(abilitySource).forEach(([key, value]) => {
                    abilityData[key] = String(value);
                  });
                }

                // 提取 skill 数据（对应"技能"字段）
                const skillData: Record<string, string> = {};
                if (responseData.技能 || responseData.skill) {
                  const skillSource = responseData.技能 || responseData.skill;
                  Object.entries(skillSource).forEach(([key, value]) => {
                    skillData[key] = String(value);
                  });
                }

                setCharacterData(prev => ({
                  ...prev,
                  basic: { ...prev.basic, ...basicData },
                  ability: { ...prev.ability, ...abilityData },
                  skill: { ...prev.skill, ...skillData },
                }));
              }
              resolve(data);
            },
            onError: (error) => {
              console.error("生成能力数据失败:", error);
              resolve(null);
            },
          },
        );
      });

      setCurrentGenerationStep("生成完成");
    }
    catch (error) {
      console.error("AI生成失败:", error);
    }
    finally {
      setIsGenerating(false);
      setCurrentGenerationStep("");
    }
  };

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!characterData.name.trim()) {
      newErrors.name = "角色名称不能为空";
    }

    if (!characterData.description.trim()) {
      newErrors.description = "角色描述不能为空";
    }

    if (!characterData.ruleId) {
      newErrors.ruleId = "请选择规则系统";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 保存角色
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // 1. 创建角色
      const roleId = await createRole({
        roleName: characterData.name,
        description: characterData.description,
      });

      if (!roleId) {
        throw new Error("角色创建失败");
      }

      // 2. 上传头像 (使用默认头像)

      const avatarRes = await uploadAvatar({
        avatarUrl: "/favicon.ico",
        spriteUrl: "/favicon.ico",
        roleId,
      });

      if (!avatarRes?.data?.avatarId) {
        throw new Error("头像上传失败 - 未返回有效的 avatarId");
      }

      // 3. 设置角色能力数据
      if (characterData.ruleId && isValidRuleId) {
        const ruleId = selectedRuleId; // 使用已验证的 ruleId

        setRoleAbility({
          ruleId,
          roleId,
          act: characterData.act,
          basic: characterData.basic,
          ability: characterData.ability,
          skill: characterData.skill,
        });
      }

      // 4. 创建Role对象并维护状态（参考Sidebar的handleCreate）
      const newRole: Role = {
        id: roleId,
        name: characterData.name,
        description: characterData.description,
        avatar: avatarRes.data.avatarUrl || "/favicon.ico",
        avatarId: avatarRes.data.avatarId,
        modelName: "散华", // 默认模型名
        speakerName: "鸣潮", // 默认说话人名
      };

      // 5. 更新角色列表状态（如果提供了setRoles）
      if (setRoles) {
        setRoles(prev => [newRole, ...prev]);
      }

      // 6. 设置选中的角色ID（如果提供了setSelectedRoleId）
      if (setSelectedRoleId) {
        setSelectedRoleId(newRole.id);
      }

      // 7. 调用updateRole进行角色更新（如果提供了onSave）
      if (onSave) {
        updateRole(newRole);
      }

      // 8. 调用完成回调
      onComplete?.(newRole, characterData.ruleId);
    }
    catch (error) {
      console.error("❌ 保存角色失败:", error);
    }
    finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 头部 */}
      <CreatePageHeader
        title="AI智能创建角色"
        description="描述你的想法，AI将帮你创建完整的角色"
        onBack={onBack}
      >
        {currentGenerationStep && (
          <span className="ml-2 text-primary">
            {currentGenerationStep}
          </span>
        )}
      </CreatePageHeader>

      <div className="space-y-6">
        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：规则选择 */}
          <div className="lg:col-span-1 ">
            <div className="card bg-base-100 shadow-sm rounded-2xl border-2 border-base-content/10">
              <div className="card-body md:min-h-[448px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="card-title text-lg">⚙️ 规则系统</h3>
                  {!characterData.ruleId && !errors.ruleId && (
                    <span className="text-warning text-xs">请选择以使用AI功能</span>
                  )}
                  {characterData.ruleId && (
                    <span className="text-success text-xs">✓</span>
                  )}
                </div>
                <RulesSection
                  currentRuleId={selectedRuleId}
                  onRuleChange={handleruleIdChange}
                />
                {errors.ruleId && (
                  <div className="text-error text-sm mt-2">{errors.ruleId}</div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：基础信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基础信息 */}
            <div className="card bg-base-100 shadow-sm rounded-2xl border-2 border-base-content/10">
              <div className="card-body md:min-h-[448px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="card-title text-lg">📝 基础信息</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 角色名 */}
                  <div className="form-control">
                    <div className="flex gap-2 mb-2 items-center font-semibold">
                      <span>角色名称</span>
                      {characterData.name.trim()
                        ? (
                            <span className="text-success text-xs">✓</span>
                          )
                        : (
                            <span className="text-error text-xs">✕ 请填写以使用AI创建角色</span>
                          )}
                      <span className="label-text-alt text-base-content/60">
                        {characterData.name.length}
                        /
                        {NAME_MAX}
                      </span>
                    </div>
                    <input
                      type="text"
                      className={`input input-bordered rounded-md w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.name ? "input-error" : characterData.name.trim() ? "input-success" : ""}`}
                      placeholder="输入角色名称"
                      value={characterData.name}
                      maxLength={NAME_MAX}
                      onChange={e => handleBasicInfoChange("name", e.target.value)}
                    />
                    {errors.name && (
                      <div className="text-error text-sm mt-1">{errors.name}</div>
                    )}
                  </div>

                  {/* 角色描述 */}
                  <div className="form-control md:col-span-2">
                    <div className="flex gap-2 mb-2 items-center font-semibold">
                      <span>角色描述</span>
                      {characterData.description.trim()
                        ? (
                            <span className="text-success text-xs">✓</span>
                          )
                        : (
                            <span className="text-error text-xs">✕ 请填写以使用AI创建角色</span>
                          )}
                      <span className="label-text-alt text-base-content/60">
                        {characterData.description.length}
                        /
                        {DESC_MAX}
                      </span>
                    </div>
                    <textarea
                      className={`textarea textarea-bordered rounded-md min-h-[220px] resize-y w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.description ? "textarea-error" : characterData.description.trim() ? "textarea-success" : ""}`}
                      placeholder="描述角色的背景故事、性格特点、外貌特征等..."
                      value={characterData.description}
                      maxLength={DESC_MAX}
                      onChange={e => handleBasicInfoChange("description", e.target.value)}
                    />
                    {errors.description && (
                      <div className="text-error text-sm mt-1">{errors.description}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI生成卡片 */}
        <AIGenerationCard
          title="描述你的角色想法"
          description="详细描述角色的背景、性格、能力特点，AI会根据描述生成完整的角色信息"
          placeholder="例如：一个来自北方的勇敢战士，擅长双手剑，有着保护弱者的坚定信念，曾经是皇家骑士团的成员..."
          prompt={aiPrompt}
          isGenerating={isGenerating}
          disabled={!isBasicInfoComplete}
          onPromptChange={setAiPrompt}
          onGenerate={handleAIGenerate}
        />

        {/* 角色属性 - 只有在选择规则系统后才显示 */}
        {characterData.ruleId && (
          <>
            <div className="divider"></div>
            <div className="space-y-6">
              {/* 角色表演能力 */}
              <Section title="角色表演能力" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
                {currentGenerationStep === "生成角色表演能力..."
                  ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-4">
                          <span className="loading loading-spinner loading-lg text-primary"></span>
                          <div className="text-center">
                            <div className="text-lg font-medium text-primary">AI正在生成中...</div>
                            <div className="text-sm text-base-content/60 mt-1">
                              {currentGenerationStep}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  : (
                      <AttributeEditor
                        title="角色表演能力"
                        attributes={characterData.act}
                        onChange={(key, value) => handleAttributeChange("act", key, value)}
                        onAddField={(key, value) => handleAddField("act", key, value)}
                        onDeleteField={key => handleDeleteField("act", key)}
                        onRenameField={(oldKey, newKey) => handleRenameField("act", oldKey, newKey)}
                      />
                    )}
              </Section>

              {/* 基础能力值 */}
              <Section title="基础属性配置" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
                {currentGenerationStep === "生成基础信息、能力数据和技能..."
                  ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-4">
                          <span className="loading loading-spinner loading-lg text-primary"></span>
                          <div className="text-center">
                            <div className="text-lg font-medium text-primary">AI正在生成中...</div>
                            <div className="text-sm text-base-content/60 mt-1">
                              {currentGenerationStep}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  : (
                      <AttributeEditor
                        title="基础能力值"
                        attributes={characterData.basic}
                        onChange={(key, value) => handleAttributeChange("basic", key, value)}
                        onAddField={(key, value) => handleAddField("basic", key, value)}
                        onDeleteField={key => handleDeleteField("basic", key)}
                        onRenameField={(oldKey, newKey) => handleRenameField("basic", oldKey, newKey)}
                      />
                    )}
              </Section>

              {/* 计算能力值 */}
              <Section title="能力配置" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
                {currentGenerationStep === "生成基础信息、能力数据和技能..."
                  ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-4">
                          <span className="loading loading-spinner loading-lg text-primary"></span>
                          <div className="text-center">
                            <div className="text-lg font-medium text-primary">AI正在生成中...</div>
                            <div className="text-sm text-base-content/60 mt-1">
                              {currentGenerationStep}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  : (
                      <AttributeEditor
                        title="计算能力值"
                        attributes={characterData.ability}
                        onChange={(key, value) => handleAttributeChange("ability", key, value)}
                        onAddField={(key, value) => handleAddField("ability", key, value)}
                        onDeleteField={key => handleDeleteField("ability", key)}
                        onRenameField={(oldKey, newKey) => handleRenameField("ability", oldKey, newKey)}
                      />
                    )}
              </Section>

              {/* 技能设定 */}
              <Section title="技能设定" className="rounded-2xl md:border-2 md:border-base-content/10 bg-base-100">
                {currentGenerationStep === "生成基础信息、能力数据和技能..."
                  ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-4">
                          <span className="loading loading-spinner loading-lg text-primary"></span>
                          <div className="text-center">
                            <div className="text-lg font-medium text-primary">AI正在生成中...</div>
                            <div className="text-sm text-base-content/60 mt-1">
                              {currentGenerationStep}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  : (
                      <AttributeEditor
                        title="技能设定"
                        attributes={characterData.skill}
                        onChange={(key, value) => handleAttributeChange("skill", key, value)}
                        onAddField={(key, value) => handleAddField("skill", key, value)}
                        onDeleteField={key => handleDeleteField("skill", key)}
                        onRenameField={(oldKey, newKey) => handleRenameField("skill", oldKey, newKey)}
                      />
                    )}
              </Section>
            </div>
          </>
        )}

        {/* 底部操作按钮 */}
        <div className="flex justify-between items-center pt-6 border-t">
          <div className="text-sm text-base-content/60">
            {canSave ? "角色信息完整，可以保存" : "请完善必填信息"}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setCharacterData({
                  name: "",
                  description: "",
                  avatar: "",
                  ruleId: 0,
                  act: {},
                  basic: {},
                  ability: {},
                  skill: {},
                });
                setAiPrompt("");
                setErrors({});
              }}
            >
              重置
            </button>
            <button
              type="button"
              className={`btn btn-primary ${!canSave || isSaving ? "btn-disabled" : ""}`}
              onClick={handleSave}
              disabled={!canSave || isSaving}
            >
              {isSaving
                ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      保存中...
                    </>
                  )
                : (
                    "保存角色"
                  )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

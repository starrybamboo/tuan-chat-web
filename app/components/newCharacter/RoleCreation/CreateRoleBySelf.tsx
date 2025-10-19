import type { Role } from "../types";
import type { CharacterData } from "./types";
import { useSetRoleAbilityMutation } from "api/hooks/abilityQueryHooks";
import { useRuleDetailQuery } from "api/hooks/ruleQueryHooks";
import { useCreateRoleMutation, useUpdateRoleWithLocalMutation, useUploadAvatarMutation } from "api/queryHooks";
import { useCallback, useEffect, useState } from "react";
import RulesSection from "../rules/RulesSection";
import CreatePageHeader from "./components/CreatePageHeader";
import NavigationButtons from "./components/NavigationButtons";
import StepIndicator from "./components/StepIndicator";
import { STEPS } from "./constants";
import AttributeStep from "./steps/AttributeStep";
import BasicInfoStep from "./steps/BasicInfoStep";

interface CreateRoleBySelfProps {
  onBack?: () => void;
  // 侧边栏同步所需，可选传入（与 AICreateRole 保持一致）
  setRoles?: React.Dispatch<React.SetStateAction<Role[]>>;
  setSelectedRoleId?: (id: number | null) => void;
  onSave?: (updatedRole: Role) => void;
  onComplete?: (role: Role, ruleId?: number) => void; // 创建完成回调（本组件新增）
}

export default function CreateRoleBySelf({ onBack, setRoles, setSelectedRoleId, onSave, onComplete }: CreateRoleBySelfProps) {
  const [currentStep, setCurrentStep] = useState(1);
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
  const { mutateAsync: createRole } = useCreateRoleMutation();
  const { mutateAsync: uploadAvatar } = useUploadAvatarMutation();
  const { mutate: setRoleAbility } = useSetRoleAbilityMutation();
  const { mutate: updateRole } = useUpdateRoleWithLocalMutation(onSave || (() => { }));
  const [isSaving, setIsSaving] = useState(false);

  // 监听选择的规则详情，填充默认模板
  const { data: ruleDetail } = useRuleDetailQuery(characterData.ruleId, { enabled: characterData.ruleId > 0 });
  useEffect(() => {
    if (!ruleDetail)
      return;
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setCharacterData(prev => ({
      ...prev,
      act: Object.keys(prev.act).length ? prev.act : (ruleDetail.actTemplate || {}),
      basic: Object.keys(prev.basic).length ? prev.basic : (ruleDetail.basicDefault || {}),
      ability: Object.keys(prev.ability).length ? prev.ability : (ruleDetail.abilityFormula || {}),
      skill: Object.keys(prev.skill).length ? prev.skill : (ruleDetail.skillDefault || {}),
    }));
  }, [ruleDetail]);

  const handleCharacterDataChange = (data: Partial<CharacterData>) => {
    setCharacterData(prev => ({ ...prev, ...data }));
  };

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

  const handleDeleteField = (
    section: "act" | "basic" | "ability" | "skill",
    key: string,
  ) => {
    setCharacterData((prev) => {
      const next = { ...prev[section] } as Record<string, string>;
      delete next[key];
      return { ...prev, [section]: next };
    });
  };

  const handleRenameField = (
    section: "act" | "basic" | "ability" | "skill",
    oldKey: string,
    newKey: string,
  ) => {
    if (!newKey.trim() || oldKey === newKey)
      return;
    setCharacterData((prev) => {
      if (newKey in prev[section])
        return prev; // 已存在
      const sectionData = { ...prev[section] } as Record<string, string>;
      const value = sectionData[oldKey];
      delete sectionData[oldKey];
      sectionData[newKey] = value;
      return { ...prev, [section]: sectionData };
    });
  };

  const handleRuleChange = useCallback((ruleId: number) => {
    setCharacterData(prev => ({ ...prev, ruleId }));
  }, []);
  // 仅限制前两步：
  // 第一步：名称与描述必填；第二步：必须选择规则；其余步骤不做限制
  const canProceedCurrent = currentStep === 1
    ? (characterData.name.trim().length > 0 && characterData.description.trim().length > 0)
    : currentStep === 2
      ? characterData.ruleId > 0
      : true;

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            characterData={characterData}
            onCharacterDataChange={handleCharacterDataChange}
          />
        );

      case 2:
        return (
          <RulesSection
            large
            currentRuleId={characterData.ruleId}
            onRuleChange={handleRuleChange}
          />
        );

      case 3:
        return (
          <AttributeStep
            title="角色表演能力"
            attributes={characterData.act}
            onAttributeChange={(key, value) => handleAttributeChange("act", key, value)}
            onAddField={(k, v) => handleAddField("act", k, v)}
            onDeleteField={k => handleDeleteField("act", k)}
            onRenameField={(ok, nk) => handleRenameField("act", ok, nk)}
          />
        );

      case 4:
        return (
          <>
            <AttributeStep
              title="基础能力值"
              attributes={characterData.basic}
              onAttributeChange={(key, value) => handleAttributeChange("basic", key, value)}
              onAddField={(k, v) => handleAddField("basic", k, v)}
              onDeleteField={k => handleDeleteField("basic", k)}
              onRenameField={(ok, nk) => handleRenameField("basic", ok, nk)}
            />
            <div className="mt-6">
              <AttributeStep
                title="计算能力值"
                attributes={characterData.ability}
                showInfoAlert={true}
                onAttributeChange={(key, value) => handleAttributeChange("ability", key, value)}
                onAddField={(k, v) => handleAddField("ability", k, v)}
                onDeleteField={k => handleDeleteField("ability", k)}
                onRenameField={(ok, nk) => handleRenameField("ability", ok, nk)}
              />
            </div>
          </>
        );

      case 5:
        return (
          <AttributeStep
            title="技能设定"
            attributes={characterData.skill}
            onAttributeChange={(key, value) => handleAttributeChange("skill", key, value)}
            onAddField={(k, v) => handleAddField("skill", k, v)}
            onDeleteField={k => handleDeleteField("skill", k)}
            onRenameField={(ok, nk) => handleRenameField("skill", ok, nk)}
          />
        );

      default:
        return null;
    }
  };

  const handleComplete = async () => {
    if (isSaving)
      return;
    // 基本校验：名称 / 描述 / 规则必选
    if (!characterData.name.trim() || !characterData.description.trim() || characterData.ruleId <= 0)
      return;

    setIsSaving(true);
    try {
      // 1. 创建角色，接口返回 roleId（参考 AICreateRole）
      const roleId = await createRole({
        roleName: characterData.name.trim(),
        description: characterData.description.trim(),
      });
      if (!roleId)
        throw new Error("角色创建失败");

      // 2. 上传默认头像（若后续提供头像上传 UI 可替换）
      let avatarId: number | undefined;
      let avatarUrl: string | undefined;
      try {
        const avatarRes = await uploadAvatar({
          avatarUrl: "/favicon.ico",
          spriteUrl: "/favicon.ico",
          roleId,
        });
        // avatarRes?.data 结构：updateRoleAvatar 返回对象，无法直接拿到 avatarId? 参考 AICreateRole 用法
        // AI 版本里 avatarRes.data.avatarId，因此这里尝试兼容该结构
        avatarId = avatarRes?.data?.avatarId || avatarRes?.data?.avatarId === 0 ? avatarRes?.data?.avatarId : undefined;
        avatarUrl = avatarRes?.data?.avatarUrl;
      }
      catch (e) {
        // 头像失败不阻断主流程，只记录
        console.warn("默认头像上传失败", e);
      }

      // 3. 写入能力/属性数据（若有规则且模板数据已经加载）
      if (characterData.ruleId > 0) {
        setRoleAbility({
          ruleId: characterData.ruleId,
          roleId,
          // 保留当前用户在属性步骤中可能修改过的值
          act: characterData.act,
          basic: characterData.basic,
          ability: characterData.ability,
          skill: characterData.skill,
        });
      }

      // 4. 本地侧边栏即时同步（若父级传入 setRoles）
      const newRole: Role = {
        id: roleId,
        name: characterData.name.trim(),
        description: characterData.description.trim(),
        avatar: avatarUrl || "/favicon.ico",
        avatarId: avatarId || 0,
        modelName: "散华",
        speakerName: "鸣潮",
      };

      if (setRoles) {
        setRoles(prev => [newRole, ...prev]);
      }
      if (setSelectedRoleId) {
        setSelectedRoleId(newRole.id);
      }
      // 触发 updateRole 用于其它依赖缓存更新
      updateRole(newRole);
      onComplete?.(newRole, characterData.ruleId);
      // TODO: 加入 toast 成功提示 / 自动跳转返回
    }
    catch (error) {
      console.error("创建角色失败", error);
    }
    finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 头部导航 */}
      <CreatePageHeader
        title="逐步自主创建"
        description="手动填写角色信息，完全自定义角色的每一个细节"
        onBack={onBack}
      />

      {/* 步骤指示器 */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* 步骤内容 */}
      <div className="mb-8">{renderStepContent()}</div>

      {/* 底部按钮 */}
      <NavigationButtons
        currentStep={currentStep}
        totalSteps={STEPS.length}
        canProceed={canProceedCurrent && !isSaving}
        onPrevious={() => setCurrentStep(Math.max(1, currentStep - 1))}
        onNext={() => {
          if (!canProceedCurrent || isSaving)
            return;
          setCurrentStep(Math.min(STEPS.length, currentStep + 1));
        }}
        onComplete={handleComplete}
      />
    </div>
  );
}

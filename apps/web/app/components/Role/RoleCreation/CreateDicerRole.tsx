import { Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { appToast } from "@/components/common/appToast/appToast";
import { Button } from "@/components/common/Button";
import { surfaceClassName } from "@/components/common/DesignLanguage";
import { FieldDescription, FieldError, TextArea, TextInput } from "@/components/common/FormField";

import type { Role } from "../types";

import { ROLE_DESCRIPTION_MAX_LENGTH, ROLE_DESCRIPTION_TOO_LONG_MESSAGE, ROLE_NAME_MAX_LENGTH } from "./constants";
import CreatePageHeader from "./CreatePageHeader";
import { useCreateRoleWithAbilityMutation } from "./hooks/useCreateRoleWithAbilityMutation";

type CreateDicerRoleProps = {
  onBack?: () => void;
  onComplete?: (role: Role, ruleId?: number) => void;
}

export default function CreateDicerRole({ onBack, onComplete }: CreateDicerRoleProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const createRoleWithAbility = useCreateRoleWithAbilityMutation();

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName || !trimmedDescription) {
      return;
    }

    if (trimmedDescription.length > ROLE_DESCRIPTION_MAX_LENGTH) {
      appToast.error(ROLE_DESCRIPTION_TOO_LONG_MESSAGE, { position: "top-center" });
      return;
    }

    setIsSaving(true);
    try {
      const newRole = await createRoleWithAbility.mutateAsync({
        roleName: trimmedName,
        description: trimmedDescription,
        type: 1,
        ruleId: 1,
      });
      onComplete?.(newRole, 1); // 默认规则ID为1
    }
    catch (error) {
      console.error("创建骰娘失败:", error);
    }
    finally {
      setIsSaving(false);
    }
  };

  const isDescriptionTooLong = description.trim().length > ROLE_DESCRIPTION_MAX_LENGTH;
  const canSubmit = name.trim().length > 0 && description.trim().length > 0 && !isDescriptionTooLong && !isSaving;

  return (
    <div className={`
      transition-opacity duration-300 ease-in-out motion-reduce:transition-none
      ${isSaving ? `opacity-50` : ""}
    `}>
      {/* 头部区域 */}
      <div className="max-w-4xl mx-auto p-6">
        <CreatePageHeader
          title={name || "创建骰娘"}
          description="骰娘创建"
          onBack={onBack}
          toolButtons={[
            {
              id: "create-dicer",
              label: isSaving ? "创建中..." : "创建骰娘",
              icon: <Plus className="size-4" weight="regular" />,
              onClick: handleSubmit,
              disabled: !canSubmit,
              variant: "primary",
            },
          ]}
        />

        <div className="
          md:hidden
          mb-4 space-y-2
        ">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                >
                  ← 返回
                </Button>
              )}
              <h1 className="font-semibold text-xl">{name || "创建骰娘"}</h1>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={isSaving}
              icon={<Plus className="size-4" weight="regular" />}
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`
                rounded-lg md:min-h-12 md:px-6 md:text-lg
                ${isSaving ? `scale-95` : ""}
              `}
            >
              {isSaving ? "创建中..." : "创建骰娘"}
            </Button>
          </div>
          <p className="text-sm text-base-content/60">骰娘创建</p>
        </div>

        {/* 表单区域 */}
        <div className="space-y-6">
          <div className={surfaceClassName({ level: "content", className: "border-2 border-base-content/10 p-6 shadow-xs" })}>
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-component-title font-medium">基础信息设置</h2>

              <div className="space-y-6">
                {/* 名称 */}
                <div>
                  <div className="flex gap-2 mb-2 items-center font-semibold">
                    <span>骰娘名称</span>
                    <FieldDescription as="span">
                      {name.length}
                      /
                      {ROLE_NAME_MAX_LENGTH}
                    </FieldDescription>
                  </div>
                  <TextInput
                    surface="muted"
                    type="text"
                    autoComplete="off"
                    aria-label="骰娘名称"
                    placeholder="输入骰娘名称"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    maxLength={ROLE_NAME_MAX_LENGTH}
                  />
                </div>

                {/* 描述 */}
                <div>
                  <div className="flex gap-2 mb-2 items-center font-semibold">
                    <span>骰娘简介</span>
                    {isDescriptionTooLong
                      ? <FieldError as="span">
                      {description.length}
                      /
                      {ROLE_DESCRIPTION_MAX_LENGTH}
                      </FieldError>
                      : <FieldDescription as="span">
                          {description.length}
                          /
                          {ROLE_DESCRIPTION_MAX_LENGTH}
                        </FieldDescription>}
                  </div>
                  <TextArea
                    surface="muted"
                    className="min-h-30"
                    autoComplete="off"
                    aria-label="骰娘简介"
                    placeholder="描述这个骰娘的背景故事、性格特点、说话风格等"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    maxLength={ROLE_DESCRIPTION_MAX_LENGTH}
                    aria-invalid={isDescriptionTooLong}
                  />
                  {isDescriptionTooLong && (
                    <p className="text-xs text-error mt-2">
                      骰娘简介最多
                      {" "}
                      {ROLE_DESCRIPTION_MAX_LENGTH}
                      {" "}
                      字，当前
                      {" "}
                      {description.length}
                      {" "}
                      字
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

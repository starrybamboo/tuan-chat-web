import type { CharacterData } from "../types";

import { FormField, TextArea, TextInput } from "@/components/common/FormField";
import { surfaceClassName } from "@/components/common/DesignLanguage";

import { ROLE_DESCRIPTION_MAX_LENGTH, ROLE_NAME_MAX_LENGTH } from "../constants";

type BasicInfoStepProps = {
  characterData: CharacterData;
  onCharacterDataChange: (data: Partial<CharacterData>) => void;
}

export default function BasicInfoStep({ characterData, onCharacterDataChange }: BasicInfoStepProps) {
  const descriptionLength = characterData.description?.length ?? 0;
  const isDescriptionTooLong = descriptionLength > ROLE_DESCRIPTION_MAX_LENGTH;
  const descriptionCounterClass = isDescriptionTooLong ? "text-error" : "text-base-content/60";

  return (
    <div className="space-y-6">
      <div className={surfaceClassName({ level: "content", className: "border-2 border-base-content/10 p-6 shadow-xs" })}>
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-component-title font-medium">
            基础信息设置
          </h3>

          {/* 基础文本信息：纵向布局 */}
          <div className="space-y-6">
            {/* 头像上传 */}
            {/* <div>
              <div className="flex gap-2 mb-2 items-center font-semibold">
                <span>角色头像</span>
              </div>
              <div className="flex items-center">
                <div className="w-20 h-20 border-2 border-dashed border-base-content/20 rounded-md flex items-center justify-center">
                </div>
              </div>
              <label className="label mt-2">
                <span className="label-text-alt">支持多种表情和姿态的差分图片</span>
              </label>
            </div> */}

            {/* 角色名 */}
            <FormField
              id="role-basic-info-name"
              label="角色名"
              labelAdornment={`${characterData.name?.length ?? 0} / ${ROLE_NAME_MAX_LENGTH}`}
            >
              {controlProps => (
                <TextInput
                  {...controlProps}
                  type="text"
                  name="role_name"
                  autoComplete="off"
                  surface="muted"
                  placeholder="输入角色名称"
                  value={characterData.name}
                  maxLength={ROLE_NAME_MAX_LENGTH}
                  onChange={e => onCharacterDataChange({ name: e.target.value })}
                />
              )}
            </FormField>

            {/* 角色简介 */}
            <FormField
              id="role-basic-info-description"
              label="角色简介"
              labelAdornment={(
                <span className={descriptionCounterClass}>
                  {descriptionLength}
                  {" / "}
                  {ROLE_DESCRIPTION_MAX_LENGTH}
                </span>
              )}
              error={isDescriptionTooLong
                ? `角色简介最多 ${ROLE_DESCRIPTION_MAX_LENGTH} 字，当前 ${descriptionLength} 字`
                : undefined}
            >
              {controlProps => (
                <TextArea
                  {...controlProps}
                  name="role_description"
                  autoComplete="off"
                  surface="muted"
                  className="min-h-30"
                  placeholder="描述角色的背景故事、性格特点、说话风格等"
                  value={characterData.description}
                  maxLength={ROLE_DESCRIPTION_MAX_LENGTH}
                  onChange={e => onCharacterDataChange({ description: e.target.value })}
                />
              )}
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { CharacterData } from "../types";

interface BasicInfoStepProps {
  characterData: CharacterData;
  onCharacterDataChange: (data: Partial<CharacterData>) => void;
}

export default function BasicInfoStep({ characterData, onCharacterDataChange }: BasicInfoStepProps) {
  const NAME_MAX = 10;
  const DESC_MAX = 150;
  return (
    <div className="space-y-6 ">
      <div className="card bg-base-100 shadow-xs rounded-2xl border-2 border-base-content/10">
        <div className="card-body">
          <h3 className="card-title flex items-center gap-2 mb-4">
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
            <div className="form-control">
              <div className="flex gap-2 mb-2 items-center font-semibold">
                <span>角色名</span>
                <span className="label-text-alt text-base-content/60">
                  {(characterData.name?.length ?? 0)}
                  /
                  {NAME_MAX}
                </span>
              </div>
              <input
                type="text"
                className="input input-bordered bg-base-200 rounded-md w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="输入角色名称"
                value={characterData.name}
                maxLength={NAME_MAX}
                onChange={e => onCharacterDataChange({ name: e.target.value })}
              />
            </div>

            {/* 角色简介 */}
            <div className="form-control">
              <div className="flex gap-2 mb-2 items-center font-semibold">
                <span>角色简介</span>
                <span className="label-text-alt text-base-content/60">
                  {(characterData.description?.length ?? 0)}
                  /
                  {DESC_MAX}
                </span>
              </div>
              <textarea
                className="textarea textarea-bordered bg-base-200 rounded-md min-h-[120px] resize-y w-full transition focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="描述角色的背景故事、性格特点、说话风格等"
                value={characterData.description}
                maxLength={DESC_MAX}
                onChange={e => onCharacterDataChange({ description: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

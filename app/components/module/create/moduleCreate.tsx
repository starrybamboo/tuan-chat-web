import type { SubmitHandler } from "react-hook-form";
import useSearchParamsState from "@/components/common/customHooks/useSearchParamState";
import TInput from "@/components/common/form/input";
import TTextArea from "@/components/common/form/textarea";
import message from "@/components/common/message/message";
import { PopWindow } from "@/components/common/popWindow";
import { CharacterCopper } from "@/components/newCharacter/sprite/CharacterCopper";
import { useAddModuleMutation } from "api/hooks/moduleQueryHooks";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import RuleSelect from "../common/ruleSelect";

// 合并表单值类型
/**
 * ModuleCreateRequest，新建模组请求
 */
export interface ModuleCreateRequest {
  /**
   * 模组作者名字
   */
  authorName: string;
  /**
   * 模组的描述
   */
  description?: string;
  /**
   * 模组名称
   */
  moduleName: string;
  /**
   * 所用的规则id
   */
  ruleId: number;
  [property: string]: any;
}

// 更新枚举以包含规则字段
enum ModuleFormKeys {
  AUTHOR_NAME = "authorName",
  DESCRIPTION = "description",
  MODULE_NAME = "moduleName",
  RULE_ID = "ruleId",
  IMAGE = "image",
}

function ModuleForm() {
  // 模组图片的裁切后版本, 仅用于展示, 实际上传的url
  // 储存在form中
  const [moduleAvatarUrl, setModuleAvatarUrl] = useState<string>("");
  const [modalOpen, setModalOpen] = useSearchParamsState(
    "moduleCreateModalOpen",
    false,
  );
  const navigate = useNavigate();

  // react-hook-form 的表单 object
  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ModuleCreateRequest>({
    mode: "onBlur",
    defaultValues: {
      [ModuleFormKeys.AUTHOR_NAME]: "",
      [ModuleFormKeys.DESCRIPTION]: "",
      [ModuleFormKeys.MODULE_NAME]: "",
      [ModuleFormKeys.RULE_ID]: undefined,
      [ModuleFormKeys.IMAGE]: "",
    },
  });
  const mutation = useAddModuleMutation();
  // 设置模组头像
  const setAvatar = useCallback((avatar: string) => {
    setValue(ModuleFormKeys.IMAGE, avatar);
  }, [setValue]);
  // 前往模组编辑页面
  const goToWorkSpace = useCallback(() => {
    navigate("/create");
  }, [navigate]);
  const onSubmit: SubmitHandler<ModuleCreateRequest> = (data) => {
    mutation.mutate(
      {
        ...data,
      },
      {
        onSuccess: () => {
          message.success("创建模组成功");
          setModalOpen(true);
          reset();
        },
      },
    );
  };

  const uniqueModuleAvatarName = `module_avatar_${Date.now()}`;

  return (
    <div className="w-full h-full flex gap-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full h-full flex gap-4"
      >
        {/* 左侧规则列表 */}
        <div
          className={`basis-1/3 bg-base-200 rounded-xl  ${
            errors.RuleSelect ? "border-2 border-error" : ""
          }`}
        >
          <div className="p-4">
            <Controller
              control={control}
              name="RuleSelect"
              rules={{ required: true }}
              render={({ field: { onChange } }) => (
                <RuleSelect
                  className="w-full h-full"
                  editable
                  onRuleSelect={(id) => {
                    setValue(ModuleFormKeys.RULE_ID, id);
                    onChange(id);
                  }}
                />
              )}
            />
            <div className="mt-2 text-error text-sm">规则选定后无法进行改变</div>
          </div>
        </div>
        {/* 右侧模组表单 */}
        <div className="basis-2/3 flex flex-col justify-around gap-4">
          <div className="flex gap-4">
            <div className="basis-2/3 flex flex-col gap-4">
              <TInput
                field={ModuleFormKeys.AUTHOR_NAME}
                register={register}
                name="模组作者"
                errors={errors}
              />
              <TInput
                field={ModuleFormKeys.MODULE_NAME}
                register={register}
                name="模组名称"
                errors={errors}
              />
            </div>
            <div
              className={`basis-1/3 flex items-center justify-center relative ${
                errors.image ? "border-2 border-error rounded-lg" : ""
              }`}
            >
              <Controller
                control={control}
                name="image"
                rules={{ required: "请上传模组封面" }}
                render={({ field: { onChange } }) => (
                  <CharacterCopper
                    fileName={uniqueModuleAvatarName}
                    setDownloadUrl={(url) => {
                      onChange(url);
                      setAvatar(url);
                    }}
                    scene={4}
                    setCopperedDownloadUrl={setModuleAvatarUrl}
                    wrapperClassName="w-full h-full"
                    triggerClassName="w-full h-full"
                  >
                    <div className="h-full w-full bg-base-300 rounded-lg border-2 border-dashed border-base-content/30 hover:border-primary hover:bg-base-200 transition-colors cursor-pointer flex flex-col items-center justify-center group">
                      {moduleAvatarUrl
                        ? (
                            <div className="relative w-full h-full">
                              <img
                                src={moduleAvatarUrl}
                                alt="模组头像"
                                className="w-full h-full object-cover rounded-lg"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                <svg
                                  className="w-6 h-6 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                              </div>
                            </div>
                          )
                        : (
                            <>
                              <svg
                                className="w-8 h-8 text-base-content/50 group-hover:text-primary mb-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span className="text-xs text-base-content/60 group-hover:text-primary text-center">
                                点击上传
                                <br />
                                模组封面
                              </span>
                            </>
                          )}
                    </div>
                  </CharacterCopper>
                )}
              />
              {errors.image && (
                <div className="absolute -bottom-6 left-0 text-error text-xs">
                  {typeof errors.image.message === "string"
                    ? errors.image.message
                    : "请上传模组封面"}
                </div>
              )}
            </div>
          </div>
          <TTextArea
            className="w-full"
            field={ModuleFormKeys.DESCRIPTION}
            register={register}
            name="模组描述"
            errors={errors}
          />
          <button
            type="submit"
            className="btn btn-primary mt-auto"
          >
            创建模组
          </button>
        </div>
      </form>

      <PopWindow
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="flex justify-center flex-col items-center gap-10">
          <p>
            模组创建成功, 需要开始编辑吗?
          </p>
          <div className="join">
            <button
              className="w-24 btn btn-primary join-item"
              type="button"
              onClick={goToWorkSpace}
            >
              去编辑
            </button>
            <button
              className="w-24 btn join-item"
              type="button"
              onClick={() => setModalOpen(false)}
            >
              取消
            </button>
          </div>
        </div>
      </PopWindow>
    </div>
  );
}

export default ModuleForm;

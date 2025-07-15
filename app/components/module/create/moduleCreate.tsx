import type { SubmitHandler } from "react-hook-form";
import TInput from "@/components/common/form/input";
import TTextArea from "@/components/common/form/textarea";
import message from "@/components/common/message/message";
import { useAddModuleMutation } from "api/hooks/moduleAndStageQueryHooks";
import { Controller, useForm } from "react-hook-form";
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
}

function ModuleForm() {
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
    },
  });
  const mutation = useAddModuleMutation();

  const onSubmit: SubmitHandler<ModuleCreateRequest> = (data) => {
    mutation.mutate(
      {
        ...data,
      },
      {
        onSuccess: () => {
          message.success("创建模组成功");
          reset();
        },
      },
    );
  };

  return (
    <div className="w-full h-full flex gap-4">

      <form onSubmit={handleSubmit(onSubmit)} className="w-full h-full flex gap-4">
        {/* 左侧规则列表 */}
        <div className={`basis-1/3 bg-base-200 rounded-xl  ${errors.RuleSelect ? "border-2 border-error" : ""}`}>
          <div className="p-4">
            <Controller
              control={control}
              name="RuleSelect"
              rules={{ required: true }}
              render={({ field: { onChange } }) => (
                <RuleSelect
                  className="w-full h-full"
                  onRuleSelect={(id) => {
                    setValue(ModuleFormKeys.RULE_ID, id);
                    onChange(id);
                  }}

                />
              )}
            />
          </div>
        </div>
        {/* 右侧模组表单 */}
        <div className="basis-2/3 flex flex-col justify-center gap-4">
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
    </div>
  );
}

export default ModuleForm;

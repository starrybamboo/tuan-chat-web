import type { SubmitHandler } from "react-hook-form";
import { ImgUploaderWithCopper } from "@/components/common/uploader/imgUploaderWithCopper";
import { useForm } from "react-hook-form";

interface ModuleFormValues {
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
  /**
   * 模组的图标
   */
  image: string;
  /**
   * 其他属性
   */
  [property: string]: any;
}

enum ModuleFormKeys {
  AUTHOR_NAME = "authorName",
  DESCRIPTION = "description",
  MODULE_NAME = "moduleName",
  RULE_ID = "ruleId",
  IMAGE = "image",
}

function ModuleForm() {
  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<ModuleFormValues>({
    mode: "onBlur", // 在失去焦点时验证表单
    defaultValues: {
      [ModuleFormKeys.AUTHOR_NAME]: "",
      [ModuleFormKeys.DESCRIPTION]: "",
      [ModuleFormKeys.MODULE_NAME]: "",
      [ModuleFormKeys.RULE_ID]: 0,
      [ModuleFormKeys.IMAGE]: "",
    },
  });
  const onSubmit: SubmitHandler<ModuleFormValues> = (data) => {
    console.warn("提交的数据:", JSON.stringify(data));
  };
  const imageUrl = watch(ModuleFormKeys.IMAGE);

  return (
    <div className="w-full rounded-md">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full h-min flex gap-[20px]"
      >
        <div className="basis-[30%] bg-neutral-500 hover:bg-neutral-400 hover:rounded-none rounded-md overflow-hidden transition-all aspect-square">
          <ImgUploaderWithCopper
            setDownloadUrl={() => {}}
            setCopperedDownloadUrl={(url) => {
              setValue(ModuleFormKeys.IMAGE, url);
            }}
            fileName={new Date().getTime().toString()}
          >
            {
              imageUrl
                ? (
                    <img src={imageUrl} alt="模组图标" className="w-full object-cover"></img>
                  )
                : (
                    <div className="w-full h-full flex items-center justify-center textarea-xl">请选择一张图片</div>
                  )
            }
          </ImgUploaderWithCopper>
        </div>
        <div className="basis-[70%] bg-base-200 flex flex-col gap-4 p-4 rounded-md">
          <div className="w-full flex gap-6">
            <fieldset className="fieldset basis-1/2 bg-base-200 border-base-300 rounded-box border p-4">
              <legend className="fieldset-legend py-0">
                模组作者
              </legend>
              <input
                className={`input rounded-sm ${errors.authorName && "input-error"}`}
                {...register(ModuleFormKeys.AUTHOR_NAME, { required: "请输入作者名称", setValueAs: (val: string) => val.trim() })}
              />
              <p className="label text-error">
                {errors.authorName ? errors.authorName.message : "\u00A0"}
              </p>
            </fieldset>

            <fieldset className="fieldset basis-1/2 bg-base-200 border-base-300 rounded-box border p-4">
              <legend className="fieldset-legend py-0">
                模组名称
              </legend>
              <input className={`input rounded-sm ${errors.moduleName && "input-error"}`} {...register(ModuleFormKeys.MODULE_NAME, { required: "请输入模组名称", setValueAs: (val: string) => val.trim() })} />
              <p className="label text-error">{ errors.moduleName ? errors.moduleName.message : "\u00A0"}</p>
            </fieldset>
          </div>

          <fieldset className="fieldset w-full bg-base-200 border-base-300 rounded-box border p-4">
            <legend className="fieldset-legend py-0">
              模组描述
            </legend>
            <textarea
              className={`textarea rounded-sm w-full max-h-32 ${errors.description && "textarea-error"}`}
              {...register(ModuleFormKeys.DESCRIPTION, { required: "请输入模组描述", setValueAs: (val: string) => val.trim() })}
            />
            <p className="label text-error">{ errors.description ? errors.description?.message : "\u00A0"}</p>
          </fieldset>

          <input type="submit" className="btn btn-success" value="提交" />
        </div>
      </form>
    </div>
  );
}

export default ModuleForm;

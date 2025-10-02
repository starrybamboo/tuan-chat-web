/**
 * 封装了react-hook-form的文本域组件
 *
 * @component TTextArea
 * @template T - 表单数据类型
 *
 * @example
 * ```tsx
 * const { register, formState: { errors } } = useForm<FormData>();
 *
 * <TTextArea
 *   field="description"
 *   name="描述"
 *   register={register}
 *   errors={errors}
 *   placeholder="请输入描述"
 * />
 * ```
 *
 * @prop {string} [className] - 自定义CSS类名
 * @prop {Path<T>} field - 表单字段名
 * @prop {string} name - 字段显示名称
 * @prop {UseFormRegister<T>} register - react-hook-form的register函数
 * @prop {FieldErrors<T>} errors - 表单错误对象
 * @prop {boolean} [isRequired=true] - 是否必填
 */

import type { FieldErrors, FieldValues, Path, UseFormRegister } from "react-hook-form";

type TextAreaHTMLAttributes = React.DetailedHTMLProps<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  HTMLTextAreaElement
>;

interface TextAreaProps<T extends FieldValues> extends Omit<TextAreaHTMLAttributes, "name"> {
  className?: string;
  field: Path<T>;
  name: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  isRequired?: boolean;
}

function TTextArea<T extends FieldValues>({
  className = "",
  field,
  name,
  register,
  errors,
  placeholder,
  isRequired = true,
  ...rest
}: TextAreaProps<T>) {
  return (
    <fieldset className={`fieldset bg-base-200 border-base-300 rounded-box border p-4 ${className}`}>
      <legend className="fieldset-legend py-0">
        {name}
      </legend>
      <textarea
        className={`textarea rounded-sm w-full resize-none max-h-32 ${errors[field] && "textarea-error"}`}
        placeholder={placeholder}
        {...register(field, {
          required: isRequired ? `请输入${name}` : false,
          setValueAs: (val: string) => val.trim(),
        })}
        {...rest}
      />
      <p className="label text-error">
        {errors[field] ? errors[field].message?.toString() : "\u00A0"}
      </p>
    </fieldset>
  );
}

export default TTextArea;

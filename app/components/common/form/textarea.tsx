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

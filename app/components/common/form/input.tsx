import type { FieldErrors, FieldValues, Path, UseFormRegister } from "react-hook-form";

type InputHTMLAttributes = React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
>;

interface InputProps<T extends FieldValues> extends Omit<InputHTMLAttributes, "name"> {
  className?: string;
  field: Path<T>;
  name: string;
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  isRequired?: boolean;
}

function TInput<T extends FieldValues>({
  className = "",
  field,
  name,
  register,
  errors,
  placeholder,
  isRequired = true,
  ...rest
}: InputProps<T>) {
  return (
    <fieldset className={`fieldset bg-base-200 border-base-300 rounded-box border p-4 ${className}`}>
      <legend className="fieldset-legend py-0">
        {name}
      </legend>
      <input
        className={`input rounded-sm ${errors[field] && "input-error"}`}
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

export default TInput;

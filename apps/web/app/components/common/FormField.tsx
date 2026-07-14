import type {
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

import { createElement, forwardRef } from "react";

import type { InterfaceDensity } from "@/components/common/DesignLanguage";
import type { FormControlAppearance, FormControlSurface } from "@/components/common/FormControlStyles";

import {
  formControlClassName,
  isFormControlInvalid,
} from "@/components/common/FormControlStyles";

export type { FormControlAppearance, FormControlSurface } from "@/components/common/FormControlStyles";
export { formControlClassName, formControlShellClassName } from "@/components/common/FormControlStyles";
export { SelectInput } from "@/components/common/SelectInput";
export type { SelectInputProps } from "@/components/common/SelectInput";

/** 统一需要自定义组合方式的字段垂直节奏。 */
export function FieldGroup({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`space-y-1.5 ${className}`} {...rest} />;
}

/** 统一自定义字段标签的字号、字重和可点击关系。 */
export function FieldLabel({ className = "", ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`flex items-baseline gap-2 text-sm font-medium text-base-content ${className}`} {...rest} />;
}

/** 统一自定义字段说明文案。 */
export function FieldDescription({
  as = "div",
  className = "",
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: "div" | "span" | "p" }) {
  return createElement(as, { ...rest, className: `text-xs leading-5 text-base-content/60 ${className}` });
}

/** 统一自定义字段错误文案及其可访问角色。 */
export function FieldError({
  as = "div",
  className = "",
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: "div" | "span" | "p" }) {
  return createElement(as, { ...rest, role: "alert", className: `text-xs leading-5 text-error ${className}` });
}

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  density?: InterfaceDensity;
  surface?: FormControlSurface;
  appearance?: FormControlAppearance;
};

/** 统一单行文本与数值输入的视觉和交互状态。 */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    density = "default",
    surface = "default",
    appearance = "field",
    className,
    "aria-invalid": ariaInvalid,
    ...rest
  },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={ariaInvalid}
      className={formControlClassName({
        density,
        surface,
        appearance,
        invalid: isFormControlInvalid(ariaInvalid),
        className,
      })}
      {...rest}
    />
  );
});

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  density?: InterfaceDensity;
  surface?: FormControlSurface;
  appearance?: FormControlAppearance;
};

/** 统一多行文本输入的视觉和交互状态。 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  {
    density = "default",
    surface = "default",
    appearance = "field",
    className,
    "aria-invalid": ariaInvalid,
    ...rest
  },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={ariaInvalid}
      className={formControlClassName({
        density,
        surface,
        appearance,
        invalid: isFormControlInvalid(ariaInvalid),
        className: `min-h-24 resize-y ${className ?? ""}`,
      })}
      {...rest}
    />
  );
});

export type ChoiceControlKind = "checkbox" | "radio" | "switch";

const CHOICE_KIND_CLASS: Record<ChoiceControlKind, string> = {
  checkbox: "tc-choice-control tc-checkbox",
  radio: "tc-choice-control tc-radio",
  switch: "tc-choice-control tc-switch",
};

const CHOICE_DENSITY_CLASS: Record<ChoiceControlKind, Record<InterfaceDensity, string>> = {
  checkbox: { compact: "tc-choice-compact", default: "tc-choice-default" },
  radio: { compact: "tc-choice-compact", default: "tc-choice-default" },
  switch: { compact: "tc-choice-compact", default: "tc-choice-default" },
};

/** 生成复选框、单选框和开关的统一尺寸与状态类。 */
export function choiceControlClassName({
  kind,
  density = "default",
  className,
}: {
  kind: ChoiceControlKind;
  density?: InterfaceDensity;
  className?: string;
}) {
  return [
    CHOICE_KIND_CLASS[kind],
    CHOICE_DENSITY_CLASS[kind][density],
    className ?? "",
  ].filter(Boolean).join(" ");
}

export type ChoiceControlProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
  density?: InterfaceDensity;
};

/** 统一复选框的尺寸、焦点、选中和禁用状态。 */
export const Checkbox = forwardRef<HTMLInputElement, ChoiceControlProps>(function Checkbox(
  { density = "default", className, ...rest },
  ref,
) {
  const controlClasses = choiceControlClassName({ kind: "checkbox", density, className });

  return (
    <input
      {...rest}
      ref={ref}
      type="checkbox"
      className={controlClasses}
    />
  );
});

/** 统一单选框的尺寸、焦点、选中和禁用状态。 */
export const Radio = forwardRef<HTMLInputElement, ChoiceControlProps>(function Radio(
  { density = "default", className, ...rest },
  ref,
) {
  const controlClasses = choiceControlClassName({ kind: "radio", density, className });

  return (
    <input
      {...rest}
      ref={ref}
      type="radio"
      className={controlClasses}
    />
  );
});

/** 统一布尔开关的尺寸、焦点、选中和禁用状态。 */
export const Switch = forwardRef<HTMLInputElement, ChoiceControlProps>(function Switch(
  { density = "default", className, ...rest },
  ref,
) {
  return (
    <input
      {...rest}
      ref={ref}
      type="checkbox"
      role="switch"
      className={choiceControlClassName({ kind: "switch", density, className })}
    />
  );
});

export type RangeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
  density?: InterfaceDensity;
};

/** 生成滑杆的统一尺寸与状态类。 */
export function rangeInputClassName({
  density = "default",
  className,
}: {
  density?: InterfaceDensity;
  className?: string;
} = {}) {
  return [
    "tc-range",
    density === "compact" ? "tc-range-compact" : "tc-range-default",
    className ?? "",
  ].filter(Boolean).join(" ");
}

/** 统一滑杆的尺寸、焦点、进度色和禁用状态。 */
export const RangeInput = forwardRef<HTMLInputElement, RangeInputProps>(function RangeInput(
  { density = "default", className, ...rest },
  ref,
) {
  return (
    <input
      {...rest}
      ref={ref}
      type="range"
      className={rangeInputClassName({ density, className })}
    />
  );
});

export type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
  density?: InterfaceDensity;
};

/** 生成文件选择器的统一尺寸与状态类。 */
export function fileInputClassName({
  density = "default",
  className,
}: {
  density?: InterfaceDensity;
  className?: string;
} = {}) {
  return [
    "tc-file-input",
    density === "compact" ? "tc-file-input-compact" : "tc-file-input-default",
    className ?? "",
  ].filter(Boolean).join(" ");
}

/** 统一原生文件选择器；上传拖放界面优先通过 UploadDropZone 组合本组件。 */
export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(function FileInput(
  { density = "default", className, ...rest },
  ref,
) {
  return (
    <input
      {...rest}
      ref={ref}
      type="file"
      className={fileInputClassName({ density, className })}
    />
  );
});

export type ColorInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
  density?: InterfaceDensity;
};

/** 统一颜色选择器的尺寸、边框、焦点和禁用状态。 */
export const ColorInput = forwardRef<HTMLInputElement, ColorInputProps>(function ColorInput(
  { density = "default", className, ...rest },
  ref,
) {
  return (
    <input
      {...rest}
      ref={ref}
      type="color"
      className={[
        "shrink-0 cursor-pointer rounded-md border border-base-300 bg-base-100 p-1",
        "focus:outline-none focus:ring-2 focus:ring-info/20 disabled:cursor-not-allowed disabled:opacity-45",
        density === "compact" ? "size-control-compact" : "size-control-default",
        className ?? "",
      ].filter(Boolean).join(" ")}
    />
  );
});

export type ChoiceFieldProps = {
  id: string;
  label: ReactNode;
  children: (controlProps: FormFieldControlProps) => ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  className?: string;
};

/** 统一复选框、单选框和开关的标签、说明与错误关联。 */
export function ChoiceField({
  id,
  label,
  children,
  description,
  error,
  className = "",
}: ChoiceFieldProps) {
  const descriptionId = description != null ? `${id}-description` : undefined;
  const errorId = error != null ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className="flex min-h-hit-default cursor-pointer items-center gap-3 text-sm font-medium text-base-content">
        {children({
          id,
          "aria-describedby": describedBy,
          "aria-invalid": error != null ? true : undefined,
        })}
        <span>{label}</span>
      </label>
      {description != null
        ? <div id={descriptionId} className="pl-8 text-xs leading-5 text-base-content/60">{description}</div>
        : null}
      {error != null
        ? <div id={errorId} role="alert" className="pl-8 text-xs leading-5 text-error">{error}</div>
        : null}
    </div>
  );
}

export type FormFieldControlProps = {
  id: string;
  "aria-labelledby": string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

export type FormFieldProps = {
  id: string;
  label: ReactNode;
  children: (controlProps: FormFieldControlProps) => ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  labelAdornment?: ReactNode;
  required?: boolean;
  className?: string;
};

/**
 * 统一字段标签、说明与错误文案，并把可访问关系传给实际输入控件。
 */
export function FormField({
  id,
  label,
  children,
  description,
  error,
  labelAdornment,
  required = false,
  className = "",
}: FormFieldProps) {
  const descriptionId = description != null ? `${id}-description` : undefined;
  const errorId = error != null ? `${id}-error` : undefined;
  const labelId = `${id}-label`;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label id={labelId} htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm font-medium text-base-content">
        <span>
          {label}
          {required ? <span className="ml-0.5 text-error" aria-hidden="true">*</span> : null}
        </span>
        {labelAdornment != null
          ? <span className="shrink-0 text-xs font-normal text-base-content/60">{labelAdornment}</span>
          : null}
      </label>
      {children({
        id,
        "aria-labelledby": labelId,
        "aria-describedby": describedBy,
        "aria-invalid": error != null ? true : undefined,
      })}
      {description != null
        ? <div id={descriptionId} className="text-xs leading-5 text-base-content/60">{description}</div>
        : null}
      {error != null
        ? <div id={errorId} role="alert" className="text-xs leading-5 text-error">{error}</div>
        : null}
    </div>
  );
}

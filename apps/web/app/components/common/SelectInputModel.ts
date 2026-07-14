import type { OptionHTMLAttributes, ReactNode } from "react";

import { Children, Fragment, isValidElement } from "react";

export type SelectOptionModel = {
  key: string;
  kind: "option" | "group";
  value: string;
  label: ReactNode;
  labelText: string;
  disabled: boolean;
};

function reactNodeToText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (!isValidElement<{ children?: ReactNode }>(node)) {
    return "";
  }
  return Children.toArray(node.props.children).map(reactNodeToText).join("");
}

/** 将原生 option/optgroup 子节点转换为浮层可消费的稳定模型。 */
export function normalizeSelectOptions(children: ReactNode) {
  const options: SelectOptionModel[] = [];
  let generatedKey = 0;

  function appendNodes(nodes: ReactNode, parentDisabled = false) {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) {
        return;
      }
      if (child.type === Fragment) {
        appendNodes((child.props as { children?: ReactNode }).children, parentDisabled);
        return;
      }
      if (child.type === "optgroup") {
        const props = child.props as { children?: ReactNode; disabled?: boolean; label?: string };
        const label = props.label ?? "";
        options.push({
          key: child.key == null ? `group-${generatedKey++}` : String(child.key),
          kind: "group",
          value: "",
          label,
          labelText: label,
          disabled: true,
        });
        appendNodes(props.children, parentDisabled || Boolean(props.disabled));
        return;
      }
      if (child.type !== "option") {
        return;
      }

      const props = child.props as OptionHTMLAttributes<HTMLOptionElement> & { children?: ReactNode };
      const label = props.label ?? props.children;
      const labelText = reactNodeToText(label).trim();
      const disabled = parentDisabled || Boolean(props.disabled);
      const isGroupLabel = disabled && props.value == null;
      options.push({
        key: child.key == null ? `${isGroupLabel ? "group" : "option"}-${generatedKey++}` : String(child.key),
        kind: isGroupLabel ? "group" : "option",
        value: isGroupLabel ? "" : String(props.value ?? labelText),
        label,
        labelText,
        disabled,
      });
    });
  }

  appendNodes(children);
  return options;
}

export function normalizeSelectValue(value: string | number | readonly string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value == null ? "" : String(value);
}

export function findBoundaryOptionIndex(options: SelectOptionModel[], edge: "first" | "last") {
  const start = edge === "first" ? 0 : options.length - 1;
  const step = edge === "first" ? 1 : -1;
  for (let index = start; index >= 0 && index < options.length; index += step) {
    if (options[index]?.kind === "option" && !options[index]?.disabled) {
      return index;
    }
  }
  return -1;
}

export function findRelativeOptionIndex(
  options: SelectOptionModel[],
  currentIndex: number,
  direction: 1 | -1,
) {
  if (options.length === 0) {
    return -1;
  }
  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (currentIndex + direction * offset + options.length) % options.length;
    if (options[index]?.kind === "option" && !options[index]?.disabled) {
      return index;
    }
  }
  return -1;
}

export function findTypeaheadOptionIndex(
  options: SelectOptionModel[],
  query: string,
  currentIndex: number,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return -1;
  }
  for (let offset = 1; offset <= options.length; offset += 1) {
    const index = (currentIndex + offset + options.length) % options.length;
    const option = options[index];
    if (option?.kind === "option" && !option.disabled && option.labelText.toLocaleLowerCase().startsWith(normalizedQuery)) {
      return index;
    }
  }
  return -1;
}

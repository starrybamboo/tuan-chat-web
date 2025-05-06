// 拆解二级对象并忽略第一个一级对象
export function flattenConstraints(constraints: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  // 获取所有 keys 并排序（确保顺序一致）
  const keys = Object.keys(constraints);

  // 跳过第一个 key（即 "a"）
  for (let i = 1; i < keys.length; i++) {
    const key = keys[i];
    const group = constraints[key];

    if (typeof group === "object" && group !== null) {
      for (const subKey in group) {
        result[subKey] = group[subKey];
      }
    }
  }

  return result;
}

// 用于拆解二级对象,方便下面覆盖
export function wrapIntoNested(keyPath: string[], valueObject: Record<string, any>): Record<string, any> {
  const result: any = {};
  let current = result;

  for (let i = 0; i < keyPath.length - 1; i++) {
    const key = keyPath[i];
    current[key] = {};
    current = current[key];
  }

  const lastKey = keyPath[keyPath.length - 1];
  current[lastKey] = valueObject;

  return result;
}

// 实施覆盖，一级对象覆盖二级对象
export function deepOverrideTargetWithSource(
  target: Record<string, any>,
  source: Record<string, any>,
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, targetVal] of Object.entries(target)) {
    const sourceVal = source?.[key];

    // 处理循环引用（可选）
    if (sourceVal === result)
      continue;

    // 判断是否需要递归合并对象
    const canRecurse
      = sourceVal
        && typeof sourceVal === "object"
        && !Array.isArray(sourceVal)
        && targetVal
        && typeof targetVal === "object"
        && !Array.isArray(targetVal);

    if (canRecurse) {
      result[key] = deepOverrideTargetWithSource(targetVal, sourceVal);
    }
    else if (source && Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = sourceVal;
    }
    else {
      result[key] = targetVal;
    }
  }

  return result;
}

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

  for (const key in target) {
    if (
      typeof source?.[key] === "object"
      && source?.[key] !== null
      && !Array.isArray(source?.[key])
      && typeof target?.[key] === "object"
      && target?.[key] !== null
      && !Array.isArray(target?.[key])
    ) {
      // 嵌套对象，递归处理
      result[key] = deepOverrideTargetWithSource(target[key], source?.[key]);
    }
    else {
      // 只有 source 存在这个字段时才更新
      if (source && Object.prototype.hasOwnProperty.call(source, key)) {
        result[key] = source[key];
      }
      else {
        // 否则保留 target 原值
        result[key] = target[key];
      }
    }
  }

  return result;
}

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

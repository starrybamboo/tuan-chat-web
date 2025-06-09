// types.ts
// 一个角色应该有东西
export type Role = {
  id: number;
  avatar?: string;
  name: string;
  description: string;
  avatarId: number;
  modelName: string;
  speakerName: string;
};

export type NumericalConstraint = {
  [key: string]: string | number;
};

export type NumericalConstraints = {
  [totalKey: string]: NumericalConstraint;
};

export type PerformanceFields = {
  [fieldName: string]: string;
};

export type GameRule = {
  id: number;
  name: string;
  description: string;
  // 允许包含任意数量的键值对，fieldName 为 string，value 为 string
  performance: PerformanceFields;
  numerical: NumericalConstraints;
};

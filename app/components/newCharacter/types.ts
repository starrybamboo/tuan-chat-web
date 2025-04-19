// types.ts
// 一个角色应该有东西
export type Role = {
  id: number;
  avatar?: string;
  name: string;
  description: string;
  avatarId: number;
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
  performance: PerformanceFields;
  numerical: NumericalConstraints;
};

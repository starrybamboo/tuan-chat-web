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
  [key: string]: number | string;
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
  performance: { [fieldName: string]: string };
  numerical: { [key: string]: number | string };
};

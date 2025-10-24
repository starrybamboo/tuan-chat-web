// @/components/common/dicer/pokemonSkills.d.ts
export type PokemonSkill = {
  id: string;
  name: string;
  type: string;
  category: "physical" | "special" | "status";
  power: number;
  accuracy: number;
  pp: number;
  effect: string;
  effectRate?: number; // 可选字段
};

// 声明 JSON 模块类型，确保导入时能识别类型
declare module "*.json" {
  const value: PokemonSkill[];
  export default value;
}

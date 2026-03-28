// @/components/common/dicer/pokemonSkills.d.ts
export type PokemonSkill = {
  id: number;
  name: string;
  type: string;
  category: "physical" | "special" | "status";
  power: number;
  accuracy: number;
  actionPointCost: number;
  effect: string;
  effectRate?: number; // 可选字段
};

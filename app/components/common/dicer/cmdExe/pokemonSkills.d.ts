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

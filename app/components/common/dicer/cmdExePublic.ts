import { RuleNameSpace } from "@/components/common/dicer/cmd";

// // 属性名中英文对照表
// const ABILITY_MAP: { [key: string]: string } = {
//   str: "力量",
//   dex: "敏捷",
//   pow: "意志",
//   con: "体质",
//   app: "外貌",
//   edu: "教育",
//   siz: "体型",
//   int: "智力",
//   san: "san值",
//   luck: "幸运",
//   mp: "魔法",
//   hp: "体力",
//   cm: "克苏鲁神话",
// };

const executorPublic = new RuleNameSpace(
  0,
  "通用",
  [""],
  "通用指令集",
);

export default executorPublic;

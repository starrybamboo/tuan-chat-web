declare module "pinyin-pro" {
  export type PinyinResultType = "string" | "array";

  export type PinyinOptions = {
    toneType?: "symbol" | "num" | "none";
    type?: PinyinResultType;
  };

  export function pinyin(text: string, options?: PinyinOptions & { type?: "string" }): string;
  export function pinyin(text: string, options: PinyinOptions & { type: "array" }): string[];
}

import * as toml from "@ltd/j-toml";
import * as yaml from "js-yaml";
import { parse as parseJsonc } from "jsonc-parser";

// 文件的解析和处理类
class DeckFile {
  deckOrigin: string; // 文件路径或者字符串
  deckFormat: string; // 文件格式标识
  deckObject: any; // 解析后的内容（对象）

  constructor(deckOrigin: string) {
    this.deckOrigin = deckOrigin;
    this.deckFormat = "";
    this.deckObject = null;
    this.detectDeckFileFormat(deckOrigin);
  }

  // 异步的初始化方法
  async init(): Promise<void> {
    await this.fetchDeckFileContent(this.deckOrigin);
  }

  detectDeckFileFormat(deckOrigin: string) {
    // Dice!
    if (deckOrigin.endsWith(".json")) {
      this.deckFormat = "json";
    }
    else if (deckOrigin.endsWith(".jsonc")) {
      this.deckFormat = "jsonc";
      // SinaNya
    }
    else if (deckOrigin.endsWith(".yaml") || deckOrigin.endsWith(".yml")) {
      this.deckFormat = "yaml";
      // Seal
    }
    else if (deckOrigin.endsWith(".toml")) {
      this.deckFormat = "toml";
    }
    else {
      this.deckFormat = "string";
    }
  }

  async fetchDeckFileContent(deckOrigin: string) {
    if (this.deckFormat === "json") {
      this.deckObject = await fetch(deckOrigin).then(res => res.json());
    }
    else if (this.deckFormat === "jsonc") {
      this.deckObject = await fetch(deckOrigin).then(res => res.text()).then(text => parseJsonc(text));
    }
    else if (this.deckFormat === "yaml") {
      this.deckObject = await fetch(deckOrigin).then(res => res.text()).then(text => yaml.load(text));
    }
    else if (this.deckFormat === "toml") {
      this.deckObject = await fetch(deckOrigin).then(res => res.text()).then(text => toml.parse(text));
    }
    else {
      // 如果是字符串，直接解析为 JSON 对象
      this.deckObject = JSON.parse(deckOrigin);
    }
  }
}

// 牌堆类
export class Deck {
  deckName: string;
  deckFile: DeckFile;
  deckItems: Record<string, string[]>;

  constructor(deckName: string, deckOrigin: string) {
    this.deckName = deckName;
    this.deckFile = new DeckFile(deckOrigin);
    this.deckItems = {};
  }

  async init() {
    await this.deckFile.init();
    this.deckItems = structuredClone(this.deckFile.deckObject); // 使用深拷贝
  }

  // 获取牌组中的某个项（数组）
  private getItem(deckItemName: string): string[] {
    return this.deckItems[deckItemName] || [];
  }

  // 等概率抽取一个（请不要使用这个方法，因为它已经被drawItemWithWeight包装！）
  drawItem(deckItemName: string): string {
    const values = this.getItem(deckItemName);
    if (values.length === 0)
      return "";

    const randomIndex = Math.floor(Math.random() * values.length);
    return values[randomIndex];
  }

  // 解析权重格式的字符串
  extractWeight(str: string): [number, string] {
    const regex = /^::(\d+)::(.*)$/;
    const match = regex.exec(str);
    if (match) {
      const weight = Number.parseInt(match[1], 10);
      const text = match[2].trim();
      return [weight, text];
    }
    return [1, str];
  }

  // 按权重抽取（包装drawItem，因为所有都是按权重抽取）
  drawItemWithWeight(deckItemName: string): string {
    const values = this.getItem(deckItemName);
    if (values.length === 0)
      return "";

    const choices = values.map((item) => {
      const [weight, text] = this.extractWeight(item);
      return { weight, text };
    });

    const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
    let random = Math.random() * totalWeight;

    for (const choice of choices) {
      random -= choice.weight;
      if (random <= 0) {
        return choice.text;
      }
    }

    return choices[choices.length - 1].text;
  }

  // 抽取多个，放回抽取
  drawMultiple(deckItemName: string, count: number): string[] {
    const values = this.getItem(deckItemName);
    if (values.length === 0)
      return [];

    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      const item = this.drawItemWithWeight(deckItemName);
      results.push(item);
    }
    return results;
  }

  // 抽取多个，不放回抽取
  drawMultipleWithoutReplacement(deckItemName: string, count: number): string[] {
    const values = this.getItem(deckItemName);
    if (values.length === 0)
      return [];

    if (count > values.length) {
      return ["抽取数量超过可用项数量"];
    }
    const results: Set<string> = new Set();
    while (results.size < count) {
      const item = this.drawItemWithWeight(deckItemName);
      results.add(item);
    }
    return Array.from(results);
  }

  // 解析字符串，判断是否出现引用
  hasReferences(str: string): boolean {
    const withReplacementRegex = /\{%[^}]+\}/; // 匹配 {%...}
    const withoutReplacementRegex = /\{[^%}][^}]*\}/; // 匹配 {...} 但不包含 {%...}
    return withReplacementRegex.test(str) || withoutReplacementRegex.test(str);
  }

  // 解析字符串，判断哪些引用出现，并且区分是否放回抽取
  // {%引用} 表示放回抽取
  // {引用} 表示不放回抽取
  parseStringReferences(str: string): Array<{
    index: number; // str中出现的第几个引用
    reference: string; // 引用标签
    withReplacement: boolean; // 是否放回抽取
    position: number; // 在字符串中的位置
    length: number; // 引用的长度
  }> {
    const withReplacementRegex = /\{%([^}]+)\}/g; // 匹配 {%...}
    const withoutReplacementRegex = /\{([^%}][^}]*)\}/g; // 匹配 {...} 但不包含 {%...}

    const matches: Array<{
      index: number;
      reference: string;
      withReplacement: boolean;
      position: number;
      length: number;
    }> = [];

    let match: RegExpExecArray | null;
    for (match = withReplacementRegex.exec(str); match !== null; match = withReplacementRegex.exec(str)) {
      matches.push({
        index: 0,
        reference: match[1].trim(),
        withReplacement: true,
        position: match.index,
        length: match[0].length,
      });
    }

    for (match = withoutReplacementRegex.exec(str); match !== null; match = withoutReplacementRegex.exec(str)) {
      matches.push({
        index: 0,
        reference: match[1].trim(),
        withReplacement: false,
        position: match.index,
        length: match[0].length,
      });
    }

    // 按在字符串中出现的位置排序
    matches.sort((a, b) => a.position - b.position);

    // 重新分配 index
    const result = matches.map((item, index) => ({
      index,
      reference: item.reference,
      withReplacement: item.withReplacement,
      position: item.position,
      length: item.length,
    }));

    return result;
  }

  // 解析字符串，判断是否出现掷骰

  // 处理字符串中的引用，实际抽取牌组内容并替换（会判断是否放回）
  parseStringWithReferences(str: string): string {
    const references = this.parseStringReferences(str);

    // 统计每个引用出现的次数
    const refCounts: Record<string, {
      count: number; // 引用出现的次数
      withReplacement: boolean; // 是否放回抽取
      indices: number[]; // 在原字符串中的索引位置
    }> = {};

    references.forEach((ref) => {
      const key = `${ref.reference}§${ref.withReplacement}`;
      if (!refCounts[key]) {
        refCounts[key] = {
          count: 0,
          withReplacement: ref.withReplacement,
          indices: [],
        };
      }
      refCounts[key].count++;
      refCounts[key].indices.push(ref.index);
    });

    // 为每个引用抽取结果
    const drawResults: Record<number, string> = {};

    Object.entries(refCounts).forEach(([key, info]) => {
      const refName = key.split("§")[0]; // 提取引用名

      if (info.withReplacement) {
        // 放回抽取
        const drawnItems = this.drawMultiple(refName, info.count);
        info.indices.forEach((index, i) => {
          drawResults[index] = drawnItems[i] || ""; // 防止数组越界
        });
      }
      else {
        // 不放回抽取
        const drawnItems = this.drawMultipleWithoutReplacement(refName, info.count);
        info.indices.forEach((index, i) => {
          drawResults[index] = drawnItems[i] || ""; // 防止数组越界
        });
      }
    });

    // 替换字符串中的引用
    let result = str;
    let offset = 0;

    references.forEach((ref) => {
      const actualPosition = ref.position + offset;
      const replacement = drawResults[ref.index] || "";

      result = result.substring(0, actualPosition)
        + replacement
        + result.substring(actualPosition + ref.length);

      offset += replacement.length - ref.length;
    });

    return result;
  }

  // 查看我能抽什么
  whatCanIDraw(): string[] {
    return Object.keys(this.deckItems);
  }

  // 抽牌吧！
  drawFromTheDeck(deckItemName: string) {
    const say = this.getItem(deckItemName);
    let result = "";

    if (say.length === 0) {
      return "";
    }
    else if (say.length === 1) {
      result = say[0];
    }
    else {
      result = this.drawItemWithWeight(deckItemName);
    }

    // 循环处理可能存在的引用
    while (this.hasReferences(result)) {
      result = this.parseStringWithReferences(result);
    }

    return result;
  }
}

// 使用示例
// const deck = new Deck("mydeck", JSONPATH);
// await deck.init();
// console.log(deck.drawFromTheDeck("调查员背景"));

// const deck = new Deck("mydeck2", JSONCPATH);
// await deck.init();
// console.log(deck.drawFromTheDeck("钓鱼"));

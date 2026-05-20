/**
 * AliasMap 类 - 单例全局别名映射集
 */
export class AliasMap {
  // 私有静态实例变量，存储类的唯一实例
  private static instance: AliasMap | null = null;

  // 私有属性，存储别名映射集
  private aliasMapSet: { [key: string]: Map <string, string> };

  /**
   * 私有构造函数，防止外部直接实例化
   * @param aliasMapSet 别名映射集
   */
  private constructor(aliasMapSet: { [key: string]: Map <string, string> }) {
    this.aliasMapSet = aliasMapSet;
  }

  /**
   * 获取或创建AliasMap的单例实例
   * @param aliasMapSet 别名映射集（仅在首次调用时有效）
   * @returns AliasMap的单例实例
   */
  public static getInstance(aliasMapSet?: { [key: string]: Map <string, string> }): AliasMap {
    // 如果实例不存在且提供了aliasMapSet参数，则创建新实例
    if (!AliasMap.instance && aliasMapSet) {
      AliasMap.instance = new AliasMap(aliasMapSet);
    }
    else if (!AliasMap.instance) {
      // 如果实例不存在且未提供参数，抛出错误
      throw new Error("AliasMap instance not initialized. Please provide aliasMapSet on first call.");
    }

    return AliasMap.instance;
  }

  /**
   * 获取指定规则代码下的别名映射
   * @param alias 别名
   * @param ruleCode 规则代码
   * @returns 映射后的别名，如果未找到则返回原始别名
   */
  public getAlias(alias: string, ruleCode: string): string {
    return this.aliasMapSet[ruleCode]?.get(alias) || alias;
  }
}

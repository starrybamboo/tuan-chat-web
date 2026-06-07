/**
 * message-stream 文档不再使用归档前远端快照同步；保留入口让归档流程不需要关心文档实现细节。
 */
export function prepareSpaceDocsForArchive(_spaceId: number): Promise<void> {
  return Promise.resolve();
}

let chatHistoryDbModulePromise: Promise<typeof import("./chatHistoryDb")> | null = null;

export function loadChatHistoryDb(): Promise<typeof import("./chatHistoryDb")> {
  chatHistoryDbModulePromise ??= import("./chatHistoryDb");
  return chatHistoryDbModulePromise;
}

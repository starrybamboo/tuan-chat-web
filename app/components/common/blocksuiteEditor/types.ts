export type BlocksuiteEditorStatus = "idle" | "loading" | "ready" | "error";

export type BlocksuiteEditorHandles = {
  workspace: unknown;
  page: unknown;
  /**
   * 实际挂载到 DOM 的编辑器元素。
   * 可能是 `simple-affine-editor`（推荐）或 `editor-container`。
   */
  editor: HTMLElement;
};

export type BlocksuiteEditorEngine = "simple" | "workspace";

export type BlocksuiteEditorOptions = {
  /**
   * 文档唯一标识，未传时使用默认值。
   */
  docId?: string;

  /**
   * 初始化引擎。
   * - `simple`: 使用 Blocksuite 自带 `<simple-affine-editor>`（开箱即用，适合嵌入式）
   * - `workspace`: 手动创建 Workspace/Page 并挂载 `editor-container`（便于后续持久化/协同扩展）
   */
  engine?: BlocksuiteEditorEngine;

  /** 是否自动聚焦到编辑器末尾（默认 true） */
  autofocus?: boolean;

  /** 编辑器模式（默认 page）。当前嵌入式场景建议保持 page。 */
  mode?: "page" | "edgeless";

  /** 是否禁用画板(edgeless)能力（默认 true） */
  disableEdgeless?: boolean;
  /**
   * 初始化成功后的回调，用于暴露 Blocksuite 实例。
   */
  onReady?: (handles: BlocksuiteEditorHandles) => void;
};

/**
 * message editor 运行时事件名。
 */
export type MessageEditorRuntimeEventMap = {
  activeBlockChanged: {
    blockId: string | null;
  };
  blocksChanged: {
    blockIds: string[];
  };
  selectionChanged: {
    blockIds: string[];
    multiBlock: boolean;
  };
  toolbarStateChanged: {
    visible: boolean;
  };
};

type Listener<Name extends keyof MessageEditorRuntimeEventMap> = (
  payload: MessageEditorRuntimeEventMap[Name],
) => void;

/**
 * 轻量 typed runtime event bus。
 */
export class MessageEditorEventBus {
  private readonly listeners = new Map<keyof MessageEditorRuntimeEventMap, Set<(...args: never[]) => void>>();

  /**
   * 订阅运行时事件。
   */
  on<Name extends keyof MessageEditorRuntimeEventMap>(name: Name, listener: Listener<Name>) {
    const current = this.listeners.get(name) ?? new Set();
    current.add(listener);
    this.listeners.set(name, current);

    return () => {
      current.delete(listener);
      if (current.size === 0) {
        this.listeners.delete(name);
      }
    };
  }

  /**
   * 发出运行时事件。
   */
  emit<Name extends keyof MessageEditorRuntimeEventMap>(name: Name, payload: MessageEditorRuntimeEventMap[Name]) {
    const current = this.listeners.get(name);
    if (!current?.size) {
      return;
    }

    for (const listener of current) {
      (listener as Listener<Name>)(payload);
    }
  }
}

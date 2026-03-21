declare module "@blocksuite/integration-test" {
  export class TestAffineEditorContainer extends HTMLElement {
    autofocus?: boolean;
    doc?: unknown;
    mode?: unknown;
    pageSpecs?: unknown;
    edgelessSpecs?: unknown;
    std?: any;
    updateComplete?: Promise<void>;
    switchEditor?: (mode: unknown) => void;
    host?: HTMLElement;
  }

  const editor: Record<string, unknown>;
  export default editor;
}

declare module "@blocksuite/integration-test/effects" {
  export const effects: () => void;
}

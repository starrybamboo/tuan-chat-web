declare module "@blocksuite/integration-test" {
  const editor: Record<string, unknown>;
  export default editor;
}

declare module "@blocksuite/integration-test/effects" {
  export const effects: () => void;
}

declare module "@blocksuite/integration-test/store" {
  export function getTestStoreManager(): any;
}

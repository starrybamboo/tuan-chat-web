export type MinimalDocMeta = { id: string; title?: string };

export type MinimalWorkspaceMeta = {
  docMetas?: MinimalDocMeta[];
};

export type SearchDocParams = {
  action: "insert" | string;
  userInput?: string;
  skipSelection?: boolean;
};

export type SearchDocResult
  = | { docId: string; isNewDoc: boolean }
    | { userInput: string };

export type BlocksuiteQuickSearchService = {
  searchDoc: (params: SearchDocParams) => Promise<SearchDocResult | null>;
  dispose: () => void;
  /** internal marker */
  __tuanchatQuickSearchService?: true;
};

export function createBlocksuiteQuickSearchService(params: {
  searchDoc: BlocksuiteQuickSearchService["searchDoc"];
  dispose?: () => void;
}): BlocksuiteQuickSearchService {
  return {
    searchDoc: params.searchDoc,
    dispose: params.dispose ?? (() => {}),
    __tuanchatQuickSearchService: true,
  };
}

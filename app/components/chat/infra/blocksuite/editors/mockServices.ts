import type {
  EditorSetting,
  ParseDocUrlService,
} from "@blocksuite/affine/shared/services";
import type { DeepPartial } from "@blocksuite/global/utils";
import type { Signal } from "@preact/signals-core";

import { GeneralSettingSchema } from "@blocksuite/affine/shared/services";
import { signal } from "@preact/signals-core";

let cachedEditorSetting$: Signal<DeepPartial<EditorSetting>> | null = null;

export function mockEditorSetting() {
  if (cachedEditorSetting$)
    return cachedEditorSetting$;

  const initialVal = Object.entries(GeneralSettingSchema.shape).reduce(
    (pre: EditorSetting, [key, schema]) => {
      // @ts-expect-error key is EditorSetting field
      pre[key as keyof EditorSetting] = schema.parse(undefined);
      return pre;
    },
    {} as EditorSetting,
  );

  const setting$ = signal<DeepPartial<EditorSetting>>(initialVal);
  cachedEditorSetting$ = setting$;
  return setting$;
}

export function mockParseDocUrlService(workspace: any) {
  const parseDocUrlService: ParseDocUrlService = {
    parseDocUrl: (url: string) => {
      if (url && URL.canParse(url)) {
        const path = decodeURIComponent(new URL(url).hash.slice(1));
        const docs: Iterable<{ id: string }>
          = workspace?.docs?.values?.() ?? ([] as { id: string }[]);
        const item
          = path.length > 0
            ? Array.from(docs).find(doc => doc.id === path)
            : null;
        if (item) {
          return { docId: item.id };
        }
      }
      return undefined;
    },
  };
  return parseDocUrlService;
}

import type { DocDisplayMetaParams, DocDisplayMetaExtension } from "@blocksuite/affine-shared/services";
import type { ExtensionType } from "@blocksuite/store";

import { DocDisplayMetaProvider, DocDisplayMetaService } from "@blocksuite/affine-shared/services";
import { StdIdentifier } from "@blocksuite/std";
import { computed, signal } from "@preact/signals-core";

function readTcHeaderTitleFromStore(store: unknown): string {
  try {
    const ydoc = (store as any)?.spaceDoc;
    const map = ydoc?.getMap?.("tc_header");
    const title = map?.get?.("title");
    return typeof title === "string" ? title.trim() : "";
  }
  catch {
    return "";
  }
}

export function readBlocksuiteDisplayTitle(doc: {
  meta?: { title?: string | null } | null;
  getStore?: () => unknown;
} | null | undefined): string {
  if (!doc) {
    return "Deleted doc";
  }

  const tcHeaderTitle = readTcHeaderTitleFromStore(doc.getStore?.());
  if (tcHeaderTitle) {
    return tcHeaderTitle;
  }

  const metaTitle = typeof doc.meta?.title === "string" ? doc.meta.title.trim() : "";
  if (metaTitle) {
    return metaTitle;
  }

  return "Untitled";
}

export class TcDocDisplayMetaService extends DocDisplayMetaService implements DocDisplayMetaExtension {
  override title(
    pageId: string,
    { title }: DocDisplayMetaParams = {},
  ) {
    const doc = this.std.workspace.getDoc(pageId);
    if (!doc) {
      return computed(() => title || "Deleted doc");
    }

    const store = doc.getStore();
    let title$ = this.titleMap.get(store);
    if (!title$) {
      title$ = signal(readBlocksuiteDisplayTitle(doc));

      const syncTitle = () => {
        title$!.value = readBlocksuiteDisplayTitle(doc);
      };

      const docMetaSubscription = this.std.workspace.slots.docListUpdated.subscribe(syncTitle);
      this.disposables.push(docMetaSubscription);

      try {
        const headerMap = (store as any)?.spaceDoc?.getMap?.("tc_header");
        if (headerMap?.observe) {
          const onHeaderChanged = () => {
            syncTitle();
          };
          headerMap.observe(onHeaderChanged);
          this.disposables.push(() => {
            try {
              headerMap.unobserve(onHeaderChanged);
            }
            catch {
              // ignore
            }
          });
        }
      }
      catch {
        // ignore
      }

      this.titleMap.set(store, title$);
    }

    return computed(() => {
      return title || title$.value;
    });
  }
}

export const TcDocDisplayMetaExtension: ExtensionType = {
  setup: (di: any) => {
    di.override(DocDisplayMetaProvider, (provider: any) => {
      return new TcDocDisplayMetaService(provider.get(StdIdentifier));
    });
  },
};

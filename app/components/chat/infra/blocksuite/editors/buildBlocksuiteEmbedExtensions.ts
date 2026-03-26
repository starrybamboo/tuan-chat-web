import { DocDisplayMetaProvider } from "@blocksuite/affine-shared/services";
import { EmbedSyncedDocConfigExtension } from "@blocksuite/affine/blocks/embed-doc";
import { RefNodeSlotsProvider } from "@blocksuite/affine/inlines/reference";
import { html } from "lit";

import { EmbedIframeNoCredentiallessViewOverride } from "../embedded/embedIframeNoCredentiallessViewOverride";
import { RoomMapEmbedOptionExtension } from "../embedded/roomMapEmbedOption";

export function buildBlocksuiteEmbedExtensions() {
  const edgelessHeaderExt = EmbedSyncedDocConfigExtension({
    edgelessHeader: ({ model, std }: any) => {
      try {
        const pageId = model.props.pageId;
        const params = model.props.params as any;
        const titleSig = std.get(DocDisplayMetaProvider).title(pageId, { params, referenced: true });

        const onOpen = (event: Event) => {
          event.stopPropagation();
          const provider: any = std.getOptional(RefNodeSlotsProvider as any);
          provider?.docLinkClicked?.next?.({ pageId, host: (std as any).host });
        };

        const onCopy = async (event: Event) => {
          event.stopPropagation();
          try {
            const text = pageId ?? "";
            await (navigator?.clipboard?.writeText?.(String(text)) ?? Promise.resolve());
          }
          catch {
            // ignore
          }
        };

        const onFold = (event: Event) => {
          event.stopPropagation();
          try {
            const headerHeight = 48;
            model.store?.captureSync?.();

            const bound = model.elementBound ?? { x: 0, y: 0, w: 0, h: 0 };
            const { x, y, w, h } = bound as { x: number; y: number; w: number; h: number };
            const scale = model.props?.scale ?? 1;

            if (model.isFolded) {
              const prev = model.props?.preFoldHeight$?.peek?.() ?? model.props?.preFoldHeight ?? 1;
              if (model.props?.xywh$) {
                model.props.xywh$.value = `[${x},${y},${w},${prev}]`;
              }
              else {
                model.xywh = `[${x},${y},${w},${prev}]`;
              }

              if (model.props?.preFoldHeight$) {
                model.props.preFoldHeight$.value = 0;
              }
              else {
                model.props.preFoldHeight = 0;
              }
            }
            else {
              if (model.props?.preFoldHeight$) {
                model.props.preFoldHeight$.value = h;
              }
              else {
                model.props.preFoldHeight = h;
              }

              const newH = headerHeight * scale;
              if (model.props?.xywh$) {
                model.props.xywh$.value = `[${x},${y},${w},${newH}]`;
              }
              else {
                model.xywh = `[${x},${y},${w},${newH}]`;
              }
            }
          }
          catch (error) {
            console.error("Failed to toggle fold state:", error);
          }
        };

        return html`
          <div class="affine-embed-synced-doc-header">
            <button
              data-icon-variant="plain"
              data-icon-size="24"
              data-testid="edgeless-embed-synced-doc-fold-button"
              data-folded="${model.isFolded}"
              @click=${onFold}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none"><path fill="currentColor" d="M13.15 15.132a.757.757 0 0 1-1.3 0L8.602 9.605c-.29-.491.072-1.105.65-1.105h6.497c.577 0 .938.614.65 1.105z"></path></svg>
            </button>

            <span class="affine-embed-synced-doc-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="none"><path fill="currentColor" d="M3 2.75A1.75 1.75 0 0 1 4.75 1h6.5A1.75 1.75 0 0 1 13 2.75v10.5A1.75 1.75 0 0 1 11.25 15h-6.5A1.75 1.75 0 0 1 3 13.25zM4.75 2.5a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25z"></path></svg>
            </span>
            <div class="affine-embed-synced-doc-title" data-testid="edgeless-embed-synced-doc-title" data-collapsed="${model.isFolded}">${titleSig}</div>

            <div style="margin-left:auto; display:flex; align-items:center; gap:6px;">
              <button data-size="custom" data-variant="plain" @click=${onOpen}>
                <span>Open</span>
              </button>
              <button data-icon-variant="plain" data-icon-size="24" data-testid="edgeless-embed-synced-doc-info-button" @click=${(event: Event) => event.stopPropagation()}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none"><path fill="currentColor" fill-rule="evenodd" d="M3.75 12a8.25 8.25 0 1 1 16.5 0 8.25 8.25 0 0 1-16.5 0M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25M13 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0m-1 2.75a.75.75 0 0 1 .75.75v5a.75.75 0 0 1-1.5 0v-5a.75.75 0 0 1 .75-.75" clip-rule="evenodd"></path></svg>
              </button>
              <button data-icon-variant="plain" data-icon-size="24" data-testid="edgeless-embed-synced-doc-copy-link-button" @click=${onCopy}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none"><path fill="currentColor" fill-rule="evenodd" d="M18.428 5.572a2.806 2.806 0 0 0-3.967 0l-.978.977a.75.75 0 0 1-1.06-1.06l.977-.978a4.305 4.305 0 1 1 6.089 6.089l-3.556 3.556a4.306 4.306 0 0 1-6.089 0 .75.75 0 0 1 1.061-1.061 2.805 2.805 0 0 0 3.968 0l3.555-3.556a2.806 2.806 0 0 0 0-3.967m-5.333 5.333a2.805 2.805 0 0 0-3.968 0l-3.555 3.556a2.806 2.806 0 0 0 3.967 3.967l.98-.979a.75.75 0 0 1 1.06 1.06l-.979.98A4.305 4.305 0 1 1 4.511 13.4l3.556-3.556a4.306 4.306 0 0 1 6.089 0 .75.75 0 0 1-1.061 1.061" clip-rule="evenodd"></path></svg>
              </button>
            </div>
          </div>
        `;
      }
      catch (error) {
        console.error(error);
        return html``;
      }
    },
  });

  return {
    sharedExtensions: [
      RoomMapEmbedOptionExtension,
      EmbedIframeNoCredentiallessViewOverride,
    ],
    edgelessExtensions: [edgelessHeaderExt],
  };
}

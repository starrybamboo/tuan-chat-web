import { EmbedIframeBlockComponent } from "@blocksuite/affine-block-embed";
import { EdgelessLegacySlotIdentifier } from "@blocksuite/affine-block-surface";
import { Bound } from "@blocksuite/global/gfx";
import { toGfxBlockComponent } from "@blocksuite/std";
import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { styleMap } from "lit/directives/style-map.js";

const DEFAULT_IFRAME_HEIGHT = 152;
const DEFAULT_IFRAME_WIDTH = "100%";

function renderIframeWithoutCredentialless(component: EmbedIframeBlockComponent) {
  const props = (component as any)?.model?.props ?? {};
  const { iframeUrl } = props as { iframeUrl?: string };
  const options = (component as any)?.iframeOptions as
    | {
      widthPercent?: number;
      heightInNote?: number;
      style?: string;
      allow?: string;
      referrerpolicy?: string;
      scrolling?: boolean;
      allowFullscreen?: boolean;
    }
    | undefined;

  const widthPercent = options?.widthPercent;
  const heightInNote = options?.heightInNote;
  const width = widthPercent != null ? `${widthPercent}%` : DEFAULT_IFRAME_WIDTH;
  const height = (component as any)?.inSurface ? "100%" : (heightInNote ?? DEFAULT_IFRAME_HEIGHT);

  return html`
    <iframe
      width=${width}
      height=${height}
      ?allowfullscreen=${options?.allowFullscreen}
      loading="lazy"
      frameborder="0"
      src=${ifDefined(iframeUrl)}
      allow=${ifDefined(options?.allow)}
      referrerpolicy=${ifDefined(options?.referrerpolicy)}
      scrolling=${ifDefined(options?.scrolling)}
      style=${ifDefined(options?.style)}
    ></iframe>
  `;
}

class TCEmbedIframeBlockComponent extends EmbedIframeBlockComponent {
  connectedCallback() {
    super.connectedCallback();
    // Override iframe renderer to remove the credentialless attribute.
    (this as any)._renderIframe = () => renderIframeWithoutCredentialless(this);
  }
}

class TCEmbedEdgelessIframeBlockComponent extends toGfxBlockComponent(
  EmbedIframeBlockComponent,
) {
  override selectedStyle$ = null;

  override blockDraggable = false;

  override accessor blockContainerStyles = {
    margin: "0",
    backgroundColor: "transparent",
  };

  get edgelessSlots() {
    return this.std.get(EdgelessLegacySlotIdentifier);
  }

  override connectedCallback() {
    super.connectedCallback();
    // Override iframe renderer to remove the credentialless attribute.
    (this as any)._renderIframe = () => renderIframeWithoutCredentialless(this);
    this.edgelessSlots.elementResizeStart.subscribe(() => {
      this.isResizing$.value = true;
    });
    this.edgelessSlots.elementResizeEnd.subscribe(() => {
      this.isResizing$.value = false;
    });
  }

  override renderGfxBlock() {
    const bound = Bound.deserialize(this.model.props.xywh$.value);
    const scale = this.model.props.scale$.value;
    const width = bound.w / scale;
    const height = bound.h / scale;
    const style = {
      width: `${width}px`,
      height: `${height}px`,
      transformOrigin: "0 0",
      transform: `scale(${scale})`,
    };

    return html`
      <div class="edgeless-embed-iframe-block" style=${styleMap(style)}>
        ${this.renderPageContent()}
      </div>
    `;
  }
}

export function ensureEmbedIframeNoCredentiallessElementsDefined() {
  if (typeof window === "undefined")
    return;
  if (!globalThis.customElements)
    return;

  if (!customElements.get("tc-embed-iframe")) {
    customElements.define("tc-embed-iframe", TCEmbedIframeBlockComponent as any);
  }
  if (!customElements.get("tc-embed-edgeless-iframe")) {
    customElements.define("tc-embed-edgeless-iframe", TCEmbedEdgelessIframeBlockComponent as any);
  }
}

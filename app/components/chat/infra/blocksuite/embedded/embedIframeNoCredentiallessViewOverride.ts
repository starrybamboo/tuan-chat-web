import type { ExtensionType } from "@blocksuite/store";

import { EmbedIframeBlockSchema } from "@blocksuite/affine-model";
import { BlockViewIdentifier } from "@blocksuite/std";
import { literal } from "lit/static-html.js";

import { ensureEmbedIframeNoCredentiallessElementsDefined } from "./embedIframeNoCredentiallessElements";

const EMBED_IFRAME_FLAVOUR = EmbedIframeBlockSchema.model.flavour;

export const EmbedIframeNoCredentiallessViewOverride: ExtensionType = {
  setup: (di) => {
    ensureEmbedIframeNoCredentiallessElementsDefined();
    di.override(BlockViewIdentifier(EMBED_IFRAME_FLAVOUR), () => {
      return (model: any) => {
        const inSurface = model?.parent?.flavour === "affine:surface";
        return inSurface ? literal`tc-embed-edgeless-iframe` : literal`tc-embed-iframe`;
      };
    });
  },
};

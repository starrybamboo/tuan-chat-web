import { EmbedOptionProvider } from "@blocksuite/affine-shared/services";
import { EmbedIframeStyles } from "@blocksuite/affine/model";
import { EditorLifeCycleExtension } from "@blocksuite/std";

import { ROOM_MAP_URL_REGEX } from "../spec/roomMapEmbedConfig";

const ROOM_MAP_EMBED_OPTIONS = {
  flavour: "affine:embed-iframe",
  urlRegex: ROOM_MAP_URL_REGEX,
  styles: EmbedIframeStyles,
  viewType: "embed" as const,
};

export class RoomMapEmbedOptionExtension extends EditorLifeCycleExtension {
  static override readonly key = "tc-room-map-embed-option";

  override created() {
    try {
      this.std.get(EmbedOptionProvider).registerEmbedBlockOptions(ROOM_MAP_EMBED_OPTIONS);
    }
    catch (err) {
      console.warn("[RoomMapEmbed] register embed option failed", err);
    }
  }
}

import type { ExtensionType } from "@blocksuite/store";

import { BlockViewExtension } from "@blocksuite/std";
import { BlockSchemaExtension, defineBlockSchema } from "@blocksuite/store";
import { literal } from "lit/static-html.js";

import { ensureTcBlockElementsDefined } from "@/components/chat/infra/blocksuite/spec/tcBlocks";

export const TC_FLAVOURS = {
  root: "tc:root",
  paragraph: "tc:paragraph",
} as const;

const TcRootSchema = defineBlockSchema({
  flavour: TC_FLAVOURS.root,
  metadata: {
    version: 1,
    role: "root",
    children: [TC_FLAVOURS.paragraph],
    isFlatData: true,
  },
});

const TcParagraphSchema = defineBlockSchema({
  flavour: TC_FLAVOURS.paragraph,
  metadata: {
    version: 1,
    role: "content",
    parent: [TC_FLAVOURS.root],
    isFlatData: true,
  },
  props: ({ Text }) => ({
    text: Text(""),
  }),
});

export const TC_STORE_EXTENSIONS: ExtensionType[] = [
  BlockSchemaExtension(TcRootSchema),
  BlockSchemaExtension(TcParagraphSchema),
];

export const TC_STD_EXTENSIONS: ExtensionType[] = [
  // Ensure custom elements exist before EditorHost renders.
  {
    setup: (_di) => {
      ensureTcBlockElementsDefined();
    },
  },
  BlockViewExtension(TC_FLAVOURS.root, literal`tc-root-block`),
  BlockViewExtension(TC_FLAVOURS.paragraph, literal`tc-paragraph-block`),
];

import type { Logger } from "../utils/logger";

import { createLogger } from "../utils/logger";

let mentionBlotRegistered = false;
let hrBlotRegistered = false;

export function registerBlots(Quill: any, log?: Logger): void {
  const logger = log ?? createLogger("CORE/Blots", { domainKey: "CORE" });
  if (!Quill) {
    logger.warn("registerBlots: Quill not provided");
    return;
  }
  try {
    if (!mentionBlotRegistered) {
      const Embed = Quill.import("blots/embed");
      class MentionBlot extends Embed {
        static blotName = "mention-span";
        static tagName = "span";
        static className = "ql-mention-span";
        static create(value: any) {
          const node = super.create();
          node.setAttribute("data-label", value?.label || "");
          node.setAttribute("data-category", value?.category || "");
          node.textContent = value?.label || "";
          const cat = value?.category || "";
          const colorMap: Record<string, { bg: string; color: string }> = {
            人物: { bg: "#fef3c7", color: "#92400e" },
            地点: { bg: "#d1fae5", color: "#065f46" },
            物品: { bg: "#e0f2fe", color: "#075985" },
          };
          let bg = "#eef2ff";
          let fg = "#4338ca";
          if (cat && colorMap[cat]) {
            bg = colorMap[cat].bg;
            fg = colorMap[cat].color;
          }
          (node as HTMLElement).style.background = bg;
          (node as HTMLElement).style.padding = "0 4px";
          (node as HTMLElement).style.borderRadius = "4px";
          (node as HTMLElement).style.color = fg;
          (node as HTMLElement).style.fontSize = "0.85em";
          (node as HTMLElement).style.userSelect = "none";
          return node;
        }

        static value(node: HTMLElement) {
          return {
            label: node.getAttribute("data-label") || node.textContent || "",
            category: node.getAttribute("data-category") || "",
          };
        }
      }
      Quill.register(MentionBlot);
      mentionBlotRegistered = true;
      logger.info("Mention blot registered");
    }
  }
  catch (e) {
    logger.warn("register mention blot failed", { error: String(e) });
  }

  try {
    if (!hrBlotRegistered) {
      const BlockEmbed = Quill.import("blots/block/embed");
      class HrBlot extends BlockEmbed {
        static blotName = "hr";
        static tagName = "hr";
        static className = "ql-hr";
        static create() {
          const node = super.create();
          (node as HTMLElement).setAttribute("contenteditable", "false");
          return node;
        }
      }
      Quill.register(HrBlot);
      hrBlotRegistered = true;
      logger.info("HR blot registered");
    }
  }
  catch (e) {
    logger.warn("register hr blot failed", { error: String(e) });
  }
}

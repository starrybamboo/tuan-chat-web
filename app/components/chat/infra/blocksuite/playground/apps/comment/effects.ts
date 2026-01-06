import { CommentInput } from "./comment-input.js";
import { CommentPanel } from "./comment-panel.js";

export function effects() {
  if (!customElements.get("comment-input")) {
    customElements.define("comment-input", CommentInput);
  }
  if (!customElements.get("comment-panel")) {
    customElements.define("comment-panel", CommentPanel);
  }
}

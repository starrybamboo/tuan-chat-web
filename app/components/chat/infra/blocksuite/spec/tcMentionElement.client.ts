import type { AffineTextAttributes } from "@blocksuite/affine-shared/types";
import type { BlockStdScope } from "@blocksuite/std";
import type { DeltaInsert } from "@blocksuite/store";

import { UserProvider } from "@blocksuite/affine-shared/services";
import { unsafeCSSVarV2 } from "@blocksuite/affine-shared/theme";
import { SignalWatcher, WithDisposable } from "@blocksuite/global/lit";
import { ShadowlessElement } from "@blocksuite/std";
import { ZERO_WIDTH_FOR_EMBED_NODE, ZERO_WIDTH_FOR_EMPTY_LINE } from "@blocksuite/std/inline";
import { css, html } from "lit";
import { property } from "lit/decorators.js";

function getPostMessageTargetOrigin(): string {
  if (typeof window === "undefined") {
    return "*";
  }

  const origin = window.location.origin;
  if (!origin || origin === "null") {
    return "*";
  }
  return origin;
}

function getBlocksuiteFrameInstanceId(): string | undefined {
  try {
    const sp = new URLSearchParams(window.location.search);
    const v = sp.get("instanceId") ?? "";
    const trimmed = v.trim();
    return trimmed || undefined;
  }
  catch {
    return undefined;
  }
}

export function ensureTCAffineMentionDefined(): void {
  if (typeof window === "undefined")
    return;
  if (!globalThis.customElements)
    return;
  if (customElements.get("affine-mention"))
    return;

  class TCAffineMention extends SignalWatcher(
    WithDisposable(ShadowlessElement),
  ) {
    static override styles = css`
      .affine-mention {
        color: ${unsafeCSSVarV2("text/primary")};
        font-feature-settings:
          "liga" off,
          "clig" off;
        font-family: Inter;
        font-size: 15px;
        font-style: normal;
        font-weight: 500;
        line-height: 24px; /* 160% */
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 0 4px;
        border-radius: 4px;
        user-select: none;
      }
      .affine-mention-avatar {
        width: 16px;
        height: 16px;
        border-radius: 9999px;
        object-fit: cover;
        flex: 0 0 auto;
      }
      .affine-mention:hover {
        background: var(--affine-hover-color);
      }
      .affine-mention[data-selected="true"] {
        background: var(--affine-hover-color);
      }
      .affine-mention[data-type="default"] {
        color: ${unsafeCSSVarV2("text/primary")};
      }
      .affine-mention[data-type="removed"] {
        color: ${unsafeCSSVarV2("text/disable")};
      }
      .affine-mention[data-type="error"] {
        color: ${unsafeCSSVarV2("text/disable")};
      }
      .affine-mention[data-type="loading"] {
        color: ${unsafeCSSVarV2("text/placeholder")};
        background: ${unsafeCSSVarV2("skeleton/skeleton")};
      }
      .loading-text {
        display: inline-block;
      }
      .dots {
        display: inline-block;
      }
      .dot {
        display: inline-block;
        opacity: 0;
        animation: pulse 1.2s infinite;
      }
      .dots > .dot:nth-child(2) {
        animation-delay: 0.4s;
      }
      .dots > .dot:nth-child(3) {
        animation-delay: 0.8s;
      }
      @keyframes pulse {
        0% {
          opacity: 0;
        }
        33.333% {
          opacity: 1;
        }
        66.666% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
    `;

    private postToHost(payload: Record<string, unknown>) {
      try {
        const instanceId = getBlocksuiteFrameInstanceId();
        window.parent.postMessage(
          {
            tc: "tc-blocksuite-frame",
            ...(instanceId ? { instanceId } : null),
            ...payload,
          },
          getPostMessageTargetOrigin(),
        );
      }
      catch {
        // ignore
      }
    }

    private getUserId(): string | undefined {
      const memberId = this.delta.attributes?.mention?.member;
      if (!memberId)
        return undefined;
      const v = String(memberId).trim();
      return v || undefined;
    }

    private buildAnchorRectFromEvent(e: Event): null | {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width: number;
      height: number;
    } {
      try {
        const target = (e as any).currentTarget as unknown;
        if (!(target instanceof HTMLElement))
          return null;

        const mentionRect = target.getBoundingClientRect();
        const frameEl = window.frameElement instanceof HTMLElement ? window.frameElement : null;
        const frameRect = frameEl?.getBoundingClientRect() ?? null;

        if (!frameRect) {
          return {
            left: mentionRect.left,
            top: mentionRect.top,
            right: mentionRect.right,
            bottom: mentionRect.bottom,
            width: mentionRect.width,
            height: mentionRect.height,
          };
        }

        return {
          left: frameRect.left + mentionRect.left,
          top: frameRect.top + mentionRect.top,
          right: frameRect.left + mentionRect.right,
          bottom: frameRect.top + mentionRect.bottom,
          width: mentionRect.width,
          height: mentionRect.height,
        };
      }
      catch {
        return null;
      }
    }

    private onMentionClick(e: MouseEvent) {
      const userId = this.getUserId();
      if (!userId)
        return;
      this.postToHost({
        type: "mention-click",
        userId,
        anchorRect: this.buildAnchorRectFromEvent(e),
      });
    }

    private onMentionPointerEnter(e: PointerEvent) {
      const userId = this.getUserId();
      if (!userId)
        return;
      this.postToHost({
        type: "mention-hover",
        state: "enter",
        userId,
        anchorRect: this.buildAnchorRectFromEvent(e),
      });
    }

    private onMentionPointerLeave() {
      const userId = this.getUserId();
      if (!userId)
        return;
      this.postToHost({
        type: "mention-hover",
        state: "leave",
        userId,
      });
    }

    override render() {
      const errorContent = html`<span
        data-selected=${this.selected}
        data-type="error"
        class="affine-mention"
        @click=${this.onMentionClick}
        @pointerenter=${this.onMentionPointerEnter}
        @pointerleave=${this.onMentionPointerLeave}
        >Unknown Member<v-text .str=${ZERO_WIDTH_FOR_EMBED_NODE}></v-text
      ></span>`;

      const userService = this.std.getOptional(UserProvider);
      const memberId = this.delta.attributes?.mention?.member;
      if (!userService || !memberId) {
        return errorContent;
      }

      userService.revalidateUserInfo(memberId);
      const isLoading$ = userService.isLoading$(memberId);
      const userInfo$ = userService.userInfo$(memberId);

      if (userInfo$.value) {
        if (userInfo$.value.removed) {
          return html`<span
            data-selected=${this.selected}
            data-type="removed"
            class="affine-mention"
            @click=${this.onMentionClick}
            @pointerenter=${this.onMentionPointerEnter}
            @pointerleave=${this.onMentionPointerLeave}
            >Inactive Member<v-text .str=${ZERO_WIDTH_FOR_EMBED_NODE}></v-text
          ></span>`;
        }

        const avatar = userInfo$.value.avatar;
        const name = userInfo$.value.name ?? "Unknown";

        return html`<span
          data-selected=${this.selected}
          data-type="default"
          class="affine-mention"
          @click=${this.onMentionClick}
          @pointerenter=${this.onMentionPointerEnter}
          @pointerleave=${this.onMentionPointerLeave}
          >${avatar
            ? html`<img class="affine-mention-avatar" src="${avatar}" alt="" />`
            : null}${name}<v-text
            .str=${ZERO_WIDTH_FOR_EMBED_NODE}
          ></v-text
        ></span>`;
      }

      if (isLoading$.value) {
        return html`<span
          data-selected=${this.selected}
          data-type="loading"
          class="affine-mention"
          @click=${this.onMentionClick}
          @pointerenter=${this.onMentionPointerEnter}
          @pointerleave=${this.onMentionPointerLeave}
          >loading<span class="dots"
            ><span class="dot">.</span><span class="dot">.</span
            ><span class="dot">.</span></span
          ><v-text .str=${ZERO_WIDTH_FOR_EMBED_NODE}></v-text
        ></span>`;
      }

      return errorContent;
    }

    @property({ type: Object })
    accessor delta: DeltaInsert<AffineTextAttributes> = {
      insert: ZERO_WIDTH_FOR_EMPTY_LINE,
      attributes: {},
    };

    @property({ type: Boolean })
    accessor selected = false;

    @property({ attribute: false })
    accessor std!: BlockStdScope;
  }

  customElements.define("affine-mention", TCAffineMention as any);
}

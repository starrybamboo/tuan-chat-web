import { useEffect, useMemo, useState } from "react";

import type { V4CharEditorRow } from "@/components/aiImage/types";
import type { TokenCountsByText } from "@/components/aiImage/tokenMeter/tokenizer";
import { countNovelAiV45Tokens } from "@/components/aiImage/tokenMeter/tokenizer";
import {
  buildNovelAiV45TextRequests,
  buildNovelAiV45TokenSnapshot,
} from "@/components/aiImage/tokenMeter/snapshot";

export function useNovelAiV45TokenSnapshot(args: {
  prompt: string;
  negativePrompt: string;
  v4Chars: V4CharEditorRow[];
  qualityToggle: boolean;
  ucPreset: number;
}) {
  const serializedChars = useMemo(() => {
    return args.v4Chars
      .map(row => `${row.id}\u0000${row.prompt}\u0000${row.negativePrompt}`)
      .join("\u0001");
  }, [args.v4Chars]);

  const requests = useMemo(() => {
    return buildNovelAiV45TextRequests({
      prompt: args.prompt,
      negativePrompt: args.negativePrompt,
      v4Chars: args.v4Chars,
      qualityToggle: args.qualityToggle,
      ucPreset: args.ucPreset,
    });
  }, [args.negativePrompt, args.prompt, args.qualityToggle, args.ucPreset, serializedChars, args.v4Chars]);

  const [tokenState, setTokenState] = useState<{
    status: "loading" | "ready" | "fallback";
    countsByText: TokenCountsByText;
  }>({
    status: "loading",
    countsByText: {},
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!requests.allTexts.length) {
        setTokenState((prev) => {
          if (prev.status === "ready" && Object.keys(prev.countsByText).length === 0)
            return prev;
          return {
            status: "ready",
            countsByText: {},
          };
        });
        return;
      }

      const entries = await Promise.all(requests.allTexts.map(async (text) => {
        return [text, await countNovelAiV45Tokens(text)] as const;
      }));

      if (cancelled)
        return;

      const nextCountsByText = Object.fromEntries(entries);
      const nextStatus = entries.every(([, value]) => value.exact) ? "ready" : "fallback";

      setTokenState((prev) => {
        const prevKeys = Object.keys(prev.countsByText);
        const nextKeys = Object.keys(nextCountsByText);
        const sameKeys = prevKeys.length === nextKeys.length && prevKeys.every(key => nextCountsByText[key] != null);
        const sameValues = sameKeys && prevKeys.every((key) => {
          const prevValue = prev.countsByText[key];
          const nextValue = nextCountsByText[key];
          return prevValue?.count === nextValue?.count && prevValue?.exact === nextValue?.exact;
        });
        if (prev.status === nextStatus && sameValues)
          return prev;
        return {
          status: nextStatus,
          countsByText: nextCountsByText,
        };
      });
    }

    setTokenState((prev) => {
      if (prev.status === "loading")
        return prev;
      return {
        status: "loading",
        countsByText: prev.countsByText,
      };
    });
    void run();

    return () => {
      cancelled = true;
    };
  }, [requests]);

  return useMemo(() => {
    return buildNovelAiV45TokenSnapshot(requests, tokenState.countsByText, tokenState.status);
  }, [requests, tokenState.countsByText, tokenState.status]);
}

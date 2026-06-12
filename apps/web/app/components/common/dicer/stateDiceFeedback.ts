import type { StateEventAtom } from "@/types/stateEvent";

import { formatStateEventAtomDetail } from "@/types/stateEvent";

function isRoleScopedStateEvent(event: StateEventAtom): boolean {
  return "scope" in event && event.scope.kind === "role";
}

export function buildRoleScopedStateDiceReply(events: StateEventAtom[]): string | null {
  const details = events
    .filter(isRoleScopedStateEvent)
    .map(event => formatStateEventAtomDetail(event));

  return details.length > 0 ? `状态已更新：${details.join("；")}` : null;
}

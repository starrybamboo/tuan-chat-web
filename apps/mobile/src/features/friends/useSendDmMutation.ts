import type { MessageDirectSendRequest } from "@tuanchat/openapi-client/models/MessageDirectSendRequest";

import { useSendDirectMessageMutation } from "@tuanchat/query/direct-message";

import { mobileApiClient } from "@/lib/api";

export function useSendDmMutation(currentUserId?: number | null) {
  const mutation = useSendDirectMessageMutation(mobileApiClient, currentUserId);

  return {
    ...mutation,
    mutate: (request: MessageDirectSendRequest) => mutation.mutate(request),
    mutateAsync: (request: MessageDirectSendRequest) => mutation.mutateAsync(request),
  };
}

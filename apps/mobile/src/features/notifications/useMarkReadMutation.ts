import { mobileApiClient } from "@/lib/api";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationsReadMutation,
} from "@tuanchat/query/notifications";

export function useMarkAllReadMutation() {
  const mutation = useMarkAllNotificationsReadMutation(mobileApiClient);
  return {
    ...mutation,
    mutate: () => mutation.mutate({}),
    mutateAsync: () => mutation.mutateAsync({}),
  };
}

export function useMarkSingleReadMutation() {
  const mutation = useMarkNotificationsReadMutation(mobileApiClient);

  return {
    ...mutation,
    mutate: (notificationId: number) => mutation.mutate({ notificationIdList: [notificationId] }),
    mutateAsync: (notificationId: number) => mutation.mutateAsync({ notificationIdList: [notificationId] }),
  };
}

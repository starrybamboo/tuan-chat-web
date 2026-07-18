import { StyleSheet, View } from "react-native";

import { AddFriendTab } from "./AddFriendTab";
import { PendingRequestsTab } from "./PendingRequestsTab";
import {
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
} from "./useFriendMutations";
import { useFriendRequestsQuery } from "./useFriendRequestsQuery";

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: { flex: 1 },
});

export function NewFriendsTab() {
  const requestsQuery = useFriendRequestsQuery();
  const acceptMutation = useAcceptFriendRequestMutation();
  const rejectMutation = useRejectFriendRequestMutation();
  const { mutate: acceptFriendRequest } = acceptMutation;
  const { mutate: rejectFriendRequest } = rejectMutation;

  const requests = requestsQuery.data ?? [];
  const pendingRequestsContent = requests.length > 0
    ? (
        <PendingRequestsTab
          embedded
          requests={requests}
          isPending={requestsQuery.isPending}
          onAccept={acceptFriendRequest}
          onReject={rejectFriendRequest}
          isAccepting={acceptMutation.isPending}
          isRejecting={rejectMutation.isPending}
          showEmpty={false}
        />
      )
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <AddFriendTab pendingRequestsContent={pendingRequestsContent} />
      </View>
    </View>
  );
}

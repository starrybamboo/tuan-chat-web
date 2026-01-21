import { buildSpaceDocId } from "@/components/chat/infra/blocksuite/spaceDocId";
import BlocksuiteDescriptionEditor from "@/components/chat/shared/components/blocksuiteDescriptionEditor";

export default function BlocksuiteClueDescriptionEditor(props: {
  spaceId: number;
  clueId: number;
  className?: string;
}) {
  const { spaceId, clueId, className } = props;
  return (
    <BlocksuiteDescriptionEditor
      workspaceId={`space:${spaceId}`}
      spaceId={spaceId}
      docId={buildSpaceDocId({ kind: "clue_description", clueId })}
      className={className}
      tcHeader={{ enabled: true }}
    />
  );
}

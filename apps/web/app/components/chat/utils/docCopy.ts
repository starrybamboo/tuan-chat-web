import { tuanchat } from "../../../../api/instance";

/**
 * 复制空间文档实体；文档正文统一由远端 message-stream/房间消息流承载。
 */
export async function copyDocToSpaceDoc(params: {
  spaceId: number;
  sourceDocId: string;
  sourceSpaceId?: number;
  title?: string;
  imageFileId?: number;
  originalImageFileId?: number;
  imageMediaType?: string;
}): Promise<{ newDocEntityId: number; newDocId: string; title: string }> {
  const createTitle = (params.title ?? "").trim();
  const title = createTitle ? `${createTitle}（副本）` : "新文档（副本）";

  let createdDocId: number | null = null;
  try {
    const response = await tuanchat.spaceDocController.createDoc({
      spaceId: params.spaceId,
      title,
    });
    const docId = Number((response as any)?.data?.docId);
    if (Number.isFinite(docId) && docId > 0) {
      createdDocId = docId;
    }
  }
  catch (error) {
    console.error("[SpaceDoc] create failed", error);
  }

  if (!createdDocId) {
    throw new Error("创建文档失败");
  }

  const newDocId = String(createdDocId);

  return { newDocEntityId: createdDocId, newDocId, title };
}

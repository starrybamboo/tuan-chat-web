import { describe, expect, it } from "vitest";

import { enqueueAvatarUploadWorkflow, removeAvatarUploadWorkflow } from "./avatarUploadWorkflowQueue";

type Workflow = {
  batchKey: string;
  avatarIds: number[];
};

describe("avatarUploadWorkflowQueue", () => {
  it("连续上传的 variant 批次保持提交顺序", () => {
    const first: Workflow = { batchKey: "first", avatarIds: [1] };
    const second: Workflow = { batchKey: "second", avatarIds: [2] };

    const queue = enqueueAvatarUploadWorkflow(
      enqueueAvatarUploadWorkflow([], first),
      second,
    );

    expect(queue).toEqual([first, second]);
  });

  it("同一批次完成信息更新时保留原队列位置", () => {
    const queue = [
      { batchKey: "first", avatarIds: [1] },
      { batchKey: "second", avatarIds: [2] },
    ];

    expect(enqueueAvatarUploadWorkflow(queue, {
      batchKey: "first",
      avatarIds: [1, 3],
    })).toEqual([
      { batchKey: "first", avatarIds: [1, 3] },
      queue[1],
    ]);
  });

  it("完成当前批次后继续保留后续批次", () => {
    const queue = [
      { batchKey: "first", avatarIds: [1] },
      { batchKey: "second", avatarIds: [2] },
    ];

    expect(removeAvatarUploadWorkflow(queue, "first")).toEqual([queue[1]]);
  });
});

export type AvatarUploadWorkflowQueueItem = {
  batchKey: string;
};

export function enqueueAvatarUploadWorkflow<TWorkflow extends AvatarUploadWorkflowQueueItem>(
  queue: TWorkflow[],
  workflow: TWorkflow,
) {
  const existingIndex = queue.findIndex(item => item.batchKey === workflow.batchKey);
  if (existingIndex < 0) {
    return [...queue, workflow];
  }
  return queue.map((item, index) => index === existingIndex ? workflow : item);
}

export function removeAvatarUploadWorkflow<TWorkflow extends AvatarUploadWorkflowQueueItem>(
  queue: TWorkflow[],
  batchKey: string,
) {
  return queue.filter(item => item.batchKey !== batchKey);
}

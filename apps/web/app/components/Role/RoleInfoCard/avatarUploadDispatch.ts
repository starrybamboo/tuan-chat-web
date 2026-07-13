export function dispatchAvatarUploadTask(
  task: () => void | Promise<void>,
  onError: (error: unknown) => void,
) {
  void Promise.resolve()
    .then(task)
    .catch(onError);
}

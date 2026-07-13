import type { RoleAvatar } from "api";

/** 将乐观头像解析为可提交的服务端头像记录。 */
export type WaitForAvatarUpload = (avatar: RoleAvatar) => Promise<RoleAvatar>;

type OptimisticRoleAvatar = RoleAvatar & {
  optimisticUploadPending?: boolean;
  optimisticUploadKey?: string;
};

function getPositiveAvatarId(value: unknown): number | undefined {
  const avatarId = Number(value ?? 0);
  if (!Number.isFinite(avatarId) || avatarId <= 0) {
    return undefined;
  }
  return Math.floor(avatarId);
}

export function isCropSubmitWaitingForUpload(avatar: RoleAvatar | undefined) {
  return Boolean(avatar) && (
    !getPositiveAvatarId(avatar?.avatarId)
    || Boolean((avatar as OptimisticRoleAvatar | undefined)?.optimisticUploadPending)
  );
}

/** 获取在临时 ID 回填前后保持稳定的裁剪任务标识。 */
export function getCropSubmitTaskKey(avatar: RoleAvatar | undefined) {
  const optimisticUploadKey = (avatar as OptimisticRoleAvatar | undefined)?.optimisticUploadKey;
  if (optimisticUploadKey) {
    return `upload:${optimisticUploadKey}`;
  }

  const avatarId = getPositiveAvatarId(avatar?.avatarId);
  return avatarId ? `avatar:${avatarId}` : undefined;
}

type SpriteCropSubmitTask = () => Promise<RoleAvatar>;

/**
 * 保存短生命周期的立绘提交任务，保证同一头像的连续裁剪按顺序落库。
 */
export class SpriteCropSubmissionCoordinator {
  private readonly submissions = new Map<string, Promise<RoleAvatar>>();

  enqueue(avatar: RoleAvatar, task: SpriteCropSubmitTask) {
    const taskKey = getCropSubmitTaskKey(avatar);
    if (!taskKey) {
      throw new Error("头像缺少可用的提交标识");
    }

    const previousSubmission = this.submissions.get(taskKey);
    const submission = (previousSubmission
      ? previousSubmission.catch(() => avatar).then(task)
      : Promise.resolve().then(task));
    // 提交失败会在最终头像提交阶段再次被消费，这里提前挂载处理器避免未处理拒绝。
    void submission.catch(() => undefined);
    this.submissions.set(taskKey, submission);
    return submission;
  }

  async resolve(avatar: RoleAvatar, waitForAvatarUpload?: WaitForAvatarUpload) {
    const uploadedAvatar = await resolveCropSubmitAvatar(avatar, waitForAvatarUpload);
    const taskKey = getCropSubmitTaskKey(avatar) ?? getCropSubmitTaskKey(uploadedAvatar);
    const pendingSubmission = taskKey ? this.submissions.get(taskKey) : undefined;
    return pendingSubmission ? await pendingSubmission : uploadedAvatar;
  }

  isCurrent(avatar: RoleAvatar, submission: Promise<RoleAvatar>) {
    const taskKey = getCropSubmitTaskKey(avatar);
    return Boolean(taskKey && this.submissions.get(taskKey) === submission);
  }

  remove(avatar: RoleAvatar) {
    const taskKey = getCropSubmitTaskKey(avatar);
    if (taskKey) {
      this.submissions.delete(taskKey);
    }
  }

  clear() {
    this.submissions.clear();
  }
}

/**
 * 本地预览与裁剪可以立即执行；只有服务端提交需要等待乐观上传完成。
 */
export async function resolveCropSubmitAvatar(
  avatar: RoleAvatar,
  waitForAvatarUpload?: WaitForAvatarUpload,
) {
  if (!isCropSubmitWaitingForUpload(avatar)) {
    return avatar;
  }
  if (!waitForAvatarUpload) {
    throw new Error("图片上传任务已中断，请重新选择图片");
  }

  const uploadedAvatar = await waitForAvatarUpload(avatar);
  if (!uploadedAvatar.roleId || !getPositiveAvatarId(uploadedAvatar.avatarId)) {
    throw new Error("图片上传完成后缺少头像记录，无法提交裁剪");
  }
  return uploadedAvatar;
}

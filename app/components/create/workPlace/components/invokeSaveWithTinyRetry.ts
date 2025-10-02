// 在名字变更等短暂重渲染期间，尝试延迟一两个节拍再保存，避免错过注册时机
export function invokeSaveWithTinyRetry(fn: () => void) {
  const tryOnce = () => {
    const h = fn;
    if (h) {
      try {
        h();
      }
      catch (e) {
        console.error("保存失败:", e);
      }
      return true;
    }
    return false;
  };

  if (tryOnce()) {
    return;
  }
  // 多次重试：下一帧 + 渐进延迟以覆盖重建/注册空窗
  const delays = [0, 50, 100, 200, 350, 500];
  let cancelled = false;
  // 下一帧启动序列
  requestAnimationFrame(() => {
    if (cancelled || tryOnce()) {
      return;
    }
    delays.forEach((d) => {
      setTimeout(() => {
        if (!cancelled) {
          tryOnce();
        }
      }, d);
    });
  });
  // 返回一个可选的取消函数以备未来扩展
  return () => {
    cancelled = true;
  };
}

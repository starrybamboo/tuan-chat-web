
import { isElectronEnv } from "@/utils/isElectronEnv";
import launchWebGal, { appendWebgalLaunchHints } from "@/utils/launchWebGal";
import { appToast } from "@/components/common/appToast/appToast";

export default function WebgalStarter({ className, children }: { className: string; children: React.ReactNode }) {
  async function startWebgal() {
    if (!isElectronEnv()) {
      return;
    }
    const timer = setTimeout(() => {
      appToast.info("WebGAL 启动中", { duration: 15000 });
    }, 50); // 如果启动时间超过50ms，则显示启动中
    const launchResult = await launchWebGal();
    clearTimeout(timer);
    if (!launchResult.ok) {
      appToast.error(appendWebgalLaunchHints(launchResult.error || "WebGAL 启动失败"));
    }
  }
  if (!isElectronEnv())
    return <></>;
  return (
    <button
      type="button"
      onClick={startWebgal}
      className={className}
      aria-label="启动 WebGAL"
    >
      {children}
    </button>
  );
}

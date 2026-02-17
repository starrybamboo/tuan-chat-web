import { toast } from "react-hot-toast";
import { isElectronEnv } from "@/utils/isElectronEnv";
import launchWebGal from "@/utils/launchWebGal";

export default function WebgalStarter({ className, children }: { className: string; children: React.ReactNode }) {
  async function startWebgal() {
    if (!isElectronEnv()) {
      return;
    }
    const timer = setTimeout(() => {
      toast("WebGAL 启动中", { duration: 15000 });
    }, 50); // 如果启动时间超过50ms，则显示启动中
    const launchResult = await launchWebGal();
    clearTimeout(timer);
    if (!launchResult.ok) {
      toast.error(launchResult.error || "WebGAL 启动失败");
    }
  }
  if (!isElectronEnv())
    return <></>;
  return (
    <div onClick={startWebgal} className={className}>
      {children}
    </div>
  );
}

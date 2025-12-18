import { isElectronEnv } from "@/utils/isElectronEnv";
import launchWebGal from "@/utils/launchWebGal";
import { pollPort } from "@/utils/pollPort";
import { toast } from "react-hot-toast";

export default function WebgalStarter({ className, children }: { className: string; children: React.ReactNode }) {
  async function startWebgal() {
    const timer = setTimeout(() => {
      toast("WebGAL 启动中", { duration: 15000 });
    }, 50); // 如果启动时间超过50ms，则显示启动中
    launchWebGal();
    await pollPort(3001).catch(() => toast.error("WebGAL 启动失败"));
    clearTimeout(timer);
  }
  if (!isElectronEnv())
    return <></>;
  return (
    <div onClick={startWebgal} className={className}>
      {children}
    </div>
  );
}

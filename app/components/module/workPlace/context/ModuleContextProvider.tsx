import type { ModuleContextValue } from "./moduleContext";
import { ModuleContext } from "./moduleContext";

export function ModuleContextProvider(props: {
  value: ModuleContextValue;
  children: React.ReactNode;
}) {
  const { value, children } = props;
  return <ModuleContext value={value}>{children}</ModuleContext>;
}

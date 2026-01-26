import ModuleWithTabs from "@/components/module/ModuleWithTabs";

export function meta() {
  return [
    { title: "发现" },
    { name: "description", content: "Discover modules and resources." },
  ];
}

export default function ChatDiscover() {
  return (
    <div className="bg-base-200 h-full w-full overflow-x-hidden">
      <ModuleWithTabs />
    </div>
  );
}

import type { Route } from "./+types/home";
import Carousel from "@/components/module/carousel";
import ModuleCard from "@/components/module/moduleCard";
import UserCard from "@/components/module/userCard";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "模组系统" },
    { name: "description", content: "You can browse others modules, and create your own freely!" },
  ];
}

function ModuleCardContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="basis-1/3 min-h-32">
      {children}
    </div>
  );
}

export default function Home() {
  const data = [
    {
      img: "https://img.daisyui.com/images/stock/photo-1625726411847-8cbb60cc71e6.webp",
      alt: "image1",
    },
    {
      img: "https://img.daisyui.com/images/stock/photo-1609621838510-5ad474b7d25d.webp",
      alt: "image2",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] max-h-[calc(100vh-3.5rem)] bg-base-100 overflow-x-hidden">
      <div className="mx-auto max-w-[1280px] px-4 py-[10px] flex flex-col gap-8 justify-center items-center">
        <div className="w-full basis-[360px] flex gap-[10px]">
          <Carousel className="basis-[80%] rounded-md shrink-0 grow shadow-md" items={data} />
          <UserCard className="basis-[20%] rounded-md shrink-0 grow-0 overflow-hidden bg-base-200 shadow-md" />
        </div>
        <div className="w-full flex flex-wrap gap-10px">
          {
            [1].map(i => (
              <ModuleCardContainer key={i}>
                <ModuleCard />
              </ModuleCardContainer>
            ))
          }
        </div>
      </div>
    </div>
  );
}

import type { ComponentProps } from "react";

type DivideLineProps = ComponentProps<"div">;

export default function DivideLine({ className, children, ...rest }: DivideLineProps) {
  return (

    <div
      {...rest}
      className={`${className || ""} w-px relative group`}
    >
      <div className="w-[2px] h-full bg-base-300 group-hover:bg-base-neutral group-hover:font-bold left-1/2 -translate-x-1/2" />
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2">
        {children}
      </div>
    </div>
  );
}

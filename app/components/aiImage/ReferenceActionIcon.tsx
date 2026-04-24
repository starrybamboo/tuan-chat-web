interface ReferenceActionIconProps {
  className?: string;
  src: string;
}

/** Renders a masked monochrome icon from the shared AI image action assets. */
export function ReferenceActionIcon({ className, src }: ReferenceActionIconProps) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

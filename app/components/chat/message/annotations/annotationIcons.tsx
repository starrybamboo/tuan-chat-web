import type { SVGProps } from "react";

export function FadeInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M11 5h2v14h-2zM5 11h14v2H5z" />
    </svg>
  );
}

export function FadeOutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M5 11h14v2H5z" />
    </svg>
  );
}

export function EnterFromLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M7 5v14l10-7z" />
    </svg>
  );
}

export function ExitToLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M12 6l-6 6 6 6zM18 6l-6 6 6 6z" />
    </svg>
  );
}

export function EnterFromRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M17 5v14l-10-7z" />
    </svg>
  );
}

export function ExitToRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" {...props}>
      <path fill="currentColor" d="M12 6l6 6-6 6zM6 6l6 6-6 6z" />
    </svg>
  );
}

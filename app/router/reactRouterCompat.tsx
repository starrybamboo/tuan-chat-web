import type React from "react";
import {
  Outlet as TanStackOutlet,
  ScrollRestoration as TanStackScrollRestoration,
  useLocation as useTanStackLocation,
  useMatchRoute,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useCallback, useEffect, useMemo } from "react";

type CompatNavigateOptions = {
  replace?: boolean;
  state?: unknown;
};

export type NavigateFunction = (to: string | number, options?: CompatNavigateOptions) => void;

type CompatLinkProps = Omit<React.ComponentPropsWithoutRef<"a">, "href"> & {
  ref?: React.Ref<HTMLAnchorElement>;
  to: string;
  replace?: boolean;
};

type CompatNavLinkProps = Omit<CompatLinkProps, "className"> & {
  className?: string | ((state: { isActive: boolean; isPending: boolean }) => string);
  end?: boolean;
};

type CompatNavigateProps = {
  to: string;
  replace?: boolean;
  state?: unknown;
};

type SetSearchParamsAction
  = | URLSearchParams
    | string
    | string[][]
    | Record<string, string>
    | ((prev: URLSearchParams) => URLSearchParams | string | string[][] | Record<string, string>);

type SetSearchParams = (nextInit: SetSearchParamsAction, options?: CompatNavigateOptions) => void;

function normalizeHref(currentHref: string, to: string) {
  return new URL(to, `http://tanstack.local${currentHref}`).toString().replace("http://tanstack.local", "");
}

function toUrlSearchParams(value: Exclude<SetSearchParamsAction, ((prev: URLSearchParams) => unknown)>) {
  if (value instanceof URLSearchParams) {
    return new URLSearchParams(value);
  }
  if (typeof value === "string") {
    return new URLSearchParams(value.startsWith("?") ? value.slice(1) : value);
  }
  if (Array.isArray(value)) {
    return new URLSearchParams(value);
  }
  return new URLSearchParams(Object.entries(value));
}

function shouldHandleAnchorClick(event: React.MouseEvent<HTMLAnchorElement>) {
  return !event.defaultPrevented
    && event.button === 0
    && !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

function isActivePath(currentPathname: string, targetPathname: string, end: boolean) {
  if (end) {
    return currentPathname === targetPathname;
  }
  return currentPathname === targetPathname
    || currentPathname.startsWith(targetPathname.endsWith("/") ? targetPathname : `${targetPathname}/`);
}

export function Link({
  ref,
  to,
  replace = false,
  onClick,
  target,
  ...props
}: CompatLinkProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const href = useMemo(
    () => normalizeHref(`${location.pathname}${location.search}${location.hash}`, to),
    [location.hash, location.pathname, location.search, to],
  );

  return (
    <a
      {...props}
      ref={ref}
      href={href}
      target={target}
      onClick={(event) => {
        onClick?.(event);
        if (!shouldHandleAnchorClick(event) || target === "_blank") {
          return;
        }
        event.preventDefault();
        navigate(to, { replace });
      }}
    />
  );
}

export function NavLink({
  ref,
  to,
  replace = false,
  onClick,
  className,
  end = false,
  target,
  ...props
}: CompatNavLinkProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const href = useMemo(
    () => normalizeHref(`${location.pathname}${location.search}${location.hash}`, to),
    [location.hash, location.pathname, location.search, to],
  );
  const targetUrl = useMemo(() => new URL(href, "http://tanstack.local"), [href]);
  const isActive = isActivePath(location.pathname, targetUrl.pathname, end);
  const resolvedClassName
    = typeof className === "function"
      ? className({ isActive, isPending: false })
      : className;

  return (
    <a
      {...props}
      ref={ref}
      href={href}
      target={target}
      className={resolvedClassName}
      aria-current={isActive ? "page" : undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!shouldHandleAnchorClick(event) || target === "_blank") {
          return;
        }
        event.preventDefault();
        navigate(to, { replace });
      }}
    />
  );
}

export function Navigate({ to, replace = false, state }: CompatNavigateProps) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace, state });
  }, [navigate, replace, state, to]);

  return null;
}

export function Outlet() {
  return <TanStackOutlet />;
}

export function useNavigate(): NavigateFunction {
  const router = useRouter();
  const location = useLocation();

  return useCallback((to: string | number, options?: CompatNavigateOptions) => {
    if (typeof to === "number") {
      router.history.go(to);
      return;
    }
    const href = normalizeHref(`${location.pathname}${location.search}${location.hash}`, to);
    if (options?.replace) {
      router.history.replace(href, options.state);
      return;
    }
    router.history.push(href, options?.state);
  }, [location.hash, location.pathname, location.search, router]);
}

export function useLocation() {
  const location = useTanStackLocation() as any;
  const locationState = location?.state as Record<string, unknown> | undefined;
  return {
    ...location,
    key: typeof locationState?.__TSR_key === "string" ? locationState.__TSR_key : "",
  };
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>() {
  const matches = useRouterState({
    select: state => state.matches as any[],
  }) as any[];

  return useMemo(() => {
    const mergedParams: Record<string, string | undefined> = {};
    for (const match of matches) {
      Object.assign(mergedParams, match.params);
    }
    return mergedParams as T;
  }, [matches]);
}

export function useSearchParams(): [URLSearchParams, SetSearchParams] {
  const router = useRouter();
  const location = useLocation();
  const searchText = typeof location.search === "string" ? location.search : "";
  const hashText = typeof location.hash === "string" ? location.hash : "";
  const pathnameText = typeof location.pathname === "string" ? location.pathname : "/";

  const searchParams = useMemo(
    () => new URLSearchParams(searchText.startsWith("?") ? searchText.slice(1) : searchText),
    [searchText],
  );

  const setSearchParams = useCallback<SetSearchParams>((nextInit, options) => {
    const previous = new URLSearchParams(searchText.startsWith("?") ? searchText.slice(1) : searchText);
    const resolvedValue = typeof nextInit === "function" ? nextInit(previous) : nextInit;
    const nextSearchParams = toUrlSearchParams(resolvedValue as Exclude<SetSearchParamsAction, ((prev: URLSearchParams) => unknown)>);
    const queryString = nextSearchParams.toString();
    const href = `${pathnameText}${queryString ? `?${queryString}` : ""}${hashText}`;
    if (options?.replace) {
      router.history.replace(href, options.state);
      return;
    }
    router.history.push(href, options?.state);
  }, [hashText, pathnameText, router, searchText]);

  return [searchParams, setSearchParams];
}

export function useMatch(pattern: string) {
  const matchRoute = useMatchRoute();
  return matchRoute({ to: pattern, fuzzy: false }) ?? null;
}

export function ScrollRestoration() {
  return <TanStackScrollRestoration />;
}

export function Meta() {
  return null;
}

export function Links() {
  return null;
}

export function Scripts() {
  return null;
}

export function isRouteErrorResponse(error: unknown): error is { status: number; statusText?: string; data?: any } {
  return typeof error === "object"
    && error !== null
    && "status" in error
    && typeof (error as { status?: unknown }).status === "number";
}

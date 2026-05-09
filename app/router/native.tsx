import type React from "react";
import {
  Outlet as TanStackOutlet,
  Scripts as TanStackScripts,
  ScrollRestoration as TanStackScrollRestoration,
  useMatchRoute,
  useRouter,
  useRouterState,
  useLocation as useTanStackLocation,
} from "@tanstack/react-router";
import { useCallback, useEffect, useMemo } from "react";

interface NavigateOptions {
  replace?: boolean;
  state?: unknown;
}

interface ToObject {
  pathname?: string;
  search?: string;
  hash?: string;
}

type To = string | ToObject;

export type NavigateFunction = (to: To | number, options?: NavigateOptions) => void;

type LinkProps = Omit<React.ComponentPropsWithoutRef<"a">, "href"> & {
  ref?: React.Ref<HTMLAnchorElement>;
  to: To;
  replace?: boolean;
};

type NavLinkProps = Omit<LinkProps, "className"> & {
  className?: string | ((state: { isActive: boolean; isPending: boolean }) => string);
  to: To;
  end?: boolean;
};

interface NavigateProps {
  to: To;
  replace?: boolean;
  state?: unknown;
}

type SetSearchParamsAction
  = | URLSearchParams
    | string
    | string[][]
    | Record<string, string>
    | ((prev: URLSearchParams) => URLSearchParams | string | string[][] | Record<string, string>);

type SetSearchParams = (nextInit: SetSearchParamsAction, options?: NavigateOptions) => void;

function normalizeSearch(search: string | undefined) {
  if (!search) {
    return "";
  }
  return search.startsWith("?") ? search : `?${search}`;
}

function normalizeHash(hash: string | undefined) {
  if (!hash) {
    return "";
  }
  return hash.startsWith("#") ? hash : `#${hash}`;
}

function normalizeHref(currentHref: string, to: To) {
  const currentUrl = new URL(currentHref, "http://tanstack.local");
  if (typeof to === "string") {
    return new URL(to, currentUrl).toString().replace("http://tanstack.local", "");
  }

  const nextUrl = new URL(currentUrl.toString());
  if (typeof to.pathname === "string" && to.pathname.length > 0) {
    nextUrl.pathname = new URL(to.pathname, currentUrl).pathname;
  }
  if ("search" in to) {
    nextUrl.search = normalizeSearch(to.search);
  }
  if ("hash" in to) {
    nextUrl.hash = normalizeHash(to.hash);
  }
  return nextUrl.toString().replace("http://tanstack.local", "");
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
}: LinkProps) {
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
}: NavLinkProps) {
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

export function Navigate({ to, replace = false, state }: NavigateProps) {
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

  return useCallback((to: To | number, options?: NavigateOptions) => {
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
  const pathname = typeof location?.pathname === "string" ? location.pathname : "/";
  const search = typeof location?.searchStr === "string"
    ? location.searchStr
    : (typeof location?.search === "string" ? location.search : "");
  const hash = typeof location?.hash === "string" ? location.hash : "";
  const href = `${pathname}${search}${hash}`;
  return {
    ...location,
    pathname,
    search,
    hash,
    href,
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
  const location = useLocation();
  const navigate = useNavigate();
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
    navigate(href, options);
  }, [hashText, navigate, pathnameText, searchText]);

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
  return <TanStackScripts />;
}

export function isRouteErrorResponse(error: unknown): error is { status: number; statusText?: string; data?: any } {
  return typeof error === "object"
    && error !== null
    && "status" in error
    && typeof (error as { status?: unknown }).status === "number";
}

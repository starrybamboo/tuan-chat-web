export type RouteParams = Record<string, string | undefined>;

export interface RouteMetaArgs<
  TData = unknown,
  TParams extends RouteParams = RouteParams,
> {
  data?: TData | null | undefined;
  params: TParams;
}

export interface RouteClientLoaderArgs<
  TParams extends RouteParams = RouteParams,
> {
  params: TParams;
}

export interface RouteLinkDescriptor {
  rel: string;
  href: string;
  crossOrigin?: string;
}

export type RouteLinksFunction = () => RouteLinkDescriptor[];

export interface RouteErrorBoundaryProps<
  TParams extends RouteParams = RouteParams,
> {
  error: Error;
  params: TParams;
}

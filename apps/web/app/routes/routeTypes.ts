export type RouteParams = Record<string, string | undefined>;

export type RouteMetaArgs<
  TData = unknown,
  TParams extends RouteParams = RouteParams,
> = {
  data?: TData | null | undefined;
  params: TParams;
};

export type RouteClientLoaderArgs<
  TParams extends RouteParams = RouteParams,
> = {
  params: TParams;
};

export type RouteLinkDescriptor = {
  rel: string;
  href: string;
  crossOrigin?: string;
};

export type RouteLinksFunction = () => RouteLinkDescriptor[];

export type RouteErrorBoundaryProps<
  TParams extends RouteParams = RouteParams,
> = {
  error: Error;
  params: TParams;
};

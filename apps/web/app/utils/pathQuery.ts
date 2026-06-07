export function appendPathQuery(path: string, query: string | URLSearchParams, hash: string = ""): string {
  const queryText = typeof query === "string" ? query : query.toString();
  return `${path}${queryText ? `?${queryText}` : ""}${hash}`;
}

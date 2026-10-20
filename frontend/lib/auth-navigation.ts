/** Returns a same-origin path suitable for post-authentication navigation. */
export function getSafeRedirectPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

export function withRedirect(path: string, redirectPath: string | null): string {
  return redirectPath ? `${path}?redirect=${encodeURIComponent(redirectPath)}` : path;
}

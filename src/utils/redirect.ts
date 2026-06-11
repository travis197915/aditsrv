export const DEFAULT_POST_LOGIN_PATH = '/claims';

const REDIRECT_QUERY_KEY = 'redirect';

/** Only allow same-origin relative paths to prevent open redirects. */
export function safeRedirectPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const decoded = decodeURIComponent(path);
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return null;
  if (decoded.startsWith('/login') || decoded.startsWith('/register')) return null;
  return decoded;
}

export function readRedirectFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  return safeRedirectPath(params.get(REDIRECT_QUERY_KEY)) ?? DEFAULT_POST_LOGIN_PATH;
}

/** Used when a full-page redirect is required (e.g. 401 from fetch). */
export function buildLoginPath(returnTo?: string): string {
  const safe = safeRedirectPath(returnTo ?? null);
  if (!safe) return '/login';
  return `/login?${REDIRECT_QUERY_KEY}=${encodeURIComponent(safe)}`;
}

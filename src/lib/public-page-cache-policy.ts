const PUBLIC_PAGE_CACHE_EXACT_PATHS = new Set([
  "/",
  "/about",
  "/announcements",
  "/badges",
  "/faq",
  "/featured",
  "/help",
  "/hot",
  "/latest",
  "/level",
  "/new",
  "/tags",
  "/terms",
  "/universe",
])

const PUBLIC_PAGE_CACHE_PREFIXES = [
  "/announcements/",
  "/badges/",
  "/boards/",
  "/faq/",
  "/featured/page/",
  "/feed/",
  "/help/",
  "/hot/page/",
  "/latest/page/",
  "/new/page/",
  "/posts/",
  "/tags/",
  "/users/",
  "/zones/",
] as const

const PUBLIC_PAGE_CACHE_QUERY_KEYS = new Set(["page", "sort", "source", "view"])

export const PUBLIC_PAGE_CACHE_RENDER_HEADER = "x-rhex-public-cache-render"
export const PUBLIC_PAGE_CACHE_TARGET_HEADER = "x-rhex-public-cache-target"
export const PUBLIC_PAGE_CACHE_TTL_SECONDS = 60
export const PUBLIC_PAGE_CACHE_STALE_SECONDS = 30 * 60

interface PublicPageCacheRequestContext {
  hasAuthorization: boolean
  hasBrowsingPreferences: boolean
  hasSession: boolean
  isReactServerComponent: boolean
  isRenderRequest: boolean
  method: string
  pathname: string
  searchParams: URLSearchParams
}

function hasPathSegmentAfterPrefix(pathname: string, prefix: string) {
  return pathname.startsWith(prefix) && pathname.length > prefix.length
}

export function isPublicPageCachePath(pathname: string) {
  if (PUBLIC_PAGE_CACHE_EXACT_PATHS.has(pathname)) {
    return true
  }

  return PUBLIC_PAGE_CACHE_PREFIXES.some((prefix) => hasPathSegmentAfterPrefix(pathname, prefix))
}

export function normalizePublicPageCacheTarget(pathname: string, searchParams: URLSearchParams) {
  if (!pathname.startsWith("/") || pathname.startsWith("//") || !isPublicPageCachePath(pathname)) {
    return null
  }

  const normalizedSearchParams = new URLSearchParams()
  for (const [key, value] of searchParams.entries()) {
    if (!PUBLIC_PAGE_CACHE_QUERY_KEYS.has(key)) {
      return null
    }

    normalizedSearchParams.append(key, value)
  }

  normalizedSearchParams.sort()
  const query = normalizedSearchParams.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function resolvePublicPageCacheTarget(input: PublicPageCacheRequestContext) {
  if (
    (input.method !== "GET" && input.method !== "HEAD")
    || input.isRenderRequest
    || input.hasAuthorization
    || input.isReactServerComponent
    || input.hasSession
    || input.hasBrowsingPreferences
  ) {
    return null
  }

  return normalizePublicPageCacheTarget(input.pathname, input.searchParams)
}

export function parsePublicPageCacheTarget(target: string) {
  if (!target || target.length > 2_048 || !target.startsWith("/") || target.startsWith("//")) {
    return null
  }

  try {
    const parsed = new URL(target, "http://rhex.internal")
    if (parsed.origin !== "http://rhex.internal") {
      return null
    }

    return normalizePublicPageCacheTarget(parsed.pathname, parsed.searchParams)
  } catch {
    return null
  }
}

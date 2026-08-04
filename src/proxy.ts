import { NextResponse, type NextRequest } from "next/server"

import { buildUnauthorizedResponse, getSessionFromRequest, isProtectedPath } from "@/lib/auth-guards"
import { isForumContentPath } from "@/lib/forum-access-guard"
import { buildHomeFeedHref, normalizeHomeFeedSort, parseHomeFeedPage, type HomeFeedSort } from "@/lib/home-feed-route"
import { BROWSING_PREFERENCES_COOKIE_NAME } from "@/lib/browsing-preferences"
import {
  PUBLIC_PAGE_CACHE_RENDER_HEADER,
  PUBLIC_PAGE_CACHE_TARGET_HEADER,
  resolvePublicPageCacheTarget,
} from "@/lib/public-page-cache-policy"
import { RHEX_PATHNAME_HEADER } from "@/lib/request-context-headers"
import { getSessionClearedCookieOptions, getSessionCookieName } from "@/lib/session"
import { getServerSiteSettings } from "@/lib/site-settings"

const PATH_HOME_FEED_SORTS: Record<string, HomeFeedSort> = {
  "/latest": "latest",
  "/new": "new",
  "/hot": "hot",
}

const FORUM_DOCUMENT_CACHE_CONTROL = "private, no-cache, max-age=0, must-revalidate"

function isDocumentRequest(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false
  }

  return request.headers.get("sec-fetch-dest") === "document"
    || request.headers.get("accept")?.includes("text/html") === true
}

function isReactServerComponentRequest(request: NextRequest) {
  return request.headers.get("rsc") === "1"
    || request.headers.has("next-router-state-tree")
    || request.headers.get("accept")?.includes("text/x-component") === true
}

function getAnonymousPublicPageCacheTarget(request: NextRequest) {
  return resolvePublicPageCacheTarget({
    method: request.method,
    pathname: request.nextUrl.pathname,
    searchParams: request.nextUrl.searchParams,
    isRenderRequest: request.headers.get(PUBLIC_PAGE_CACHE_RENDER_HEADER) === "1",
    hasAuthorization: request.headers.has("authorization"),
    isReactServerComponent: isReactServerComponentRequest(request),
    hasSession: request.cookies.has(getSessionCookieName()),
    hasBrowsingPreferences: request.cookies.has(BROWSING_PREFERENCES_COOKIE_NAME),
  })
}

function rewriteToAnonymousPublicPageCache(request: NextRequest, target: string) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(PUBLIC_PAGE_CACHE_TARGET_HEADER, target)

  const url = request.nextUrl.clone()
  url.pathname = "/api/internal/public-page-cache"
  url.search = ""

  return NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  })
}

function redirectLegacyHomeFeedPageQuery(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return null
  }

  const rootPath = request.nextUrl.pathname === "/"
  const rawSort = request.nextUrl.searchParams.get("sort")
  const rawPage = request.nextUrl.searchParams.get("page")
  const sort = PATH_HOME_FEED_SORTS[request.nextUrl.pathname]
    ?? (rootPath && (rawSort !== null || rawPage !== null)
      ? normalizeHomeFeedSort(rawSort ?? undefined)
      : null)
  if (!sort || (rawPage === null && rawSort === null)) {
    return null
  }

  const url = request.nextUrl.clone()
  url.pathname = buildHomeFeedHref(sort, parseHomeFeedPage(rawPage ?? undefined))
  url.search = ""

  return NextResponse.redirect(url)
}

function nextWithRequestContext(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(RHEX_PATHNAME_HEADER, request.nextUrl.pathname)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (isForumContentPath(request.nextUrl.pathname) && isDocumentRequest(request)) {
    response.headers.set("Cache-Control", FORUM_DOCUMENT_CACHE_CONTROL)
  }

  return response
}

async function isForumBrowseProtectedPath(pathname: string) {
  if (!isForumContentPath(pathname)) {
    return false
  }

  try {
    const settings = await getServerSiteSettings()
    return settings.forumRequireLoginToBrowse
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const legacyHomeFeedRedirect = redirectLegacyHomeFeedPageQuery(request)
  if (legacyHomeFeedRedirect) {
    return legacyHomeFeedRedirect
  }

  

  const token = request.cookies.get(getSessionCookieName())?.value
  const protectedPath = isProtectedPath(request.nextUrl.pathname)
    || await isForumBrowseProtectedPath(request.nextUrl.pathname)

  if (!protectedPath) {
    return nextWithRequestContext(request)
  }

  if (!token) {
    return buildUnauthorizedResponse(request)
  }

  const session = await getSessionFromRequest(request)
  if (session) {
    return nextWithRequestContext(request)
  }

  if (protectedPath) {
    const response = buildUnauthorizedResponse(request)
    response.cookies.set(getSessionCookieName(), "", getSessionClearedCookieOptions({ request }))
    return response
  }

  const response = nextWithRequestContext(request)
  response.cookies.set(getSessionCookieName(), "", getSessionClearedCookieOptions({ request }))
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
}

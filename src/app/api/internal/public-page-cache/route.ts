import { after } from "next/server"

import {
  acquirePublicPageCacheRenderLease,
  getPublicPageCacheGeneration,
  isFreshPublicPageCacheEntry,
  isPublicPageCacheAvailable,
  type PublicPageCacheEntry,
  readPublicPageCacheEntry,
  writePublicPageCacheEntry,
} from "@/lib/public-page-cache"
import {
  parsePublicPageCacheTarget,
  PUBLIC_PAGE_CACHE_RENDER_HEADER,
  PUBLIC_PAGE_CACHE_STALE_SECONDS,
  PUBLIC_PAGE_CACHE_TARGET_HEADER,
  PUBLIC_PAGE_CACHE_TTL_SECONDS,
} from "@/lib/public-page-cache-policy"
import { ensurePublicPageCacheWarmLoop } from "@/lib/public-page-cache-warm"

export const dynamic = "force-dynamic"

const CACHEABLE_RESPONSE_HEADERS = [
  "content-language",
  "content-type",
  "link",
  "location",
  "vary",
  "x-powered-by",
] as const

function getInternalOrigin() {
  const rawPort = Number(process.env.PORT ?? "3000")
  const port = Number.isSafeInteger(rawPort) && rawPort > 0 && rawPort <= 65_535 ? rawPort : 3000
  return `http://127.0.0.1:${port}`
}

function buildResponse(entry: PublicPageCacheEntry, method: string, cacheStatus: string) {
  const headers = new Headers(entry.headers)
  headers.set(
    "Cache-Control",
    `public, s-maxage=${PUBLIC_PAGE_CACHE_TTL_SECONDS}, stale-while-revalidate=${PUBLIC_PAGE_CACHE_STALE_SECONDS}`,
  )
  headers.set("X-Rhex-Cache", cacheStatus)

  return new Response(method === "HEAD" ? null : entry.body, {
    status: entry.status,
    headers,
  })
}

function getCacheIdentity(request: Request, target: string) {
  const host = request.headers.get("host")?.trim().toLowerCase() || "default"
  return `${host}\n${target}`
}

function applyCacheHeaders(response: Response, cacheStatus: string) {
  response.headers.set(
    "Cache-Control",
    `public, s-maxage=${PUBLIC_PAGE_CACHE_TTL_SECONDS}, stale-while-revalidate=${PUBLIC_PAGE_CACHE_STALE_SECONDS}`,
  )
  response.headers.set("X-Rhex-Cache", cacheStatus)
  return response
}

function passthroughHeaders(upstream: Response) {
  const headers = new Headers(upstream.headers)
  headers.delete("content-length")
  headers.delete("content-encoding")
  headers.delete("transfer-encoding")
  headers.delete("connection")
  headers.delete("keep-alive")
  return headers
}

async function renderTargetStream(request: Request, target: string) {
  const headers = new Headers()
  headers.set("Accept", "text/html")
  headers.set("Accept-Encoding", "identity")
  headers.set("User-Agent", "Mozilla/5.0 (compatible; RhexPublicPageCache/1.0)")
  headers.set(PUBLIC_PAGE_CACHE_RENDER_HEADER, "1")

  const acceptLanguage = request.headers.get("accept-language")
  if (acceptLanguage) {
    headers.set("Accept-Language", acceptLanguage)
  }

  const upstream = await fetch(new URL(target, getInternalOrigin()), {
    method: "GET",
    headers,
    cache: "no-store",
    redirect: "manual",
  })

  const responseHeaders: Record<string, string> = {}
  for (const name of CACHEABLE_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)
    if (value) {
      responseHeaders[name] = value
    }
  }

  const cacheable = upstream.status === 200
    && upstream.headers.get("content-type")?.toLowerCase().includes("text/html") === true

  if (!upstream.body || request.method === "HEAD" || !cacheable) {
    const bodyText = upstream.body ? await upstream.text() : ""
    return {
      response: new Response(request.method === "HEAD" || !bodyText ? null : bodyText, {
        status: upstream.status,
        headers: passthroughHeaders(upstream),
      }),
      entryPromise: Promise.resolve<PublicPageCacheEntry | null>(bodyText
        ? {
          body: bodyText,
          headers: responseHeaders,
          status: upstream.status,
          storedAt: Date.now(),
        }
        : null),
      cacheable,
    }
  }

  const [browserStream, cacheStream] = upstream.body.tee()
  const entryPromise = (async (): Promise<PublicPageCacheEntry | null> => {
    const chunks: Uint8Array[] = []
    const reader = cacheStream.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        chunks.push(value)
      }
      return {
        body: Buffer.concat(chunks).toString("utf8"),
        headers: responseHeaders,
        status: upstream.status,
        storedAt: Date.now(),
      }
    } catch {
      return null
    } finally {
      reader.releaseLock()
    }
  })()

  return {
    response: new Response(browserStream, {
      status: upstream.status,
      headers: passthroughHeaders(upstream),
    }),
    entryPromise,
    cacheable,
  }
}

async function streamBypassResponse(request: Request, target: string) {
  const rendered = await renderTargetStream(request, target)
  return applyCacheHeaders(rendered.response, "BYPASS")
}

async function waitForColdCache(generation: string, target: string) {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 75))
    const entry = await readPublicPageCacheEntry(generation, target)
    if (entry) {
      return entry
    }
  }
  return null
}

async function handle(request: Request) {
  const target = parsePublicPageCacheTarget(
    request.headers.get(PUBLIC_PAGE_CACHE_TARGET_HEADER)?.trim() ?? "",
  )

  if (!target) {
    return new Response("Not Found", { status: 404 })
  }

  if (!isPublicPageCacheAvailable()) {
    return streamBypassResponse(request, target)
  }

  ensurePublicPageCacheWarmLoop()

  try {
    const generation = await getPublicPageCacheGeneration(target)
    const cacheIdentity = getCacheIdentity(request, target)
    const cached = await readPublicPageCacheEntry(generation, cacheIdentity)

    if (cached && isFreshPublicPageCacheEntry(cached)) {
      return buildResponse(cached, request.method, "HIT")
    }

    const lease = await acquirePublicPageCacheRenderLease(generation, cacheIdentity)
    if (!lease) {
      if (cached) {
        return buildResponse(cached, request.method, "STALE")
      }

      const filled = await waitForColdCache(generation, cacheIdentity)
      if (filled) {
        return buildResponse(filled, request.method, "HIT")
      }

      return streamBypassResponse(request, target)
    }

    if (cached) {
      after(async () => {
        try {
          const rendered = await renderTargetStream(request, target)
          const entry = await rendered.entryPromise
          if (rendered.cacheable && entry) {
            await writePublicPageCacheEntry(generation, cacheIdentity, entry)
          }
        } catch (error) {
          console.error("[public-page-cache] background refresh failed", error)
        } finally {
          await lease.release().catch(() => false)
        }
      })
      return buildResponse(cached, request.method, "STALE")
    }

    const renderedResult = await renderTargetStream(request, target)
    if (renderedResult.cacheable) {
      after(async () => {
        try {
          const entry = await renderedResult.entryPromise
          if (entry) {
            await writePublicPageCacheEntry(generation, cacheIdentity, entry)
          }
        } catch (error) {
          console.error("[public-page-cache] cache write failed", error)
        } finally {
          await lease.release().catch(() => false)
        }
      })
    } else {
      await lease.release().catch(() => false)
    }
    return applyCacheHeaders(renderedResult.response, "MISS")
  } catch (error) {
    console.error("[public-page-cache] request failed", error)
    return streamBypassResponse(request, target)
  }
}

export const GET = handle
export const HEAD = handle

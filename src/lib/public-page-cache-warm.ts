import "server-only"

import { getBoards } from "@/lib/boards"
import {
  PUBLIC_PAGE_CACHE_RENDER_HEADER,
  PUBLIC_PAGE_CACHE_TARGET_HEADER,
} from "@/lib/public-page-cache-policy"

const WARM_EXACT_PATHS = ["/", "/hot", "/latest", "/new", "/featured", "/announcements"]
const WARM_TOP_BOARDS = 4
const WARM_INTERVAL_MS = 5 * 60 * 1000
const WARM_FETCH_TIMEOUT_MS = 20_000

type WarmGlobalState = {
  __rhexPublicPageCacheWarmStarted?: boolean
}

const globalForWarm = globalThis as typeof globalThis & WarmGlobalState

function getInternalOrigin() {
  const rawPort = Number(process.env.PORT ?? "3000")
  const port = Number.isSafeInteger(rawPort) && rawPort > 0 && rawPort <= 65_535 ? rawPort : 3000
  return `http://127.0.0.1:${port}`
}

async function warmTarget(target: string) {
  try {
    const headers = new Headers()
    headers.set(PUBLIC_PAGE_CACHE_TARGET_HEADER, target)
    headers.set(PUBLIC_PAGE_CACHE_RENDER_HEADER, "1")
    headers.set("Accept", "text/html")
    headers.set("Accept-Encoding", "identity")
    headers.set("User-Agent", "RhexPublicPageCacheWarmer/1.0")

    const response = await fetch(new URL("/api/internal/public-page-cache", getInternalOrigin()), {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(WARM_FETCH_TIMEOUT_MS),
    })

    await response.arrayBuffer()
  } catch (error) {
    console.error(`[public-page-cache] warm target failed: ${target}`, error)
  }
}

async function warmOnce() {
  const boards = await getBoards().catch(() => [])
  const targets = [
    ...WARM_EXACT_PATHS,
    ...boards.slice(0, WARM_TOP_BOARDS).map((board) => `/boards/${board.slug}`),
  ]

  for (const target of targets) {
    await warmTarget(target)
  }
}

export function ensurePublicPageCacheWarmLoop() {
  if (globalForWarm.__rhexPublicPageCacheWarmStarted) {
    return
  }

  globalForWarm.__rhexPublicPageCacheWarmStarted = true

  void warmOnce()

  const timer = setInterval(() => {
    void warmOnce()
  }, WARM_INTERVAL_MS)

  if (typeof timer.unref === "function") {
    timer.unref()
  }
}

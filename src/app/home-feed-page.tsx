import type { Metadata } from "next"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { Suspense } from "react"

import {
  AddonSlotRenderer,
  AddonSurfaceRenderer,
} from "@/addons-host"
import { ForumPageShell } from "@/components/forum/forum-page-shell"
import { AutoCheckInOnHomeEnterCurrentUser } from "@/components/home/auto-check-in-on-home-enter-current-user"
import { HomeFeedTabs } from "@/components/home/home-feed-tabs"
import { SiteHeader } from "@/components/site-header"
import {
  buildAddonHookSearchParams,
} from "@/lib/addon-feed-posts"
import {
  getAddonHomeFeedMetadata,
  listAddonHomeFeedTabs,
} from "@/lib/addon-home-feed-providers"
import { getBoards } from "@/lib/boards"
import { getLocalDateKey } from "@/lib/date-key"
import {
  buildAddonHomeFeedHref,
  buildHomeFeedHref,
  type HomeFeedSort,
  parseHomeFeedPage,
} from "@/lib/home-feed-route"
import {
  buildResolvedHomeFeedTabs,
  resolveDefaultAddonHomeFeedTab,
} from "@/lib/home-feed-tabs"
import { getRssHomeDisplaySettings } from "@/lib/rss-harvest"
import { getSiteSettings } from "@/lib/site-settings"
import { getZones } from "@/lib/zones"
import {
  HomeFeedBodyContent,
  HomeFeedBodySkeleton,
  HomeFeedDeferredContext,
  HomeSidebarContent,
  HomeSidebarSkeleton,
} from "@/app/home-feed-sections"

const HOME_FEED_LABELS: Record<HomeFeedSort, string> = {
  latest: "首页",
  new: "新贴",
  hot: "热门",
  featured: "精华",
  following: "我的关注",
  universe: "宇宙",
}

interface HomeFeedPageProps {
  sort?: HomeFeedSort
  addonTabSlug?: string
  page?: number | string | string[]
  searchParams?: Promise<{ page?: string | string[]; source?: string | string[] }>
  mainTopSlot?: ReactNode
  autoCheckInOnEnter?: boolean
  enableUniverseSourceFilter?: boolean
}

export async function generateHomeFeedMetadata(
  sort: HomeFeedSort,
): Promise<Metadata> {
  const settings = await getSiteSettings()
  const pageTitle = HOME_FEED_LABELS[sort]

  return {
    title: `${settings.siteName} - ${pageTitle}`,
    description: settings.siteDescription,
    openGraph: {
      title: `${settings.siteName} - ${pageTitle}`,
      description: settings.siteDescription,
      type: "website",
    },
  }
}

export async function generateAddonHomeFeedMetadata(
  slug: string,
  pathname = `/feed/${slug}`,
): Promise<Metadata> {
  const [settings, addonTabs, metadata] = await Promise.all([
    getSiteSettings(),
    listAddonHomeFeedTabs(),
    getAddonHomeFeedMetadata({
      slug,
      pathname,
    }),
  ])
  const tab = addonTabs.find((item) => item.slug === slug) ?? null
  const pageTitle = metadata?.title?.trim() || tab?.label || "首页"
  const pageDescription =
    metadata?.description?.trim() || tab?.description || settings.siteDescription

  return {
    title: `${settings.siteName} - ${pageTitle}`,
    description: pageDescription,
    openGraph: {
      title: `${settings.siteName} - ${pageTitle}`,
      description: pageDescription,
      type: "website",
    },
  }
}

export async function HomeFeedPage({
  sort,
  addonTabSlug,
  page,
  searchParams,
  mainTopSlot,
  autoCheckInOnEnter = false,
  enableUniverseSourceFilter = false,
}: HomeFeedPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const rawPage = resolvedSearchParams?.page ?? page
  const rawUniverseSource = resolvedSearchParams?.source
  const currentPage = parseHomeFeedPage(rawPage)
  const currentUniverseSourceId = typeof rawUniverseSource === "string" ? rawUniverseSource.trim() : ""

  if (!sort && !addonTabSlug) {
    throw new Error("HomeFeedPage requires sort or addonTabSlug")
  }

  const settingsPromise = getSiteSettings()
  const rssHomeSettingsPromise = getRssHomeDisplaySettings()
  const addonTabsPromise = listAddonHomeFeedTabs()

  const [
    boards,
    zones,
    settings,
    rssHomeSettings,
    addonTabs,
  ] = await Promise.all([
    getBoards(),
    getZones(),
    settingsPromise,
    rssHomeSettingsPromise,
    addonTabsPromise,
  ])

  const showUniverse = rssHomeSettings.homeDisplayEnabled
  const defaultAddonTab = resolveDefaultAddonHomeFeedTab(addonTabs)
  const currentAddonTab = addonTabSlug
    ? addonTabs.find((item) => item.slug === addonTabSlug) ?? null
    : null
  const currentSort = currentAddonTab ? null : (sort ?? "latest")
  const currentTabKey = currentAddonTab?.slug ?? currentSort ?? "latest"
  const homeFeedTabs = buildResolvedHomeFeedTabs({
    addonTabs,
    showUniverse,
    rootAddonSlug: defaultAddonTab?.slug ?? null,
  })

  if (rawPage !== undefined && currentPage === 1) {
    if (currentAddonTab) {
      redirect(
        buildAddonHomeFeedHref(
          currentAddonTab.slug,
          1,
          currentAddonTab.slug === defaultAddonTab?.slug,
        ),
      )
    }

    if (currentSort) {
      redirect(buildHomeFeedHref(currentSort))
    }
  }

  if (addonTabSlug && !currentAddonTab) {
    redirect(buildHomeFeedHref("latest"))
  }

  if (currentSort === "universe" && !showUniverse) {
    redirect(buildHomeFeedHref("latest"))
  }

  const addonHookSearchParams = buildAddonHookSearchParams(resolvedSearchParams)
  const context: HomeFeedDeferredContext = {
    addonTabSlug,
    settings,
    currentSort,
    currentAddonTab,
    defaultAddonTabSlug: defaultAddonTab?.slug ?? null,
    currentPage,
    rssHomeSettings,
    enableUniverseSourceFilter,
    currentUniverseSourceId,
    addonHookSearchParams,
  }
  const shouldShowRightSidebar = settings.homeSidebarEnabled

  const sortBeforeSlot =
    currentSort === "new"
      ? "feed.new.before"
      : currentSort === "hot"
        ? "feed.hot.before"
        : currentSort === "following"
          ? "feed.following.before"
          : currentSort === "universe"
            ? "feed.universe.before"
            : "feed.latest.before"
  const sortAfterSlot =
    currentSort === "new"
      ? "feed.new.after"
      : currentSort === "hot"
        ? "feed.hot.after"
        : currentSort === "following"
          ? "feed.following.after"
          : currentSort === "universe"
            ? "feed.universe.after"
            : "feed.latest.after"
  const feedSlotProps = {
    addonTabSlug,
    currentPage,
    settings,
    sort: currentSort,
  }

  const feedPanel = (
    <div className="overflow-hidden rounded-md bg-background">
      <HomeFeedTabs currentKey={currentTabKey} tabs={homeFeedTabs} />
      <Suspense fallback={<HomeFeedBodySkeleton />}>
        <HomeFeedBodyContent context={context} />
      </Suspense>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <AutoCheckInOnHomeEnterCurrentUser
        enabled={autoCheckInOnEnter && settings.checkInEnabled}
        todayKey={getLocalDateKey()}
      />
      <SiteHeader />

      <div className="mx-auto max-w-[1200px] px-1">
        <AddonSlotRenderer slot="feed.page.before" props={feedSlotProps} />
        <AddonSurfaceRenderer surface="feed.page" props={feedSlotProps}>
          <ForumPageShell
            zones={zones}
            boards={boards}
            main={(
              <div className="pb-12 py-1">
                {currentSort ? <AddonSlotRenderer slot={sortBeforeSlot} props={feedSlotProps} /> : null}
                {currentSort ? (
                  <AddonSurfaceRenderer
                    surface={sortBeforeSlot.replace(".before", "")}
                    props={feedSlotProps}
                  >
                    <>
                      {mainTopSlot ? <div className="mb-4 mt-6">{mainTopSlot}</div> : null}
                      <AddonSlotRenderer slot="feed.main.before" props={feedSlotProps} />
                      <AddonSurfaceRenderer surface="feed.main" props={feedSlotProps}>
                        {feedPanel}
                      </AddonSurfaceRenderer>
                      <AddonSlotRenderer slot="feed.main.after" props={feedSlotProps} />
                    </>
                  </AddonSurfaceRenderer>
                ) : (
                  <>
                    {mainTopSlot ? <div className="mb-4 mt-6">{mainTopSlot}</div> : null}
                    <AddonSlotRenderer slot="feed.main.before" props={feedSlotProps} />
                    <AddonSurfaceRenderer surface="feed.main" props={feedSlotProps}>
                      {feedPanel}
                    </AddonSurfaceRenderer>
                    <AddonSlotRenderer slot="feed.main.after" props={feedSlotProps} />
                  </>
                )}
                {currentSort ? <AddonSlotRenderer slot={sortAfterSlot} props={feedSlotProps} /> : null}
              </div>
            )}
            rightSidebar={shouldShowRightSidebar ? (
              <Suspense fallback={<HomeSidebarSkeleton />}>
                <HomeSidebarContent context={context} />
              </Suspense>
            ) : null}
          />
        </AddonSurfaceRenderer>
        <AddonSlotRenderer slot="feed.page.after" props={feedSlotProps} />
      </div>
    </div>
  )
}

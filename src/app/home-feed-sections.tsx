import { redirect } from "next/navigation"

import { AddonRenderBlock, AddonSlotRenderer, AddonSurfaceRenderer } from "@/addons-host"
import { buildHomeSidebarCurrentUserSettings, HomeSidebarPanels } from "@/components/home/home-sidebar-panels"
import { ForumFeedView } from "@/components/forum/forum-feed-view"
import { InfiniteForumFeed } from "@/components/forum/infinite-forum-feed"
import { PageNumberPagination } from "@/components/page-number-pagination"
import { RssUniverseFeedView } from "@/components/rss/rss-universe-feed-view"
import { RssUniversePageClient } from "@/components/rss/rss-universe-page-client"
import { SelfServeAdsSidebar } from "@/components/self-serve-ads-sidebar"
import { resolveContentVisibleAdminActor } from "@/lib/admin-scope-permissions"
import { buildAddonHookSearchParams, buildHookedFeedDisplayItems } from "@/lib/addon-feed-posts"
import { renderAddonHomeFeedTab, listAddonHomeFeedTabs } from "@/lib/addon-home-feed-providers"
import { getHomeAnnouncements } from "@/lib/announcements"
import { getCurrentUser } from "@/lib/auth"
import { getFriendLinkListData } from "@/lib/friend-links"
import { getLatestFeed } from "@/lib/forum-feed"
import { buildHomeFeedHref, type HomeFeedSort } from "@/lib/home-feed-route"
import { getHomeSidebarHotTopics } from "@/lib/home-sidebar"
import { groupHomeSidebarPanels } from "@/lib/home-sidebar-layout"
import { getHomeSidebarStats } from "@/lib/home-sidebar-stats"
import { POST_LIST_LOAD_MODE_INFINITE } from "@/lib/post-list-load-mode"
import { attachPostListTipSummaries, shouldAttachPostListTipSummaries } from "@/lib/post-list-tipping"
import { getRssHomeDisplaySettings } from "@/lib/rss-harvest"
import { getRssUniverseFeedPage } from "@/lib/rss-public-feed"
import { getSelfServeAdsAppConfig, getSelfServeAdsPanelData } from "@/lib/self-serve-ads"
import { toSelfServeAdConfig } from "@/lib/self-serve-ads.shared"
import type { SiteSettingsData } from "@/lib/site-settings"

type HomeAddonTabItem = Awaited<ReturnType<typeof listAddonHomeFeedTabs>>[number]
type RssHomeSettingsData = Awaited<ReturnType<typeof getRssHomeDisplaySettings>>
type AddonHookSearchParams = ReturnType<typeof buildAddonHookSearchParams>

export type HomeFeedDeferredContext = {
  addonTabSlug?: string
  settings: SiteSettingsData
  currentSort: HomeFeedSort | null
  currentAddonTab: HomeAddonTabItem | null
  defaultAddonTabSlug: string | null
  currentPage: number
  rssHomeSettings: RssHomeSettingsData
  enableUniverseSourceFilter: boolean
  currentUniverseSourceId: string
  addonHookSearchParams: AddonHookSearchParams
}

export async function HomeFeedBodyContent({ context }: { context: HomeFeedDeferredContext }) {
  const {
    settings,
    currentSort,
    currentAddonTab,
    defaultAddonTabSlug,
    currentPage,
    rssHomeSettings,
    enableUniverseSourceFilter,
    currentUniverseSourceId,
    addonHookSearchParams,
  } = context
  const needsServerCurrentUser =
    currentSort === "following"
    || (currentSort === "universe" && !enableUniverseSourceFilter)
    || Boolean(currentSort && shouldAttachPostListTipSummaries(settings.homeFeedPostListDisplayMode))
  const currentUser = needsServerCurrentUser ? await getCurrentUser() : null
  const adminActor = currentUser ? await resolveContentVisibleAdminActor(currentUser) : null
  const postListViewer = currentUser
    ? {
        userId: currentUser.id,
        adminActor,
      }
    : null
  const postFeedPage =
    currentSort && currentSort !== "universe"
      ? await getLatestFeed(
          currentPage,
          settings.homeFeedPostPageSize,
          currentSort,
          currentUser?.id,
          settings.homeHotRecentWindowHours,
          postListViewer,
        )
      : null
  const universeFeedPage =
    currentSort === "universe" && !enableUniverseSourceFilter
      ? await getRssUniverseFeedPage(currentPage, rssHomeSettings.homePageSize, null, currentUser?.id)
      : null
  const addonFeedResult = currentAddonTab
    ? await renderAddonHomeFeedTab({
        slug: currentAddonTab.slug,
        page: currentPage,
        pathname:
          currentAddonTab.slug === defaultAddonTabSlug
            ? "/"
            : `/feed/${currentAddonTab.slug}`,
        searchParams: addonHookSearchParams,
      })
    : null

  const homeFeedDisplayItems =
    currentSort && currentSort !== "universe" && postFeedPage
      ? await (async () => {
          if (currentPage !== postFeedPage.page) {
            redirect(buildHomeFeedHref(currentSort, postFeedPage.page))
          }

          const feedPathname =
            currentSort === "new"
              ? "/new"
              : currentSort === "hot"
                ? "/hot"
                : currentSort === "following"
                  ? "/following"
                  : "/"

          const displayItems = await buildHookedFeedDisplayItems({
            items: postFeedPage.items,
            sort: currentSort,
            settings,
            listDisplayMode: settings.homeFeedPostListDisplayMode,
            pathname: feedPathname,
            searchParams: addonHookSearchParams,
          })

          return shouldAttachPostListTipSummaries(settings.homeFeedPostListDisplayMode)
            ? attachPostListTipSummaries(displayItems, currentUser?.id)
            : displayItems
        })()
      : null

  return (
    <>
      {currentAddonTab ? (
        <div className="lg:pl-4">
          {addonFeedResult ? (
            <AddonRenderBlock
              addonId={addonFeedResult.addonId}
              blockKey={`${addonFeedResult.addonId}:${addonFeedResult.providerCode}:home-feed:${addonFeedResult.tab.slug}`}
              result={addonFeedResult.result}
            />
          ) : (
            <div className="rounded-md p-8 text-sm text-muted-foreground">
              当前插件入口暂时没有可展示的内容。
            </div>
          )}
        </div>
      ) : currentSort === "universe" ? (
        <>
          {enableUniverseSourceFilter ? (
            <RssUniversePageClient initialPage={currentPage} initialSourceId={currentUniverseSourceId || null} />
          ) : universeFeedPage ? (
            <>
              <RssUniverseFeedView items={universeFeedPage.items} support={universeFeedPage.support} />
              {universeFeedPage.items.length === 0 ? (
                <div className="mt-4 rounded-md border bg-background p-8 text-sm text-muted-foreground">
                  宇宙栏目还没有可展示的采集内容。
                </div>
              ) : null}
              {universeFeedPage.pagination.totalPages > 1 ? (
                <PageNumberPagination
                  page={universeFeedPage.pagination.page}
                  totalPages={universeFeedPage.pagination.totalPages}
                  hasPrevPage={universeFeedPage.pagination.hasPrevPage}
                  hasNextPage={universeFeedPage.pagination.hasNextPage}
                  buildHref={(targetPage) =>
                    buildHomeFeedHref("universe", targetPage)
                  }
                />
              ) : null}
            </>
          ) : null}
        </>
      ) : postFeedPage && homeFeedDisplayItems && currentSort ? (
        (() => {
          const {
            items: feed,
            page,
            totalPages,
            hasPrevPage,
            hasNextPage,
          } = postFeedPage
          const useInfiniteFeed =
            settings.homeFeedPostListLoadMode === POST_LIST_LOAD_MODE_INFINITE
          const isFollowingFeed = currentSort === "following"
          const showPagination = isFollowingFeed ? page > 1 || feed.length > 0 : true
          const emptyStateText = isFollowingFeed
            ? currentUser
              ? "你关注的节点和用户还没有可展示的帖子，或者你还没开始关注。"
              : "登录后即可查看你关注的节点和用户最近发帖。"
            : "当前排序下还没有可展示的帖子内容。"

          return (
            <>
              {useInfiniteFeed ? (
                <InfiniteForumFeed
                  initialItems={homeFeedDisplayItems}
                  initialPage={page}
                  initialHasNextPage={hasNextPage}
                  currentSort={currentSort}
                  listDisplayMode={settings.homeFeedPostListDisplayMode}
                  postLinkDisplayMode={settings.postLinkDisplayMode}
                />
              ) : (
                <ForumFeedView
                  items={homeFeedDisplayItems}
                  listDisplayMode={settings.homeFeedPostListDisplayMode}
                  postLinkDisplayMode={settings.postLinkDisplayMode}
                />
              )}

              {feed.length === 0 ? (
                <div className="mt-4 rounded-md border bg-background p-8 text-sm text-muted-foreground">
                  {emptyStateText}
                </div>
              ) : null}

              {showPagination && !useInfiniteFeed ? (
                <PageNumberPagination
                  page={page}
                  totalPages={totalPages}
                  hasPrevPage={hasPrevPage}
                  hasNextPage={hasNextPage}
                  buildHref={(targetPage) =>
                    buildHomeFeedHref(currentSort, targetPage)
                  }
                />
              ) : null}
            </>
          )
        })()
      ) : null}
    </>
  )
}

export async function HomeSidebarContent({ context }: { context: HomeFeedDeferredContext }) {
  const { settings } = context
  const [hotTopics, announcements, friendLinks, selfServeAdsConfig, selfServeAdsPanelData, sidebarStats] = await Promise.all([
    getHomeSidebarHotTopics(settings.homeSidebarHotTopicsCount),
    getHomeAnnouncements(3),
    getFriendLinkListData(10),
    getSelfServeAdsAppConfig(),
    getSelfServeAdsPanelData(),
    settings.homeSidebarStatsCardEnabled
      ? getHomeSidebarStats()
      : Promise.resolve(null),
  ])
  const selfServeAdsResolvedConfig = toSelfServeAdConfig(selfServeAdsConfig)
  const sidebarPanels = groupHomeSidebarPanels(
    selfServeAdsPanelData
      && selfServeAdsResolvedConfig.enabled
      && selfServeAdsResolvedConfig.visibleOnHome
      ? [
          {
            id: "self-serve-ads",
            slot: selfServeAdsResolvedConfig.sidebarSlot,
            order: selfServeAdsResolvedConfig.sidebarOrder,
            content: (
              <SelfServeAdsSidebar
                AppId="self-serve-ads"
                config={selfServeAdsConfig}
                panelData={selfServeAdsPanelData}
              />
            ),
          },
        ]
      : [],
  )

  return (
    <div className="mt-6 hidden pb-12 lg:block">
      <AddonSlotRenderer slot="feed.sidebar.before" props={context} />
      <AddonSurfaceRenderer
        surface="feed.sidebar"
        props={{
          announcements,
          friendLinks,
          hotTopics,
          settings,
          sidebarPanels,
          sidebarStats,
        }}
      >
        <HomeSidebarPanels
          user={null}
          hotTopics={hotTopics}
          postLinkDisplayMode={settings.postLinkDisplayMode}
          announcements={announcements}
          showAnnouncements={settings.homeSidebarAnnouncementsEnabled}
          friendLinks={friendLinks.compact}
          friendLinksEnabled={settings.friendLinksEnabled}
          topPanels={sidebarPanels.top}
          middlePanels={sidebarPanels.middle}
          bottomPanels={sidebarPanels.bottom}
          stats={sidebarStats}
          siteName={settings.siteName}
          siteDescription={settings.siteDescription}
          siteLogoPath={settings.siteLogoPath}
          siteIconPath={settings.siteIconPath}
          currentUserSettings={buildHomeSidebarCurrentUserSettings(settings)}
          selfServeAdsSurface={false}
        />
      </AddonSurfaceRenderer>
      <AddonSlotRenderer slot="feed.sidebar.after" props={context} />
    </div>
  )
}

export function HomeFeedBodySkeleton() {
  return (
    <div className="animate-pulse space-y-2 rounded-md border border-border bg-card p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-14 rounded bg-muted" />
      ))}
    </div>
  )
}

export function HomeSidebarSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-44 rounded-md border border-border bg-card" />
      <div className="h-44 rounded-md border border-border bg-card" />
      <div className="h-24 rounded-md border border-border bg-card" />
    </div>
  )
}

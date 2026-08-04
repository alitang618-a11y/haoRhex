import { redirect } from "next/navigation"

import { AddonSlotRenderer, AddonSurfaceRenderer } from "@/addons-host"
import { BoardFollowButton } from "@/components/board/board-follow-button"
import { BoardSidebarPanels } from "@/components/board/board-sidebar-panels"
import { CollapsibleInfoCard } from "@/components/collapsible-info-card"
import { ForumPostStreamView } from "@/components/forum/forum-post-stream-view"
import { InfiniteForumPostStream } from "@/components/forum/infinite-forum-post-stream"
import { PageNumberPagination } from "@/components/page-number-pagination"
import { RssSubscribeButton } from "@/components/rss/rss-subscribe-button"
import type { SessionActor } from "@/db/session-actor-queries"
import {
  canAdminActorManageBoardWithPermission,
  canAdminActorUsePermission,
  resolveContentVisibleAdminActor,
} from "@/lib/admin-scope-permissions"
import { buildAddonHookSearchParams, buildHookedPostStreamDisplayItems } from "@/lib/addon-feed-posts"
import { getHomeAnnouncements } from "@/lib/announcements"
import { getCurrentUser } from "@/lib/auth"
import { checkBoardPermission } from "@/lib/board-access"
import { getBoardBySlug, getBoardModeratorGroups, getBoardPosts, isUserFollowingBoard, type SiteBoardItem } from "@/lib/boards"
import { DEFAULT_TAXONOMY_POST_SORT, normalizeTaxonomyPostSort, type TaxonomyPostSort } from "@/lib/forum-taxonomy-sort"
import { getHomeSidebarHotTopics, resolveSidebarUser } from "@/lib/home-sidebar"
import { resolveAdminActorFromSessionUser } from "@/lib/moderator-permissions"
import { POST_LIST_LOAD_MODE_INFINITE } from "@/lib/post-list-load-mode"
import { DEFAULT_ALLOWED_POST_TYPES, normalizePostTypes } from "@/lib/post-types"
import { readSearchParam } from "@/lib/search-params"
import { getSiteSettings, type SiteSettingsData } from "@/lib/site-settings"

export interface BoardPageDeferredContext {
  board: SiteBoardItem
  currentUser: SessionActor | null
  settings: SiteSettingsData
  permission: ReturnType<typeof checkBoardPermission>
  searchParams: Record<string, string | string[] | undefined> | undefined
}

function buildBoardPageHref(slug: string, page = 1, sort: TaxonomyPostSort = DEFAULT_TAXONOMY_POST_SORT) {
  const normalizedPage = Math.max(1, Math.trunc(page))
  const query = new URLSearchParams()

  if (sort !== DEFAULT_TAXONOMY_POST_SORT) {
    query.set("sort", sort)
  }

  if (normalizedPage > 1) {
    query.set("page", String(normalizedPage))
  }

  const queryString = query.toString()
  return queryString ? `/boards/${slug}?${queryString}` : `/boards/${slug}`
}

function buildBoardPostsApiPath(slug: string, sort: TaxonomyPostSort) {
  const query = new URLSearchParams()

  if (sort !== DEFAULT_TAXONOMY_POST_SORT) {
    query.set("sort", sort)
  }

  const queryString = query.toString()
  return queryString ? `/api/boards/${encodeURIComponent(slug)}/posts?${queryString}` : `/api/boards/${encodeURIComponent(slug)}/posts`
}

function buildBoardManagementHref(board: { slug: string; zoneId?: string | null }) {
  const query = new URLSearchParams({
    tab: "structure",
    structureKeyword: board.slug,
  })

  if (board.zoneId) {
    query.set("structureZoneId", board.zoneId)
  }

  return `/admin?${query.toString()}`
}

export async function BoardHeroContent({ context }: { context: BoardPageDeferredContext }) {
  const { board, currentUser, settings } = context
  const isFollowingBoard = currentUser
    ? await isUserFollowingBoard(currentUser.id, board.id)
    : false

  return (
    <>
      <AddonSlotRenderer slot="board.hero.before" />
      <AddonSurfaceRenderer surface="board.hero" props={{ board, isFollowingBoard, settings }}>
        <CollapsibleInfoCard
          badge={board.name}
          icon={board.icon}
          description={board.description}
          summary={`当前共收录 ${board.count} 篇内容`}
          summaryActions={<RssSubscribeButton href={`/boards/${board.slug}/rss.xml`} label="RSS" />}
          detailAction={<BoardFollowButton boardId={board.id} initialFollowed={isFollowingBoard} showLabel className="border border-border bg-background/85 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-accent" />}
          alwaysOpen
          hidePills
          pills={[]}
        />
      </AddonSurfaceRenderer>
      <AddonSlotRenderer slot="board.hero.after" />
    </>
  )
}

export async function BoardPostStreamContent({ context }: { context: BoardPageDeferredContext }) {
  const { board, currentUser, settings, permission, searchParams } = context
  const rawPage = readSearchParam(searchParams?.page)
  const rawSort = readSearchParam(searchParams?.sort)
  const currentPage = Math.max(1, Number(rawPage ?? "1") || 1)
  const currentSort = normalizeTaxonomyPostSort(rawSort)
  const [contentVisibleAdminActor, adminActor] = await Promise.all([
    resolveContentVisibleAdminActor(currentUser),
    resolveAdminActorFromSessionUser(currentUser),
  ])
  const postListViewer = {
    userId: currentUser?.id ?? null,
    adminActor: contentVisibleAdminActor,
  }
  const [postsPage] = await Promise.all([
    permission.allowed
      ? getBoardPosts(board.slug, currentPage, settings.boardPostPageSize, currentSort, postListViewer)
      : Promise.resolve({ items: [], page: 1, pageSize: settings.boardPostPageSize, total: 0, totalPages: 1, hasPrevPage: false, hasNextPage: false }),
  ])
  const { items: posts, page, totalPages, hasPrevPage, hasNextPage } = postsPage
  const canonicalPage = currentPage !== page ? page : currentPage

  if (
    currentPage !== page
    || (rawPage !== undefined && currentPage === 1)
    || (rawSort !== undefined && currentSort === DEFAULT_TAXONOMY_POST_SORT)
  ) {
    redirect(buildBoardPageHref(board.slug, canonicalPage, currentSort))
  }

  const postDisplayItems = await buildHookedPostStreamDisplayItems({
    posts,
    settings,
    sort: currentSort,
    listDisplayMode: board.postListDisplayMode,
    visiblePinScopes: ["GLOBAL", "ZONE", "BOARD"],
    pathname: `/boards/${board.slug}`,
    searchParams: buildAddonHookSearchParams(searchParams),
  })
  const useInfinitePostList = board.postListLoadMode === POST_LIST_LOAD_MODE_INFINITE
  const emptyStateText = currentSort === "featured" ? "当前节点还没有精华内容。" : "当前节点还没有内容。"
  const sortLinks = {
    currentSort,
    latestHref: buildBoardPageHref(board.slug, 1, "latest"),
    newHref: buildBoardPageHref(board.slug, 1, "new"),
    featuredHref: buildBoardPageHref(board.slug, 1, "featured"),
  }
  const boardPostsApiPath = buildBoardPostsApiPath(board.slug, currentSort)

  return (
    <>
      <AddonSlotRenderer slot="board.content.before" />
      <AddonSurfaceRenderer surface="board.content" props={{ board, hasNextPage, page, permission, posts, settings, totalPages, useInfinitePostList }}>
        <>
          {useInfinitePostList ? (
            <InfiniteForumPostStream
              apiPath={boardPostsApiPath}
              initialItems={postDisplayItems}
              initialPage={page}
              initialHasNextPage={hasNextPage}
              listDisplayMode={board.postListDisplayMode}
              showBoard={false}
              showPinnedDivider={page === 1}
              postLinkDisplayMode={settings.postLinkDisplayMode}
              sortLinks={sortLinks}
            />
          ) : (
            <ForumPostStreamView
              items={postDisplayItems}
              listDisplayMode={board.postListDisplayMode}
              showBoard={false}
              showPinnedDivider={page === 1}
              postLinkDisplayMode={settings.postLinkDisplayMode}
              sortLinks={sortLinks}
            />
          )}

          {posts.length === 0 ? <div className="rounded-md border bg-background p-8 text-sm text-muted-foreground">{emptyStateText}</div> : null}

          {useInfinitePostList ? null : (
            <PageNumberPagination
              page={page}
              totalPages={totalPages}
              hasPrevPage={hasPrevPage}
              hasNextPage={hasNextPage}
              buildHref={(targetPage) => buildBoardPageHref(board.slug, targetPage, currentSort)}
            />
          )}
        </>
      </AddonSurfaceRenderer>
      <AddonSlotRenderer slot="board.content.after" />
    </>
  )
}

export async function BoardSidebarContent({ context }: { context: BoardPageDeferredContext }) {
  const { board, currentUser, settings } = context
  const adminActor = await resolveAdminActorFromSessionUser(currentUser)
  const canOpenBoardManagement = await canAdminActorUsePermission(adminActor, "admin.structure.view")
    && await canAdminActorManageBoardWithPermission(adminActor, "admin.structure.view", board.id, board.zoneId)
  const [hotTopics, announcements, moderatorGroups, sidebarUser] = await Promise.all([
    getHomeSidebarHotTopics(settings.homeSidebarHotTopicsCount),
    getHomeAnnouncements(3),
    getBoardModeratorGroups(board.id, board.zoneId),
    resolveSidebarUser(currentUser, settings),
  ])

  return (
    <aside className="mt-6 hidden pb-12 lg:block">
      <AddonSlotRenderer slot="board.sidebar.before" />
      <AddonSurfaceRenderer surface="board.sidebar" props={{ announcements, board, hotTopics, moderators: moderatorGroups.boardModerators, zoneModerators: moderatorGroups.zoneModerators, settings }}>
        <BoardSidebarPanels
          user={sidebarUser}
          hotTopics={hotTopics}
          board={board}
          moderators={moderatorGroups.boardModerators}
          zoneModerators={moderatorGroups.zoneModerators}
          boardManagementHref={canOpenBoardManagement ? buildBoardManagementHref(board) : undefined}
          announcements={announcements}
          showAnnouncements={settings.homeSidebarAnnouncementsEnabled}
          postLinkDisplayMode={settings.postLinkDisplayMode}
          createPostHref={`/write?board=${board.slug}`}
          siteName={settings.siteName}
          siteDescription={settings.siteDescription}
          siteLogoPath={settings.siteLogoPath}
          siteIconPath={settings.siteIconPath}
        />
      </AddonSurfaceRenderer>
      <AddonSlotRenderer slot="board.sidebar.after" />
    </aside>
  )
}

export function BoardHeroSkeleton() {
  return (
    <div className="animate-pulse rounded-md border border-border bg-card p-6">
      <div className="h-4 w-24 rounded bg-muted" />
      <div className="mt-3 h-3 w-2/3 rounded bg-muted" />
      <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
    </div>
  )
}

export function BoardPostStreamSkeleton() {
  return (
    <div className="animate-pulse space-y-2 rounded-md border border-border bg-card p-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-12 rounded bg-muted" />
      ))}
    </div>
  )
}

export function BoardSidebarSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-40 rounded-md border border-border bg-card" />
      <div className="h-40 rounded-md border border-border bg-card" />
    </div>
  )
}

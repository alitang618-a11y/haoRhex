import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { AddonSlotRenderer, AddonSurfaceRenderer } from "@/addons-host"
import { AccessDeniedCard } from "@/components/access-denied-card"
import { ForumPageShell } from "@/components/forum/forum-page-shell"
import { SiteHeader } from "@/components/site-header"


import { getCurrentUser } from "@/lib/auth"
import { checkBoardPermission } from "@/lib/board-access"
import { getBoardBySlug, getBoards } from "@/lib/boards"
import { DEFAULT_ALLOWED_POST_TYPES, normalizePostTypes } from "@/lib/post-types"
import { buildMetadataKeywords } from "@/lib/seo"
import { getSiteSettings } from "@/lib/site-settings"
import { getZones } from "@/lib/zones"
import {
  BoardHeroContent,
  BoardHeroSkeleton,
  BoardPageDeferredContext,
  BoardPostStreamContent,
  BoardPostStreamSkeleton,
  BoardSidebarContent,
  BoardSidebarSkeleton,
} from "@/app/boards/[slug]/board-page-sections"

export const dynamic = "force-dynamic"




export async function generateMetadata(props: PageProps<"/boards/[slug]">): Promise<Metadata> {
  const params = await props.params;
  const [board, settings] = await Promise.all([getBoardBySlug(params.slug), getSiteSettings()])

  if (!board) {
    return {
      title: `节点不存在 - ${settings.siteName}`,
    }
  }

  return {
    title: `${board.name} - ${settings.siteName}`,
    description: board.description,
    keywords: buildMetadataKeywords(settings.siteSeoKeywords, [board.name, board.slug, board.description, "节点", "论坛节点"]),
    alternates: {
      canonical: `/boards/${board.slug}`,
    },
    openGraph: {
      title: `${board.name} - ${settings.siteName}`,
      description: board.description,
      type: "website",
    },
  }
}


export default async function BoardPage(props: PageProps<"/boards/[slug]">) {
  const searchParams = await props.searchParams
  const params = await props.params
  const settingsPromise = getSiteSettings()
  const [board, currentUser, settings] = await Promise.all([getBoardBySlug(params.slug), getCurrentUser(), settingsPromise])

  if (!board) {
    notFound()
  }

  const permission = checkBoardPermission(currentUser, {
    postPointDelta: 0,
    replyPointDelta: 0,
    postIntervalSeconds: 120,
    replyIntervalSeconds: 3,
    allowedPostTypes: board.allowedPostTypes ? normalizePostTypes(board.allowedPostTypes.join(",")) : DEFAULT_ALLOWED_POST_TYPES,
    allowUserPost: board.allowUserPost ?? true,
    allowUserReply: board.allowUserReply ?? true,
    allowPostAuthorOfflineComment: board.allowPostAuthorOfflineComment ?? false,
    allowUserOfflineOwnComment: board.allowUserOfflineOwnComment ?? false,
    minViewPoints: board.minViewPoints ?? 0,
    minViewLevel: board.minViewLevel ?? 0,
    minPostPoints: board.minPostPoints ?? 0,
    minPostLevel: board.minPostLevel ?? 0,
    minReplyPoints: board.minReplyPoints ?? 0,
    minReplyLevel: board.minReplyLevel ?? 0,
    minViewVipLevel: board.minViewVipLevel ?? 0,

    minPostVipLevel: board.minPostVipLevel ?? 0,
    minReplyVipLevel: board.minReplyVipLevel ?? 0,
    postRequiredVerificationTypeIds: [],
    postRequiredBadgeIds: [],
    replyRequiredVerificationTypeIds: [],
    replyRequiredBadgeIds: [],
    requirePostReview: board.requirePostReview ?? false,
    requireCommentReview: board.requireCommentReview ?? false,
    showInHomeFeed: true,
  }, "view", settings.pointName)

  const [boards, zones] = await Promise.all([getBoards(), getZones()])
  const context: BoardPageDeferredContext = { board, currentUser, settings, permission, searchParams }
  const shouldShowRightSidebar = board.sidebarEnabled



  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-[1200px] px-1">
        <AddonSlotRenderer slot="board.page.before" />
        <AddonSurfaceRenderer surface="board.page" props={{ board, settings }}>
        <ForumPageShell
          zones={zones}
          boards={boards}
          activeBoardSlug={board.slug}
          main={(
            <main className="pb-12 py-1 mt-5">
            <div className="space-y-3">
              <Suspense fallback={<BoardHeroSkeleton />}>
                <BoardHeroContent context={context} />
              </Suspense>

              {!permission.allowed ? (
                <AccessDeniedCard title="当前节点暂不可访问" description={`该节点设置了${settings.pointName}、等级或 VIP 浏览门槛，未满足条件的用户无法查看节点内容。`} reason={permission.message || "当前没有访问权限"} isLoggedIn={Boolean(currentUser)} redirectTarget={`/boards/${params.slug}`} />
              ) : (
                <Suspense fallback={<BoardPostStreamSkeleton />}>
                  <BoardPostStreamContent context={context} />
                </Suspense>
              )}
            </div>
            </main>
          )}
          rightSidebar={shouldShowRightSidebar ? (
            <Suspense fallback={<BoardSidebarSkeleton />}>
              <BoardSidebarContent context={context} />
            </Suspense>
          ) : null}
        />
        </AddonSurfaceRenderer>
        <AddonSlotRenderer slot="board.page.after" />
      </div>
    </div>
  )
}

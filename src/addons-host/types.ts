import type { PrismaClient } from "@prisma/client"
import type { SessionActor } from "@/db/session-actor-queries"
import type { SiteSettingsData } from "@/lib/site-settings.types"

export const ADDON_SLOT_KEYS = [
  "auth.login.captcha",
  "auth.login.form.after",
  "auth.register.captcha",
  "auth.register.form.after",
  "post.create.captcha",
  "addon.page.before",
  "addon.page.after",
  "addon.page.header.before",
  "addon.page.header.after",
  "addon.page.content.before",
  "addon.page.content.after",
  "layout.head.before",
  "layout.head.after",
  "layout.header.before",
  "layout.header.after",
  "layout.header.left",
  "layout.header.center",
  "layout.header.right",
  "layout.footer.before",
  "layout.footer.after",
  "layout.body.start",
  "layout.body.end",
  "layout.sidebar.left.top",
  "layout.sidebar.left.bottom",
  "layout.sidebar.right.top",
  "layout.sidebar.right.middle",
  "layout.sidebar.right.bottom",
  "home.right.top",
  "home.right.middle",
  "home.right.bottom",
  "board.right.top",
  "board.right.middle",
  "board.right.bottom",
  "post.header.before",
  "post.header.after",
  "post.author.row.before",
  "post.author.row.after",
  "post.author.meta.before",
  "post.author.meta.after",
  "post.author.verification.before",
  "post.author.verification.after",
  "post.author.name.before",
  "post.author.name.after",
  "post.author.badges.before",
  "post.author.badges.after",
  "post.body.before",
  "post.body.after",
  "post.sidebar.top",
  "post.sidebar.bottom",
  "comment.item.after",
  "settings.page.before",
  "settings.page.after",
  "settings.sidebar.top",
  "settings.sidebar.bottom",
  "settings.content.before",
  "settings.content.after",
  "settings.profile.before",
  "settings.profile.after",
  "settings.invite.before",
  "settings.invite.after",
  "settings.post-management.before",
  "settings.post-management.after",
  "settings.board-applications.before",
  "settings.board-applications.after",
  "settings.level.before",
  "settings.level.after",
  "settings.badges.before",
  "settings.badges.after",
  "settings.verifications.before",
  "settings.verifications.after",
  "settings.points.before",
  "settings.points.after",
  "settings.follows.before",
  "settings.follows.after",
  "topup.page.before",
  "topup.page.after",
  "topup.payment.before",
  "topup.payment.after",
  "topup.redeem.before",
  "topup.redeem.after",
  "vip.page.before",
  "vip.page.after",
  "vip.hero.before",
  "vip.hero.after",
  "vip.actions.before",
  "vip.actions.after",
  "vip.levels.before",
  "vip.levels.after",
  "help.page.before",
  "help.page.after",
  "help.sidebar.before",
  "help.sidebar.after",
  "help.document.before",
  "help.document.after",
  "about.page.before",
  "about.page.after",
  "about.hero.before",
  "about.hero.after",
  "about.highlights.before",
  "about.highlights.after",
  "about.principles.before",
  "about.principles.after",
  "about.sidebar.before",
  "about.sidebar.after",
  "write.page.before",
  "write.page.after",
  "write.header.before",
  "write.header.after",
  "post.create.form.before",
  "post.create.form.after",
  "post.create.tools.before",
  "post.create.tools.after",
  "post.create.editor.before",
  "post.create.editor.after",
  "post.create.enhancements.before",
  "post.create.enhancements.after",
  "post.create.submit.before",
  "post.create.submit.after",
  "faq.page.before",
  "faq.page.after",
  "faq.tabs.before",
  "faq.tabs.after",
  "faq.content.before",
  "faq.content.after",
  "notifications.page.before",
  "notifications.page.after",
  "notifications.toolbar.before",
  "notifications.toolbar.after",
  "notifications.list.before",
  "notifications.list.after",
  "messages.page.before",
  "messages.page.after",
  "messages.header.before",
  "messages.header.after",
  "messages.sidebar.before",
  "messages.sidebar.after",
  "messages.thread.before",
  "messages.thread.after",
  "search.page.before",
  "search.page.after",
  "search.hero.before",
  "search.hero.after",
  "search.results.before",
  "search.results.after",
  "tags.page.before",
  "tags.page.after",
  "tags.hero.before",
  "tags.hero.after",
  "tags.content.before",
  "tags.content.after",
  "tags.sidebar.before",
  "tags.sidebar.after",
  "tag.page.before",
  "tag.page.after",
  "tag.hero.before",
  "tag.hero.after",
  "tag.content.before",
  "tag.content.after",
  "tag.sidebar.before",
  "tag.sidebar.after",
  "user.page.before",
  "user.page.after",
  "user.sidebar.before",
  "user.sidebar.after",
  "user.profile.before",
  "user.profile.after",
  "user.activity.before",
  "user.activity.after",
  "feed.page.before",
  "feed.page.after",
  "feed.main.before",
  "feed.main.after",
  "feed.sidebar.before",
  "feed.sidebar.after",
  "feed.latest.before",
  "feed.latest.after",
  "feed.new.before",
  "feed.new.after",
  "feed.hot.before",
  "feed.hot.after",
  "feed.following.before",
  "feed.following.after",
  "feed.universe.before",
  "feed.universe.after",
  "board.page.before",
  "board.page.after",
  "board.hero.before",
  "board.hero.after",
  "board.content.before",
  "board.content.after",
  "board.sidebar.before",
  "board.sidebar.after",
  "collections.page.before",
  "collections.page.after",
  "collections.hero.before",
  "collections.hero.after",
  "collections.content.before",
  "collections.content.after",
  "collections.sidebar.before",
  "collections.sidebar.after",
  "collection.page.before",
  "collection.page.after",
  "collection.hero.before",
  "collection.hero.after",
  "collection.pending.before",
  "collection.pending.after",
  "collection.content.before",
  "collection.content.after",
  "collection.sidebar.before",
  "collection.sidebar.after",
  "announcements.page.before",
  "announcements.page.after",
  "announcements.hero.before",
  "announcements.hero.after",
  "announcements.content.before",
  "announcements.content.after",
  "announcement.page.before",
  "announcement.page.after",
  "announcement.hero.before",
  "announcement.hero.after",
  "announcement.content.before",
  "announcement.content.after",
  "history.page.before",
  "history.page.after",
  "history.panel.before",
  "history.panel.after",
  "friend-links.page.before",
  "friend-links.page.after",
  "friend-links.hero.before",
  "friend-links.hero.after",
  "friend-links.content.before",
  "friend-links.content.after",
  "funs.page.before",
  "funs.page.after",
  "funs.content.before",
  "funs.content.after",
  "funs.sidebar.before",
  "funs.sidebar.after",
  "funs.app.page.before",
  "funs.app.page.after",
  "funs.app.content.before",
  "funs.app.content.after",
  "badge.page.before",
  "badge.page.after",
  "badge.hero.before",
  "badge.hero.after",
  "badge.sidebar.before",
  "badge.sidebar.after",
  "verification.page.before",
  "verification.page.after",
  "verification.hero.before",
  "verification.hero.after",
  "verification.application.before",
  "verification.application.after",
  "verification.sidebar.before",
  "verification.sidebar.after",
  "terms.page.before",
  "terms.page.after",
  "terms.hero.before",
  "terms.hero.after",
  "terms.content.before",
  "terms.content.after",
  "terms.sidebar.before",
  "terms.sidebar.after",
  "prison.page.before",
  "prison.page.after",
  "prison.hero.before",
  "prison.hero.after",
  "prison.content.before",
  "prison.content.after",
  "prison.sidebar.before",
  "prison.sidebar.after",
  "auth.forgot-password.page.before",
  "auth.forgot-password.page.after",
  "auth.forgot-password.panel.before",
  "auth.forgot-password.panel.after",
  "auth.login.page.before",
  "auth.login.page.after",
  "auth.login.panel.before",
  "auth.login.panel.after",
  "auth.login.form.before",
  "auth.register.page.before",
  "auth.register.page.after",
  "auth.register.panel.before",
  "auth.register.panel.after",
  "auth.register.form.before",
  "auth.passkey.page.before",
  "auth.passkey.page.after",
  "auth.passkey.panel.before",
  "auth.passkey.panel.after",
  "auth.complete.page.before",
  "auth.complete.page.after",
  "auth.complete.panel.before",
  "auth.complete.panel.after",
  "topup.result.page.before",
  "topup.result.page.after",
  "topup.result.panel.before",
  "topup.result.panel.after",
  "tasks.page.before",
  "tasks.page.after",
  "tasks.header.before",
  "tasks.header.after",
  "tasks.content.before",
  "tasks.content.after",
  "leaderboard.page.before",
  "leaderboard.page.after",
  "leaderboard.hero.before",
  "leaderboard.hero.after",
  "leaderboard.content.before",
  "leaderboard.content.after",
  "leaderboard.sidebar.before",
  "leaderboard.sidebar.after",
  "custom-page.page.before",
  "custom-page.page.after",
  "custom-page.content.before",
  "custom-page.content.after",
  "custom-page.sidebar.before",
  "custom-page.sidebar.after",
  "zone.page.before",
  "zone.page.after",
  "zone.hero.before",
  "zone.hero.after",
  "zone.content.before",
  "zone.content.after",
  "zone.sidebar.before",
  "zone.sidebar.after",
] as const

export type AddonSlotKey = (typeof ADDON_SLOT_KEYS)[number]
export type AddonSurfaceKey = string
export type AddonSlotProps = Record<string, unknown>
export type AddonSurfaceProps = Record<string, unknown>
export type AddonHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD"
export type AddonPageScope = "public" | "admin"
export type AddonApiScope = "public" | "admin"
export type AddonMaybePromise<T> = T | Promise<T>
export const ADDON_ACTION_HOOK_NAMES = [
  "auth.login.before",
  "auth.login.after",
  "auth.register.before",
  "auth.register.after",
  "auth.identity.bind.before",
  "auth.identity.bind.after",
  "auth.identity.unbind.before",
  "auth.identity.unbind.after",
  "oauth.client.application.changed",
  "auth.password.change.before",
  "auth.password.change.after",
  "auth.password.reset.before",
  "auth.password.reset.after",
  "post.create.before",
  "post.create.after",
  "comment.create.before",
  "comment.create.after",
  "message.send.before",
  "message.send.after",
  "report.create.before",
  "report.create.after",
  "task.complete.after",
  "check-in.submit.before",
  "check-in.submit.after",
  "payment.application.changed",
  "payment.transaction.created",
  "payment.transaction.completed",
  "payment.paid.before",
  "payment.paid.after",
  "invite-code.purchase.before",
  "invite-code.purchase.after",
  "redeem-code.redeem.before",
  "redeem-code.redeem.after",
  "user.update.before",
  "user.update.after",
  "user.notification-settings.update.before",
  "user.notification-settings.update.after",
  "sms.verification-code.send.before",
  "sms.verification-code.send.after",
  "sms.verification-code.verify.before",
  "sms.verification-code.verify.after",
  "addon.config.changed.before",
  "addon.config.changed.after",
  // ─── 以下为 v2 扩展 hook（类型映射见 AddonActionHookPayloadMap） ───
  // 认证
  "auth.logout.before",
  "auth.logout.after",
  // 帖子
  "post.update.before",
  "post.update.after",
  "post.delete.before",
  "post.delete.after",
  "post.status.changed.after",
  "post.like.before",
  "post.like.after",
  "post.favorite.toggle.before",
  "post.favorite.toggle.after",
  // 评论
  "comment.update.before",
  "comment.update.after",
  "comment.delete.before",
  "comment.delete.after",
  "comment.like.before",
  "comment.like.after",
  // 用户关系
  "user.follow.toggle.before",
  "user.follow.toggle.after",
  // 通知
  "notification.create.before",
  "notification.create.after",
  // 积分
  "points.change.after",
  // 上传
"upload.file.before",
  "upload.file.after",
  // 附件下载（activity_download 等插件监听这里发放/校验活跃度）
  "postAttachment.download.before",
  "postAttachment.download.success",
  // addon 生命周期
  "addon.installed.before",
  "addon.installed.after",
  "addon.uninstalled.before",
  "addon.uninstalled.after",
  "addon.enabled.before",
  "addon.enabled.after",
  "addon.disabled.before",
  "addon.disabled.after",
  "addon.api.request.before",
  "addon.api.request.after",
  // 搜索
  "search.query.after",
] as const

export const ADDON_WATERFALL_HOOK_NAMES = [
  "post.slug.value",
  // ─── v2 扩展 ───
  "post.title.value",
  "post.content.value",
  "comment.content.value",
  "message.body.value",
  "report.reasonDetail.value",
  "user.profile.nickname.value",
  "user.profile.bio.value",
  "user.profile.introduction.value",
  "user.displayName.value",
  "user.avatar.url.value",
  "user.publicUid.value",
  "user.levelBadge.value",
  "user.verificationBadge.value",
  "user.displayedBadges.items",
  "user.roleBadge.value",
  "user.identityTags.items",
  "search.query.normalize",
  "seo.meta.title",
  "seo.meta.description",
  "breadcrumb.items",
] as const

export const ADDON_ASYNC_WATERFALL_HOOK_NAMES = [
  "navigation.primary.items",
  "home.sidebar.hot-topics.items",
  "settings.post-management.tabs",
  // ─── v2 扩展 ───
  "feed.posts.items",
  "post-list.display.items",
  "search.results.rerank",
  "notification.dispatch.targets",
  "sitemap.entries",
  "post.related.items",
  "post.content.render",
  "points.settlement.resolve",
  "post.tip.summary",
  "user.profile.introduction.permission",
] as const

export type AddonActionHookName = (typeof ADDON_ACTION_HOOK_NAMES)[number]
export type AddonWaterfallHookName = (typeof ADDON_WATERFALL_HOOK_NAMES)[number]
export type AddonAsyncWaterfallHookName = (typeof ADDON_ASYNC_WATERFALL_HOOK_NAMES)[number]
export type AddonHookKind = "action" | "waterfall" | "asyncWaterfall"
export type AddonHookName =
  | AddonActionHookName
  | AddonWaterfallHookName
  | AddonAsyncWaterfallHookName

export interface AddonManifest {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  homepage?: string
  enabled?: boolean
  engines?: {
    core?: string
  }
  entry?: {
    server?: string
  }
  permissions?: string[]
  provides?: {
    slots?: string[]
    surfaces?: string[]
    pages?: string[]
    adminPages?: string[]
    publicApis?: string[]
    adminApis?: string[]
    backgroundJobs?: string[]
    providers?: string[]
    hooks?: string[]
  }
  dependencies?: {
    addons?: string[]
    conflicts?: string[]
  }
  install?: {
    requiresRestart?: boolean
  }
}

export interface AddonStateRecord {
  enabled?: boolean
  installedAt?: string | null
  disabledAt?: string | null
  uninstalledAt?: string | null
  lastErrorAt?: string | null
  lastErrorMessage?: string | null
}

export interface AddonStyleDescriptor {
  href: string
  media?: string
}

export interface AddonScriptDescriptor {
  src: string
  async?: boolean
  defer?: boolean
  type?: "module" | "text/javascript"
  strategy?: "beforeInteractive" | "afterInteractive" | "lazyOnload"
}

export interface AddonRenderResult {
  html?: string
  text?: string
  clientModule?: string
  clientProps?: Record<string, unknown>
  containerTag?: "div" | "section" | "aside"
  containerClassName?: string
  stylesheets?: Array<string | AddonStyleDescriptor>
  scripts?: Array<string | AddonScriptDescriptor>
  inlineScripts?: string[]
}

export interface AddonRedirectResult {
  redirectTo: string
}

export type AddonPageRenderResult =
  | AddonRenderResult
  | AddonRedirectResult

export type AddonApiResult =
  | Response
  | {
      status?: number
      headers?: Record<string, string>
      json?: unknown
      text?: string
      html?: string
    }

export interface AddonRuntimeDescriptor {
  manifest: AddonManifest
  state: AddonStateRecord
  enabled: boolean
  rootDir: string
  assetRootDir: string
  assetBaseUrl: string
  publicBaseUrl: string
  adminBaseUrl: string
  publicApiBaseUrl: string
  adminApiBaseUrl: string
}

export interface AddonDataIndexDefinition {
  name?: string
  fields: string[]
}

export interface AddonDataCollectionDefinition {
  name: string
  indexes?: AddonDataIndexDefinition[]
  ttlDays?: number | null
}

export interface AddonDataRecord<TValue = Record<string, unknown>> {
  id: string
  value: TValue
  createdAt: string
  updatedAt: string
  expiresAt: string | null
}

export interface AddonDataQuerySort {
  field: string
  direction?: "asc" | "desc"
}

export interface AddonDataQueryOptions {
  where?: Record<string, unknown>
  sort?: AddonDataQuerySort[]
  limit?: number
  offset?: number
  cursor?: string | null
  includeTotal?: boolean
}

export interface AddonDataQueryResult<TValue = Record<string, unknown>> {
  items: AddonDataRecord<TValue>[]
  nextCursor: string | null
  total: number | null
}

export interface AddonDataStoreApi {
  ensureCollection: (
    definition: AddonDataCollectionDefinition,
  ) => Promise<AddonDataCollectionDefinition>
  get: <TValue = Record<string, unknown>>(
    collectionName: string,
    recordId: string,
  ) => Promise<AddonDataRecord<TValue> | null>
  put: <TValue = Record<string, unknown>>(
    collectionName: string,
    input: {
      id?: string
      value: TValue
      expiresAt?: string | Date | null
    },
  ) => Promise<AddonDataRecord<TValue>>
  delete: (collectionName: string, recordId: string) => Promise<boolean>
  query: <TValue = Record<string, unknown>>(
    collectionName: string,
    options?: AddonDataQueryOptions,
  ) => Promise<AddonDataQueryResult<TValue>>
  cleanup: (
    collectionName?: string,
  ) => Promise<{ deletedCount: number; scannedCount: number }>
  clear: (
    collectionName?: string,
  ) => Promise<{ clearedCollections: number; clearedRecords: number }>
  getSchemaVersion: () => Promise<number>
}

export interface AddonBackgroundJobEnqueueOptions {
  delayMs?: number
  maxAttempts?: number
}

export interface AddonBackgroundJobHandle<TPayload = unknown> {
  id: string
  key: string
  payload: TPayload
  enqueuedAt: string
  attempt: number
  maxAttempts: number
  availableAt: string | null
}

export type AddonBackgroundJobDeleteLocation =
  | "memory-queue"
  | "stream"
  | "delayed"
  | "dead-letter"

export interface AddonBackgroundJobDeleteResult {
  id: string
  removed: boolean
  removedFrom: AddonBackgroundJobDeleteLocation[]
}

export interface AddonBackgroundJobApi {
  enqueue: <TPayload = unknown>(
    jobKey: string,
    payload: TPayload,
    options?: AddonBackgroundJobEnqueueOptions,
  ) => Promise<AddonBackgroundJobHandle<TPayload>>
  remove: (jobId: string) => Promise<AddonBackgroundJobDeleteResult>
}

export interface AddonScheduledJobState {
  token: string
  jobId: string
  nextRunAt: string | null
}

export interface AddonScheduleStatus {
  state: "scheduled" | "missing" | "stale" | "disabled" | "incomplete"
  message: string
  token: string
  jobId: string
  nextRunAt: string | null
}

export interface AddonScheduleEnsureOptions<TPayload = Record<string, unknown>> {
  enabled: boolean
  configured: boolean
  jobKey: string
  delayMs: number
  token?: string
  refreshToken?: boolean
  payload?: TPayload
}

export interface AddonSchedulerApi {
  inspect: (input: {
    enabled: boolean
    configured: boolean
    state: AddonScheduledJobState | null | undefined
  }) => AddonScheduleStatus
  ensure: <TPayload = Record<string, unknown>>(
    currentState: AddonScheduledJobState | null | undefined,
    options: AddonScheduleEnsureOptions<TPayload>,
  ) => Promise<{
    scheduled: boolean
    state: AddonScheduledJobState
  }>
  cancel: (
    currentState: AddonScheduledJobState | null | undefined,
    options?: { nextToken?: string },
  ) => Promise<AddonScheduledJobState>
}

export type AddonPostStatusMode = "AUTO" | "PUBLISHED" | "PENDING"
export type AddonPostType = "NORMAL" | "BOUNTY" | "POLL" | "LOTTERY" | "AUCTION"
export type AddonReadablePostStatus = "NORMAL" | "PENDING" | "LOCKED" | "OFFLINE"
export type AddonReadableCommentStatus = "NORMAL" | "HIDDEN" | "PENDING"
export type AddonSortDirection = "asc" | "desc"

export interface AddonPostCreateInput {
  authorId?: number
  authorUsername?: string
  status?: AddonPostStatusMode
  title: string
  content: string
  boardSlug: string
  postType?: AddonPostType
  isAnonymous?: boolean
  coverPath?: string | null
  bountyPoints?: number | null
  auctionConfig?: Record<string, unknown> | null
  pollOptions?: string[]
  pollExpiresAt?: string | null
  commentsVisibleToAuthorOnly?: boolean
  loginUnlockContent?: string
  replyUnlockContent?: string
  replyThreshold?: number | null
  purchaseUnlockContent?: string
  purchasePrice?: number | null
  minViewLevel?: number | null
  minViewVipLevel?: number | null
  lotteryConfig?: Record<string, unknown> | null
  redPacketConfig?: Record<string, unknown> | null
  manualTags?: string[]
  attachments?: Array<Record<string, unknown>>
}

export interface AddonPostCreateResult {
  id: string
  slug: string
  status: string
  boardId: string
  authorId: number
  shouldPending: boolean
  contentAdjusted: boolean
}

export interface AddonUserSummary {
  id: number
  username: string
  nickname: string | null
  displayName: string
  avatarPath: string | null
  status: "ACTIVE" | "MUTED" | "BANNED" | "INACTIVE"
  vipLevel: number
}

export interface AddonPublicUserLevelBadge {
  level: number
  name: string
  color: string
  icon: string
}

export interface AddonPublicUserVerificationBadge {
  id: string
  slug?: string | null
  name: string
  color: string
  iconText?: string | null
  customIconText?: string | null
  description?: string | null
  customDescription?: string | null
}

export interface AddonPublicUserDisplayedBadge {
  id: string
  code?: string | null
  name: string
  description?: string | null
  color: string
  iconText?: string | null
  displayOrder?: number | null
}

export type AddonPublicUserIdentityTagTone =
  | "plain"
  | "vip"
  | "level"
  | "orange"
  | "sky"
  | "danger"
  | "warning"

export interface AddonPublicUserIdentityTag {
  key: string
  label: string
  tone?: AddonPublicUserIdentityTagTone
  tooltip?: string | null
  order?: number | null
}

export interface AddonPublicUserRoleBadge {
  key: string
  label: string
  shortLabel?: string | null
  tone?: AddonPublicUserIdentityTagTone
  tooltip?: string | null
}

export interface AddonPublicUserPresentationPayload {
  userId?: number
  username?: string
  role?: string
  status?: string
  level?: number
  vipLevel?: number | null
  badges?: string[]
}

export type AddonUserProfileVisibility = "PUBLIC" | "MEMBERS" | "PRIVATE"

export interface AddonUserProfileRecord {
  id: number
  username: string
  nickname: string | null
  bio: string | null
  introduction: string
  gender: string | null
  avatarPath: string | null
  email: string | null
  emailVerifiedAt: string | null
  phone: string | null
  phoneVerifiedAt: string | null
  activityVisibility: AddonUserProfileVisibility
  introductionVisibility: AddonUserProfileVisibility
  points: number
}

export interface AddonUserProfileIntroductionPermissionValue {
  allowed: boolean
  reason?: string | null
}

export type AddonUserProfileIntroductionPermissionAction = "edit" | "view"

export interface AddonUserProfileIntroductionPermissionUser {
  id: number
  username: string
  role: string
  status: string
  level: number
  vipLevel: number
  vipExpiresAt?: string | null
  isVip: boolean
  verificationTypeIds: string[]
  badgeIds: string[]
}

export type AddonTaskCategory = "NEWBIE" | "DAILY" | "CHALLENGE"
export type AddonTaskCycleType = "PERMANENT" | "DAILY" | "WEEKLY"
export type AddonTaskConditionType =
  | "CHECK_IN_COUNT"
  | "APPROVED_POST_COUNT"
  | "APPROVED_COMMENT_COUNT"
  | "GIVEN_LIKE_COUNT"
  | "RECEIVED_LIKE_COUNT"
  | "APPROVED_COMMENT_DISTINCT_POST_COUNT"
  | "FAVORITE_POST_COUNT"
  | "FOLLOW_BOARD_COUNT"
  | "FOLLOW_USER_COUNT"
  | "FOLLOW_TAG_COUNT"
  | "FOLLOW_POST_COUNT"
export type AddonTaskDefinitionStatus = "ACTIVE" | "PAUSED" | "ARCHIVED"
export type AddonTaskRewardTier = "NORMAL" | "VIP1" | "VIP2" | "VIP3"
export type AddonUserTaskProgressStatus = "IN_PROGRESS" | "COMPLETED"
export type AddonTaskTriggerType =
  | "CHECK_IN"
  | "APPROVED_POST"
  | "APPROVED_COMMENT"
  | "GIVEN_LIKE"
  | "RECEIVED_LIKE"
  | "FAVORITE_POST"
  | "FOLLOW_BOARD"
  | "FOLLOW_USER"
  | "FOLLOW_TAG"
  | "FOLLOW_POST"

export interface AddonTaskDefinitionRecord {
  id: string
  code: string
  title: string
  description: string | null
  category: AddonTaskCategory
  cycleType: AddonTaskCycleType
  conditionType: AddonTaskConditionType
  conditionConfig: unknown
  targetCount: number
  rewardNormalMin: number
  rewardNormalMax: number
  rewardVip1Min: number
  rewardVip1Max: number
  rewardVip2Min: number
  rewardVip2Max: number
  rewardVip3Min: number
  rewardVip3Max: number
  status: AddonTaskDefinitionStatus
  sortOrder: number
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AddonUserTaskProgressRecord {
  id: string
  userId: number
  taskId: string
  cycleKey: string
  categorySnapshot: AddonTaskCategory
  cycleTypeSnapshot: AddonTaskCycleType
  conditionTypeSnapshot: AddonTaskConditionType
  targetCountSnapshot: number
  rewardTierSnapshot: AddonTaskRewardTier
  rewardMinSnapshot: number
  rewardMaxSnapshot: number
  progressCount: number
  settledRewardPoints: number | null
  status: AddonUserTaskProgressStatus
  completedAt: string | null
  settledAt: string | null
  metadataJson: unknown
  createdAt: string
  updatedAt: string
}

export interface AddonZoneSummary {
  id: string | null
  slug: string | null
  name: string | null
}

export interface AddonBoardSummary {
  id: string
  slug: string
  name: string
  iconPath: string | null
  zone: AddonZoneSummary | null
}

export interface AddonPostRecord {
  id: string
  slug: string
  title: string
  summary: string | null
  content: string
  coverPath: string | null
  type: AddonPostType
  status: AddonReadablePostStatus
  reviewNote: string | null
  isAnonymous: boolean
  isPinned: boolean
  pinScope: string | null
  isFeatured: boolean
  commentsVisibleToAuthorOnly: boolean
  minViewLevel: number
  minViewVipLevel: number
  commentCount: number
  viewCount: number
  likeCount: number
  favoriteCount: number
  tipCount: number
  tipTotalPoints: number
  bountyPoints: number | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  lastCommentedAt: string | null
  activityAt: string
  board: AddonBoardSummary
  author: AddonUserSummary
}

export interface AddonPostQuerySort {
  field:
    | "createdAt"
    | "updatedAt"
    | "publishedAt"
    | "lastCommentedAt"
    | "activityAt"
    | "commentCount"
    | "viewCount"
    | "likeCount"
    | "favoriteCount"
    | "tipCount"
    | "tipTotalPoints"
  direction?: AddonSortDirection
}

export interface AddonPostQueryOptions {
  ids?: string[]
  excludeIds?: string[]
  boardIds?: string[]
  boardSlugs?: string[]
  zoneIds?: string[]
  zoneSlugs?: string[]
  authorIds?: number[]
  authorUsernames?: string[]
  statuses?: AddonReadablePostStatus[]
  createdAfter?: string | null
  createdBefore?: string | null
  publishedAfter?: string | null
  publishedBefore?: string | null
  lastCommentedAfter?: string | null
  lastCommentedBefore?: string | null
  activityAfter?: string | null
  activityBefore?: string | null
  minCommentCount?: number
  maxCommentCount?: number
  minViewCount?: number
  maxViewCount?: number
  minLikeCount?: number
  maxLikeCount?: number
  minFavoriteCount?: number
  maxFavoriteCount?: number
  includePinned?: boolean
  includeFeatured?: boolean
  limit?: number
  offset?: number
  includeTotal?: boolean
  sort?: AddonPostQuerySort[]
}

export interface AddonPostQueryResult {
  items: AddonPostRecord[]
  total: number | null
  limit: number
  offset: number
}

export interface AddonPostLikeInput {
  actorId?: number
  actorUsername?: string
  postId: string
}

export interface AddonPostLikeResult {
  postId: string
  liked: true
  changed: boolean
  targetUserId: number | null
}

export interface AddonPostTipInput {
  senderId?: number
  senderUsername?: string
  postId: string
  amount: number
  giftId?: string | null
}

export interface AddonPostTipResult {
  postId: string
  amount: number
  pointName: string
  recipientUserId: number
  gift: {
    id: string
    name: string
    price: number
  } | null
}

export interface AddonPostsApi {
  create: (input: AddonPostCreateInput) => Promise<AddonPostCreateResult>
  query: (options?: AddonPostQueryOptions) => Promise<AddonPostQueryResult>
  like: (input: AddonPostLikeInput) => Promise<AddonPostLikeResult>
  tip: (input: AddonPostTipInput) => Promise<AddonPostTipResult>
}

export interface AddonCommentCreateInput {
  authorId?: number
  authorUsername?: string
  postId: string
  content: string
  parentId?: string
  replyToUserName?: string
  replyToCommentId?: string
  useAnonymousIdentity?: boolean
  commentView?: "tree" | "flat"
}

export interface AddonCommentCreateResult {
  id: string
  postId: string
  status: AddonReadableCommentStatus
  parentId: string | null
  replyToCommentId: string | null
  replyToUserId: number | null
  reviewRequired: boolean
  contentAdjusted: boolean
  targetPage: number
  commentView: "tree" | "flat"
}

export interface AddonCommentRecord {
  id: string
  postId: string
  parentId: string | null
  replyToUserId: number | null
  replyToCommentId: string | null
  useAnonymousIdentity: boolean
  content: string
  status: AddonReadableCommentStatus
  reviewNote: string | null
  likeCount: number
  createdAt: string
  updatedAt: string
  author: AddonUserSummary
}

export interface AddonCommentQuerySort {
  field: "createdAt" | "updatedAt" | "likeCount"
  direction?: AddonSortDirection
}

export interface AddonCommentQueryOptions {
  ids?: string[]
  postId?: string
  postIds?: string[]
  authorIds?: number[]
  authorUsernames?: string[]
  statuses?: AddonReadableCommentStatus[]
  parentId?: string | null
  createdAfter?: string | null
  createdBefore?: string | null
  updatedAfter?: string | null
  updatedBefore?: string | null
  minLikeCount?: number
  maxLikeCount?: number
  limit?: number
  offset?: number
  includeTotal?: boolean
  sort?: AddonCommentQuerySort[]
}

export interface AddonCommentQueryResult {
  items: AddonCommentRecord[]
  total: number | null
  limit: number
  offset: number
}

export interface AddonCommentLikeInput {
  actorId?: number
  actorUsername?: string
  commentId: string
}

export interface AddonCommentLikeResult {
  commentId: string
  liked: true
  changed: boolean
  targetUserId: number | null
}

export interface AddonCommentsApi {
  create: (input: AddonCommentCreateInput) => Promise<AddonCommentCreateResult>
  query: (options?: AddonCommentQueryOptions) => Promise<AddonCommentQueryResult>
  like: (input: AddonCommentLikeInput) => Promise<AddonCommentLikeResult>
}

export interface AddonMessageSendInput {
  senderId?: number
  senderUsername?: string
  recipientId?: number
  recipientUsername?: string
  body: string
}

export interface AddonMessageSendResult {
  id: string
  conversationId: string
  content: string
  createdAt: string
  occurredAt: string
  contentAdjusted: boolean
}

export interface AddonMessagesApi {
  send: (input: AddonMessageSendInput) => Promise<AddonMessageSendResult>
}

export type AddonReportTargetType = "POST" | "COMMENT" | "USER"
export type AddonReportStatus = "PENDING" | "PROCESSING" | "RESOLVED" | "REJECTED"

export interface AddonReportRecord {
  id: string
  reporterId: number
  targetType: AddonReportTargetType
  targetId: string
  reasonType: string
  reasonDetail: string | null
  status: AddonReportStatus
  handledBy: number | null
  handledNote: string | null
  handledAt: string | null
  createdAt: string
}

export type AddonNotificationRelatedType =
  | "POST"
  | "COMMENT"
  | "USER"
  | "REPORT"
  | "ANNOUNCEMENT"
  | "YINYANG_CHALLENGE"

export type AddonNotificationType =
  | "REPLY_POST"
  | "REPLY_COMMENT"
  | "LIKE"
  | "MENTION"
  | "FOLLOWED_YOU"
  | "FOLLOWING_ACTIVITY"
  | "SYSTEM"
  | "REPORT_RESULT"

export interface AddonNotificationCreateInput {
  recipientId?: number
  recipientUsername?: string
  relatedId: string
  title: string
  content: string
  relatedType?: AddonNotificationRelatedType
  senderId?: number | null
  url?: string
}

export interface AddonNotificationRecord {
  id: string
  userId: number
  type: AddonNotificationType
  senderId: number | null
  relatedType: AddonNotificationRelatedType
  relatedId: string
  url: string | null
  title: string
  content: string
  createdAt: string
}

export interface AddonNotificationsApi {
  create: (input: AddonNotificationCreateInput) => Promise<AddonNotificationRecord>
  createMany: (
    inputs: AddonNotificationCreateInput[],
  ) => Promise<AddonNotificationRecord[]>
}

export interface AddonEmailSendInput {
  recipientId?: number
  recipientUsername?: string
  subject: string
  text?: string
  html?: string
}

export interface AddonEmailSendResult {
  userId: number
  username: string
  sent: true
  queued?: true
  jobId?: string
  sentAt: string
}

export interface AddonEmailsApi {
  send: (input: AddonEmailSendInput) => Promise<AddonEmailSendResult>
}

export interface AddonSmsSendInput {
  recipientId?: number
  recipientUsername?: string
  phone?: string
  code?: string
  scene?: string
  templateCode?: string
  templateParam?: Record<string, unknown>
  signName?: string
  outId?: string
}

export interface AddonSmsSendResult {
  userId?: number | null
  username?: string | null
  phone: string
  provider: string
  sent: true
  queued?: true
  jobId?: string
  sentAt: string
  messageId?: string | null
  requestId?: string | null
}

export interface AddonSmsApi {
  send: (input: AddonSmsSendInput) => Promise<AddonSmsSendResult>
}

export interface AddonSmsProviderSendInput {
  phone: string
  code?: string
  scene?: string
  templateCode?: string
  templateParam?: Record<string, unknown>
  signName?: string
  outId?: string
}

export interface AddonSmsProviderSendResult {
  provider?: string
  sent?: boolean
  messageId?: string | null
  requestId?: string | null
}

export interface AddonSmsVerificationCodeSendInput {
  phone: string
  purpose: string
  requestIp?: string | null
  userAgent?: string | null
  userId?: number | null
}

export interface AddonSmsVerificationCodeSendResult {
  handled?: boolean
  sent?: boolean
  provider?: string
  expiresAt?: string | null
  message?: string | null
  messageId?: string | null
  requestId?: string | null
}

export interface AddonSmsVerificationCodeVerifyInput {
  phone: string
  code: string
  purpose: string
  requestIp?: string | null
  userAgent?: string | null
  userId?: number | null
}

export interface AddonSmsVerificationCodeVerifyResult {
  handled?: boolean
  ok?: boolean
  provider?: string
  message?: string | null
  verifiedAt?: string | null
}

export interface AddonSmsProviderRuntimeHooks {
  isRunnable?: (input: AddonSmsProviderSendInput) => AddonMaybePromise<boolean>
  send?: (input: AddonSmsProviderSendInput) => AddonMaybePromise<AddonSmsProviderSendResult | void>
  sendVerificationCode?: (
    input: AddonSmsVerificationCodeSendInput,
  ) => AddonMaybePromise<AddonSmsVerificationCodeSendResult | boolean | void>
  verifyVerificationCode?: (
    input: AddonSmsVerificationCodeVerifyInput,
  ) => AddonMaybePromise<AddonSmsVerificationCodeVerifyResult | boolean | string | void>
}

export interface AddonUserFollowInput {
  followerId?: number
  followerUsername?: string
  targetUserId?: number
  targetUsername?: string
}

export interface AddonUserFollowResult {
  targetType: "user"
  targetUserId: number
  followed: true
  changed: boolean
}

export interface AddonFollowsApi {
  followUser: (input: AddonUserFollowInput) => Promise<AddonUserFollowResult>
}

export interface AddonPointAdjustInput {
  targetUserId?: number
  targetUsername?: string
  delta: number
  reason: string
  scopeKey?: string
  relatedType?: AddonNotificationRelatedType
  relatedId?: string | null
  insufficientMessage?: string
}

export interface AddonPointAdjustResult {
  userId: number
  pointName: string
  finalDelta: number
  afterBalance: number
  scopeKey: string | null
  effectsApplied: boolean
}

export interface AddonPointsApi {
  adjust: (input: AddonPointAdjustInput) => Promise<AddonPointAdjustResult>
}

export interface AddonPointSettlementValue {
  handled: boolean
  userId: number
  beforeBalance: number
  afterBalance?: number | null
  baseDelta: number
  finalDelta: number
  scopeKey: string
  pointName: string
  reason: string
  eventType?: string | null
  eventData?: unknown
  relatedType?: string | null
  relatedId?: string | null
  insufficientMessage?: string | null
  currencyCode?: string
  currencyName?: string
  metadata?: Record<string, unknown>
}

export interface AddonTipSummaryValue {
  enabled: boolean
  isLoggedIn: boolean
  pointName: string
  currentUserPoints: number
  gifts: unknown[]
  giftStats: unknown[]
  recentGiftEvents: unknown[]
  allowedAmounts: number[]
  dailyLimit: number
  perPostLimit: number
  usedDailyCount: number
  usedPostCount: number
  tipCount: number
  tipTotalPoints: number
  topSupporters: unknown[]
}

export interface AddonBadgeSummary {
  id: string
  code: string
  name: string
  description: string | null
  iconPath: string | null
  iconText: string | null
  color: string
  imageUrl: string | null
  category: string | null
  pointsCost: number
  status: boolean
  isHidden: boolean
  grantedUserCount: number
}

export interface AddonBadgeListOptions {
  includeHidden?: boolean
  includeDisabled?: boolean
}

export interface AddonBadgeLookupInput {
  userId?: number
  username?: string
}

export interface AddonBadgeGrantInput extends AddonBadgeLookupInput {
  badgeId: string
  grantReason?: string
  allowDuplicate?: boolean
}

export interface AddonBadgeGrantResult {
  badgeId: string
  userId: number
  granted: boolean
  alreadyGranted: boolean
  badge: AddonBadgeSummary
}

export interface AddonBadgesApi {
  list: (options?: AddonBadgeListOptions) => Promise<AddonBadgeSummary[]>
  getGrantedIds: (input: AddonBadgeLookupInput) => Promise<string[]>
  grant: (input: AddonBadgeGrantInput) => Promise<AddonBadgeGrantResult>
}

export type AddonFileContent = ArrayBuffer | ArrayBufferView | Blob

export interface AddonFileSaveInput {
  fileName: string
  content?: AddonFileContent
  buffer?: AddonFileContent
  base64?: string
  dataUrl?: string
  mimeType?: string
  folder?: string
  bucketType?: string
  userId?: number | null
  username?: string | null
  dedupe?: boolean
}

export interface AddonFileSaveResult {
  uploadId: string | null
  fileName: string
  storagePath: string
  urlPath: string
  fileExt: string
  fileSize: number
  mimeType: string
  fileHash: string
}

export interface AddonFilesApi {
  save: (input: AddonFileSaveInput) => Promise<AddonFileSaveResult>
}

export interface AddonBoardSelectItem {
  value: string
  label: string
}

export interface AddonBoardSelectGroup {
  zone: string
  items: AddonBoardSelectItem[]
}

export interface AddonDatabaseApi {
  prisma: PrismaClient
  queryRaw: <TRow = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ) => Promise<TRow[]>
  executeRaw: (sql: string, values?: unknown[]) => Promise<number>
  transaction: <TResult>(
    task: (database: AddonDatabaseApi) => Promise<TResult>,
  ) => Promise<TResult>
}

export type AddonLifecycleDatabaseApi = AddonDatabaseApi

export interface AddonExecutionContextBase extends AddonRuntimeDescriptor {
  request?: Request
  pathname?: string
  searchParams?: URLSearchParams
  permissions: string[]
  hasPermission: (permission: string) => boolean
  assertPermission: (permission: string, message?: string) => void
  getCurrentUser: () => Promise<SessionActor | null>
  getSiteSettings: () => Promise<SiteSettingsData>
  getBoardSelectOptions: () => Promise<AddonBoardSelectGroup[]>
  asset: (path?: string) => string
  publicPage: (path?: string) => string
  adminPage: (path?: string) => string
  publicApi: (path?: string) => string
  adminApi: (path?: string) => string
  readAssetText: (path: string) => Promise<string>
  readAssetJson: <T = unknown>(path: string) => Promise<T>
  readConfig: <T = unknown>(configKey: string, fallback?: T) => Promise<T>
  writeConfig: <T = unknown>(configKey: string, value: T) => Promise<void>
  readSecret: <T = unknown>(secretKey: string, fallback?: T) => Promise<T>
  writeSecret: <T = unknown>(secretKey: string, value: T) => Promise<void>
  database: AddonDatabaseApi
  data: AddonDataStoreApi
  backgroundJobs: AddonBackgroundJobApi
  scheduler: AddonSchedulerApi
  posts: AddonPostsApi
  comments: AddonCommentsApi
  messages: AddonMessagesApi
  notifications: AddonNotificationsApi
  emails: AddonEmailsApi
  sms: AddonSmsApi
  follows: AddonFollowsApi
  points: AddonPointsApi
  badges: AddonBadgesApi
  files: AddonFilesApi
}

export type AddonLifecycleAction = "install" | "upgrade" | "uninstall"

export interface AddonLifecycleContextBase extends AddonExecutionContextBase {
  action: AddonLifecycleAction
  readFileText: (path: string) => Promise<string>
  readFileJson: <T = unknown>(path: string) => Promise<T>
  database: AddonLifecycleDatabaseApi
}

export interface AddonInstallLifecycleContext extends AddonLifecycleContextBase {
  action: "install"
}

export interface AddonUpgradeLifecycleContext extends AddonLifecycleContextBase {
  action: "upgrade"
  previousManifest: AddonManifest
  previousVersion: string
  nextVersion: string
  previousRootDir: string
}

export interface AddonUninstallLifecycleContext extends AddonLifecycleContextBase {
  action: "uninstall"
  currentVersion: string
}

export interface AddonLifecycleHooks {
  install?: (
    context: AddonInstallLifecycleContext,
  ) => AddonMaybePromise<void>
  upgrade?: (
    context: AddonUpgradeLifecycleContext,
  ) => AddonMaybePromise<void>
  uninstall?: (
    context: AddonUninstallLifecycleContext,
  ) => AddonMaybePromise<void>
}

export interface AddonSlotRenderContext<
  TProps extends AddonSlotProps = AddonSlotProps,
> extends AddonExecutionContextBase {
  slot: AddonSlotKey
  props: TProps
}

export interface AddonSurfaceRenderContext<
  TProps extends AddonSurfaceProps = AddonSurfaceProps,
> extends AddonExecutionContextBase {
  surface: AddonSurfaceKey
  props: TProps
}

export interface AddonPageRenderContext extends AddonExecutionContextBase {
  scope: AddonPageScope
  routePath: string
  routeSegments: string[]
}

export interface AddonApiHandlerContext extends AddonExecutionContextBase {
  scope: AddonApiScope
  routePath: string
  routeSegments: string[]
  method: AddonHttpMethod
}

/**
 * ───────────────────────────────────────────────────────────────────────────
 * Hook 类型映射表（v2 引入）
 *
 * 设计说明：
 * 1. 三张 Map 分别登记 Action / Waterfall / AsyncWaterfall 三类 hook 的
 *    payload / value 类型；当前以新增 hook 和已补齐契约的高频 hook 为主，
 *    其余历史 hook 仍可由查表 helper 回落为 `unknown`——这保证**现有插件代码
 *    100% 向后兼容**。
 * 2. 三张 Map 均为 `interface`，插件作者可通过
 *    [declaration merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
 *    在自己的 `*.d.ts` 中扩展未登记的 hook，以获得端到端类型安全。
 * 3. `AddonActionHookContext` / `AddonWaterfallHookContext` 与
 *    `AddonActionHookRegistration` / `AddonWaterfallHookRegistration` /
 *    `AddonAsyncWaterfallHookRegistration` 的**第二个泛型参数**改为"按 hook 名
 *    查表"：对已登记的 hook 精确推断 payload/value 类型，未登记则仍为 unknown。
 * ───────────────────────────────────────────────────────────────────────────
 */
export interface AddonActionHookPayloadMap {
  // ─── 认证 ───
  "oauth.client.application.changed": {
    action: "create" | "resubmit" | "admin-update" | "review" | "rotate-secret"
    applicationId: string
    clientId: string
    ownerId: number
    actorUserId?: number
    name: string
    homepageUrl: string | null
    redirectUris: string[]
    scopes: string[]
    status: string
    previousStatus?: string
    nextStatus: string
    reviewAction?: "approve" | "reject" | "disable"
    reviewedById?: number | null
    occurredAt: string
  }
  "auth.logout.before": {
    userId: string
    username: string
    sessionId?: string
  }
  "auth.logout.after": {
    userId: string
    username: string
    sessionId?: string
  }
  // ─── 帖子 ───
  "post.update.before": {
    postId: string
    editorId: string
    changes: Record<string, unknown>
  }
  "post.update.after": {
    postId: string
    editorId: string
    changes: Record<string, unknown>
    post?: AddonPostRecord
  }
  "post.delete.before": {
    postId: string
    editorId: string
    reason?: string
  }
  "post.delete.after": {
    postId: string
    editorId: string
    reason?: string
  }
  "post.status.changed.after": {
    postId: string
    editorId: string
    previousStatus: AddonReadablePostStatus
    nextStatus: AddonReadablePostStatus
  }
  "post.like.before": {
    postId: string
    userId: string
  }
  "post.like.after": {
    postId: string
    userId: string
    liked: boolean
    likeCount?: number
  }
  "post.favorite.toggle.before": {
    postId: string
    userId: string
  }
  "post.favorite.toggle.after": {
    postId: string
    userId: string
    favorited: boolean
  }
  // ─── 评论 ───
  "comment.update.before": {
    commentId: string
    editorId: string
    changes: Record<string, unknown>
  }
  "comment.update.after": {
    commentId: string
    editorId: string
    changes: Record<string, unknown>
    comment?: AddonCommentRecord
  }
  "comment.delete.before": {
    commentId: string
    editorId: string
    reason?: string
  }
  "comment.delete.after": {
    commentId: string
    editorId: string
    reason?: string
  }
  "comment.like.before": {
    commentId: string
    userId: string
  }
  "comment.like.after": {
    commentId: string
    userId: string
    liked: boolean
    likeCount?: number
  }
  // ─── 私信 ───
  "message.send.before": {
    senderId: number
    senderUsername: string
    recipientId: number
    conversationId?: string
    conversationKind: "DIRECT" | "SITE_CHAT"
    body: string
  }
  "message.send.after": {
    senderId: number
    senderUsername: string
    recipientId: number
    messageId: string
    conversationId: string
    conversationKind: "DIRECT" | "SITE_CHAT"
    body: string
    contentAdjusted: boolean
    occurredAt: string
  }
  // ─── 用户资料 ───
  "user.update.before": {
    userId: number
    username: string
    currentProfile: AddonUserProfileRecord
    nickname: string
    bio: string
    introduction: string
    gender: string
    avatarPath: string
    email: string | null
    phone?: string | null
    activityVisibility: AddonUserProfileVisibility
    introductionVisibility: AddonUserProfileVisibility
    nicknameChanged: boolean
    bioChanged: boolean
    introductionChanged: boolean
    avatarChanged: boolean
    emailChanged: boolean
    phoneChanged?: boolean
    contentAdjusted: boolean
  }
  "user.update.after": {
    userId: number
    username: string
    nicknameChanged: boolean
    bioChanged: boolean
    introductionChanged: boolean
    avatarChanged: boolean
    emailChanged: boolean
    phoneChanged?: boolean
    contentAdjusted: boolean
    profile: AddonUserProfileRecord
  }
  // ─── 短信验证码 ───
  "sms.verification-code.send.before": {
    phone: string
    purpose: string
    requestIp?: string | null
    userAgent?: string | null
    userId?: number | null
    handledByProvider?: string | null
  }
  "sms.verification-code.send.after": {
    phone: string
    purpose: string
    requestIp?: string | null
    userAgent?: string | null
    userId?: number | null
    provider: string
    handledByProvider: boolean
    expiresAt?: string | null
    sent: boolean
    messageId?: string | null
    requestId?: string | null
  }
  "sms.verification-code.verify.before": {
    phone: string
    purpose: string
    requestIp?: string | null
    userAgent?: string | null
    userId?: number | null
    handledByProvider?: string | null
  }
  "sms.verification-code.verify.after": {
    phone: string
    purpose: string
    requestIp?: string | null
    userAgent?: string | null
    userId?: number | null
    provider: string
    handledByProvider: boolean
    ok: boolean
    verifiedAt: string
  }
  // ─── 举报 ───
  "report.create.before": {
    reporterId: number
    targetType: AddonReportTargetType
    targetId: string
    reasonType: string
    reasonDetail: string | null
  }
  "report.create.after": {
    reporterId: number
    targetType: AddonReportTargetType
    targetId: string
    reasonType: string
    reasonDetail: string | null
    contentAdjusted: boolean
    report: AddonReportRecord
  }
  // ─── 任务中心 ───
  "task.complete.after": {
    userId: number
    triggerType: AddonTaskTriggerType
    eventKey: string
    pointName: string
    rewardPoints: number
    task: AddonTaskDefinitionRecord
    progress: AddonUserTaskProgressRecord
  }
  "check-in.submit.before": {
    userId: number
    username: string
    action: "check-in" | "make-up"
    date: string
    reward: number
    pointName: string
    makeUpCost?: number
  }
  "check-in.submit.after": {
    userId: number
    username: string
    action: "check-in" | "make-up"
    date: string
    reward: number
    finalReward: number
    points: number
    currentStreak: number
    maxStreak: number
    alreadyCheckedIn: boolean
    pointName: string
    makeUpCost?: number
  }
  // ─── OAuth / Payment 应用 ───
  "payment.application.changed": {
    action: "create" | "resubmit" | "admin-update" | "review" | "rotate-secret"
    applicationId: string
    paymentId: string
    ownerId: number
    actorUserId?: number
    name: string
    homepageUrl: string | null
    callbackUrl: string
    status: string
    previousStatus?: string
    nextStatus: string
    reviewAction?: "approve" | "reject" | "disable"
    reviewedById?: number | null
    occurredAt: string
  }
  "payment.transaction.created": {
    transactionId: string
    applicationId: string
    paymentId: string
    ownerId: number
    externalReference: string
    amount: number
    platformFee: number
    description: string
    status: string
    expiresAt: string
    occurredAt: string
  }
  "payment.transaction.completed": {
    transactionId: string
    applicationId: string
    paymentId: string
    ownerId: number
    payerUserId: number
    externalReference: string
    amount: number
    platformFee: number
    description?: string
    paidAt: string
    occurredAt: string
  }
  // ─── 用户关系 ───
  "user.follow.toggle.before": {
    followerId: string
    followeeId: string
    desiredFollowing?: boolean
  }
  "user.follow.toggle.after": {
    followerId: string
    followeeId: string
    following: boolean
  }
  // ─── 通知 ───
  "notification.create.before": {
    recipientId: string
    type: string
    payload: Record<string, unknown>
  }
  "notification.create.after": {
    notification?: AddonNotificationRecord
  }
  // ─── 积分 ───
  "points.change.after": {
    userId: string
    delta: number
    balance: number
    reason: string
  }
  // ─── 上传 ───
  // ─── 上传 ───
  "upload.file.before": {
    uploaderId: string
    filename: string
    mime: string
    size: number
  }
  "upload.file.after": {
    uploaderId: string
    fileId: string
    filename: string
    mime: string
    size: number
    url?: string
  }
  // ─── 附件下载 ───
  // before：下载前触发，抛出异常会阻断本次下载（例如 activity_download 插件校验活跃度余额不足时可以抛错）。
  "postAttachment.download.before": {
    attachmentId: string
    postId: string
    viewerId?: string | null
  }
  // success：仅当文件流被完整读到 EOF（即完整传输给客户端）才会触发，
  // 客户端中途取消下载/断网不会触发这个钩子。
  "postAttachment.download.success": {
    attachmentId: string
    postId: string
    viewerId?: string | null
    downloadCount?: number
  }
  // ─── addon 生命周期 ───
  "addon.installed.before": {
    addonId: string
    version: string
    installAction: "install" | "upgrade" | "overwrite"
    existingVersion?: string | null
    hasExisting: boolean
    replaceExisting: boolean
    enableAfterInstall: boolean
    originalName?: string | null
  }
  "addon.installed.after": {
    addonId: string
    version: string
  }
  "addon.uninstalled.before": {
    addonId: string
    version: string
  }
  "addon.uninstalled.after": {
    addonId: string
    version: string
  }
  "addon.enabled.before": {
    addonId: string
    version: string
  }
  "addon.enabled.after": {
    addonId: string
    version: string
  }
  "addon.disabled.before": {
    addonId: string
    version: string
  }
  "addon.disabled.after": {
    addonId: string
    version: string
  }
  "addon.api.request.before": {
    scope: AddonApiScope
    addonId: string
    routePath: string
    routeSegments: string[]
    method: AddonHttpMethod
    pathname: string
  }
  "addon.api.request.after": {
    scope: AddonApiScope
    addonId: string
    routePath: string
    routeSegments: string[]
    method: AddonHttpMethod
    pathname: string
    status: number
    matched: boolean
    errorMessage?: string
  }
  // ─── 搜索 ───
  "search.query.after": {
    userId?: string
    query: string
    scope: string
    resultCount: number
  }
}

export interface AddonWaterfallHookValueMap {
  "post.title.value": string
  "post.content.value": string
  "comment.content.value": string
  "message.body.value": string
  "report.reasonDetail.value": string
  "user.profile.nickname.value": string
  "user.profile.bio.value": string
  "user.profile.introduction.value": string
  "user.displayName.value": string
  "user.avatar.url.value": string
  "user.publicUid.value": string
  "user.levelBadge.value": AddonPublicUserLevelBadge | null
  "user.verificationBadge.value": AddonPublicUserVerificationBadge | null
  "user.displayedBadges.items": AddonPublicUserDisplayedBadge[]
  "user.roleBadge.value": AddonPublicUserRoleBadge | null
  "user.identityTags.items": AddonPublicUserIdentityTag[]
  "search.query.normalize": string
  "seo.meta.title": string
  "seo.meta.description": string
  "breadcrumb.items": Array<{
    label: string
    href?: string
  }>
}

export interface AddonWaterfallHookPayloadMap {
  "post.title.value": {
    mode: "create" | "update"
    postId?: string
    boardSlug: string
    postType: string
  }
  "post.content.value": {
    mode: "create" | "update" | "append"
    postId?: string
    boardSlug: string
    postType: string
  }
  "comment.content.value": {
    mode: "create" | "update"
    postId: string
    commentId?: string
  }
  "message.body.value": {
    recipientId?: number
    conversationId?: string
    conversationKind: "DIRECT" | "SITE_CHAT"
  }
  "report.reasonDetail.value": {
    reporterId: number
    targetType: AddonReportTargetType
    targetId: string
    reasonType: string
  }
  "user.profile.nickname.value": {
    userId: number
    username: string
    currentProfile: AddonUserProfileRecord
    nextGender: string
    nextAvatarPath: string
    nextEmail: string | null
    nextPhone?: string | null
    nextActivityVisibility: AddonUserProfileVisibility
    nextIntroductionVisibility: AddonUserProfileVisibility
  }
  "user.profile.bio.value": {
    userId: number
    username: string
    currentProfile: AddonUserProfileRecord
    nextGender: string
    nextAvatarPath: string
    nextEmail: string | null
    nextPhone?: string | null
    nextActivityVisibility: AddonUserProfileVisibility
    nextIntroductionVisibility: AddonUserProfileVisibility
  }
  "user.profile.introduction.value": {
    userId: number
    username: string
    currentProfile: AddonUserProfileRecord
    nextGender: string
    nextAvatarPath: string
    nextEmail: string | null
    nextPhone?: string | null
    nextActivityVisibility: AddonUserProfileVisibility
    nextIntroductionVisibility: AddonUserProfileVisibility
  }
  "user.displayName.value": AddonPublicUserPresentationPayload
  "user.avatar.url.value": AddonPublicUserPresentationPayload
  "user.publicUid.value": AddonPublicUserPresentationPayload & {
    userId: number
  }
  "user.levelBadge.value": AddonPublicUserPresentationPayload
  "user.verificationBadge.value": AddonPublicUserPresentationPayload
  "user.displayedBadges.items": AddonPublicUserPresentationPayload
  "user.roleBadge.value": AddonPublicUserPresentationPayload
  "user.identityTags.items": AddonPublicUserPresentationPayload
  "breadcrumb.items": {
    scope: "admin"
    currentKey: string
    adminRole: "ADMIN" | "MODERATOR"
  }
}

export interface AddonAsyncWaterfallHookValueMap {
  "feed.posts.items": AddonPostRecord[]
  "post-list.display.items": Array<{
    id: string
    slug?: string
    title?: string
    [key: string]: unknown
  }>
  "search.results.rerank": Array<{
    id: string
    score: number
    kind: "post" | "comment" | "user"
    [key: string]: unknown
  }>
  "notification.dispatch.targets": Array<{
    userId: string
    channel: "inapp" | "email" | "webhook" | string
  }>
  "sitemap.entries": Array<{
    loc: string
    lastmod?: string
    changefreq?: string
    priority?: number
  }>
  "post.related.items": AddonPostRecord[]
  "post.content.render": string
  "points.settlement.resolve": AddonPointSettlementValue
  "post.tip.summary": AddonTipSummaryValue
  "user.profile.introduction.permission": AddonUserProfileIntroductionPermissionValue
}

export interface AddonAsyncWaterfallHookPayloadMap {
  "feed.posts.items": {
    source: "feed" | "post-stream"
    sort: string
    displayMode?: string
    pathname?: string
  }
  "post-list.display.items": {
    source: "feed" | "post-stream"
    sort: string
    displayMode?: string
    pathname?: string
    itemIds: string[]
  }
  "search.results.rerank": {
    query: string
    scope: string
  }
  "notification.dispatch.targets": {
    draft: {
      userId: number
      type: string
      senderId: number | null
      relatedType: string
      relatedId: string
      url?: string | null
      title: string
      content: string
    }
  }
  "post.related.items": {
    postId: string
  }
  "points.settlement.resolve": {
    source: "applyPointDelta"
  }
  "post.tip.summary": {
    targetType: "post" | "comment"
    postId?: string
    commentId?: string
    currentUserId?: number
  }
  "user.profile.introduction.permission": {
    action: AddonUserProfileIntroductionPermissionAction
    owner: AddonUserProfileIntroductionPermissionUser
    viewer?: AddonUserProfileIntroductionPermissionUser | null
    isOwner: boolean
  }
}

/** 按 hook 名查 payload 类型；未登记则回落 unknown（向后兼容）。 */
export type LookupAddonActionHookPayload<H extends AddonActionHookName> =
  H extends keyof AddonActionHookPayloadMap ? AddonActionHookPayloadMap[H] : unknown

/** 按 hook 名查 waterfall value 类型；未登记则回落 unknown。 */
export type LookupAddonWaterfallHookValue<H extends AddonWaterfallHookName> =
  H extends keyof AddonWaterfallHookValueMap ? AddonWaterfallHookValueMap[H] : unknown

/** 按 hook 名查 waterfall payload 类型；未登记则回落 unknown。 */
export type LookupAddonWaterfallHookPayload<H extends AddonWaterfallHookName> =
  H extends keyof AddonWaterfallHookPayloadMap ? AddonWaterfallHookPayloadMap[H] : unknown

/** 按 hook 名查 asyncWaterfall value 类型；未登记则回落 unknown。 */
export type LookupAddonAsyncWaterfallHookValue<H extends AddonAsyncWaterfallHookName> =
  H extends keyof AddonAsyncWaterfallHookValueMap ? AddonAsyncWaterfallHookValueMap[H] : unknown

/** 按 hook 名查 asyncWaterfall payload 类型；未登记则回落 unknown。 */
export type LookupAddonAsyncWaterfallHookPayload<H extends AddonAsyncWaterfallHookName> =
  H extends keyof AddonAsyncWaterfallHookPayloadMap ? AddonAsyncWaterfallHookPayloadMap[H] : unknown

export interface AddonActionHookContext<
  THook extends AddonActionHookName = AddonActionHookName,
  TPayload = LookupAddonActionHookPayload<THook>,
> extends AddonExecutionContextBase {
  hook: THook
  payload: TPayload
}

export interface AddonWaterfallHookContext<
  THook extends AddonHookName = AddonHookName,
  TValue = unknown,
  TPayload = THook extends AddonWaterfallHookName
    ? LookupAddonWaterfallHookPayload<THook>
    : THook extends AddonAsyncWaterfallHookName
      ? LookupAddonAsyncWaterfallHookPayload<THook>
      : unknown,
> extends AddonExecutionContextBase {
  hook: THook
  value: TValue
  payload?: TPayload
}

export interface AddonSlotRegistration<
  TProps extends AddonSlotProps = AddonSlotProps,
> {
  key: string
  slot: AddonSlotKey
  order?: number
  title?: string
  render: (
    context: AddonSlotRenderContext<TProps>,
  ) => AddonMaybePromise<AddonRenderResult | null | undefined>
}

export interface AddonSurfaceRegistration<
  TProps extends AddonSurfaceProps = AddonSurfaceProps,
> {
  key: string
  surface: AddonSurfaceKey
  priority?: number
  title?: string
  description?: string
  clientModule?: string
  render?: (
    context: AddonSurfaceRenderContext<TProps>,
  ) => AddonMaybePromise<AddonRenderResult | null | undefined>
}

export interface AddonSurfaceOverrideDescriptor {
  addonId: string
  clientModuleUrl: string
  description?: string
  key: string
  priority: number
  surface: AddonSurfaceKey
  title?: string
}

export function pickPreferredAddonSurfaceOverride(
  items: AddonSurfaceOverrideDescriptor[],
  surface: AddonSurfaceKey,
) {
  return items.find((item) => item.surface === surface) ?? null
}

export interface AddonPageChromeOptions {
  header?: boolean
  footer?: boolean
  leftSidebar?: boolean
  rightSidebar?: boolean
  pageHeading?: boolean
  contentLayout?: "default" | "wide"
}

export interface AddonPageRegistration {
  key: string
  path?: string
  title?: string
  description?: string
  chrome?: AddonPageChromeOptions
  render: (context: AddonPageRenderContext) => AddonMaybePromise<AddonPageRenderResult | null | undefined>
}

export interface AddonApiRegistration {
  key: string
  path?: string
  methods?: AddonHttpMethod[]
  handle: (context: AddonApiHandlerContext) => AddonMaybePromise<AddonApiResult>
}

export interface AddonProviderRegistration {
  kind: string
  code: string
  label: string
  order?: number
  description?: string
  data?: Record<string, unknown>
}

export interface AddonActionHookRegistration<
  THook extends AddonActionHookName = AddonActionHookName,
  TPayload = LookupAddonActionHookPayload<THook>,
> {
  key: string
  hook: THook
  order?: number
  title?: string
  description?: string
  handle: (
    context: AddonActionHookContext<THook, TPayload>,
  ) => AddonMaybePromise<void>
}

export interface AddonWaterfallHookRegistration<
  THook extends AddonWaterfallHookName = AddonWaterfallHookName,
  TValue = LookupAddonWaterfallHookValue<THook>,
  TPayload = LookupAddonWaterfallHookPayload<THook>,
> {
  key: string
  hook: THook
  order?: number
  title?: string
  description?: string
  transform: (
    context: AddonWaterfallHookContext<THook, TValue, TPayload>,
  ) => AddonMaybePromise<TValue | undefined>
}

export interface AddonAsyncWaterfallHookRegistration<
  THook extends AddonAsyncWaterfallHookName = AddonAsyncWaterfallHookName,
  TValue = LookupAddonAsyncWaterfallHookValue<THook>,
  TPayload = LookupAddonAsyncWaterfallHookPayload<THook>,
> {
  key: string
  hook: THook
  order?: number
  title?: string
  description?: string
  transform: (
    context: AddonWaterfallHookContext<THook, TValue, TPayload>,
  ) => AddonMaybePromise<TValue | undefined>
}

export interface AddonBackgroundJobHandlerContext<
  TPayload = unknown,
> extends AddonExecutionContextBase {
  job: AddonBackgroundJobHandle<TPayload>
  payload: TPayload
}

export interface AddonBackgroundJobRegistration<
  TPayload = unknown,
> {
  key: string
  title?: string
  description?: string
  handle: (
    context: AddonBackgroundJobHandlerContext<TPayload>,
  ) => AddonMaybePromise<void>
}

export interface AddonDataMigrationRegistration {
  version: number
  title?: string
  migrate: (context: AddonExecutionContextBase) => AddonMaybePromise<void>
}

export interface AddonBuildApi {
  registerSlot: <TProps extends AddonSlotProps = AddonSlotProps>(
    registration: AddonSlotRegistration<TProps>,
  ) => void
  registerSurface: <TProps extends AddonSurfaceProps = AddonSurfaceProps>(
    registration: AddonSurfaceRegistration<TProps>,
  ) => void
  registerPublicPage: (registration: AddonPageRegistration) => void
  registerAdminPage: (registration: AddonPageRegistration) => void
  registerPublicApi: (registration: AddonApiRegistration) => void
  registerAdminApi: (registration: AddonApiRegistration) => void
  registerBackgroundJob: <TPayload = unknown>(
    registration: AddonBackgroundJobRegistration<TPayload>,
  ) => void
  registerProvider: (registration: AddonProviderRegistration) => void
  registerActionHook: (
    registration: AddonActionHookRegistration,
  ) => void
  registerWaterfallHook: (
    registration: AddonWaterfallHookRegistration,
  ) => void
  registerAsyncWaterfallHook: (
    registration: AddonAsyncWaterfallHookRegistration,
  ) => void
  registerDataMigration: (
    registration: AddonDataMigrationRegistration,
  ) => void
}

export interface AddonDefinition {
  setup: (api: AddonBuildApi) => AddonMaybePromise<void>
  lifecycle?: AddonLifecycleHooks
}

export interface LoadedAddonRuntime extends AddonRuntimeDescriptor {
  entryServerPath: string | null
  warnings: string[]
  permissionSet: ReadonlySet<string>
  resolvedPermissions: readonly string[]
  slots: AddonSlotRegistration[]
  surfaces: AddonSurfaceRegistration[]
  publicPages: AddonPageRegistration[]
  adminPages: AddonPageRegistration[]
  publicApis: AddonApiRegistration[]
  adminApis: AddonApiRegistration[]
  backgroundJobs: AddonBackgroundJobRegistration[]
  providers: AddonProviderRegistration[]
  actionHooks: AddonActionHookRegistration[]
  waterfallHooks: AddonWaterfallHookRegistration[]
  asyncWaterfallHooks: AddonAsyncWaterfallHookRegistration[]
  dataMigrations: AddonDataMigrationRegistration[]
  loadError: string | null
}

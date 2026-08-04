"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AdminFilterActions,
  AdminFilterCard,
  AdminFilterGroupedSelectField,
  AdminFilterSearchField,
  AdminFilterSelectField,
} from "@/components/admin/admin-filter-card"
import { AdminPaginationBar } from "@/components/admin/admin-pagination-bar"
import { AdminSummaryStrip } from "@/components/admin/admin-summary-strip"
import {
  ArrowRight,
  ExternalLink,
  Filter,
  MessageSquare,
  ShieldCheck,
  ShieldX,
  Sparkles,
  ThumbsUp,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState, useTransition } from "react"

import { AdminPostActionButton } from "@/components/admin/admin-post-action-button"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { showConfirm } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/toast"
import { UserAvatar } from "@/components/user/user-avatar"
import { formatAdminCommentPreview } from "@/lib/admin-comment-preview"
import type { AdminCommentListItem, AdminCommentListResult } from "@/lib/admin-comment-management"
import { formatDateTime, formatMonthDayTime, formatNumber } from "@/lib/formatters"
import { getPostCommentPath } from "@/lib/post-links"
import { cn } from "@/lib/utils"

interface AdminCommentListProps {
  data: AdminCommentListResult
}

const statusFilters = [
  { value: "ALL", label: "全部状态" },
  { value: "PENDING", label: "待审核" },
  { value: "NORMAL", label: "正常" },
  { value: "HIDDEN", label: "已下线" },
]

const sortFilters = [
  { value: "newest", label: "最新发布" },
  { value: "oldest", label: "最早发布" },
  { value: "mostLikes", label: "点赞最多" },
]

const reviewFilters = [
  { value: "ALL", label: "全部备注" },
  { value: "reviewed", label: "有备注" },
  { value: "unreviewed", label: "无备注" },
]

const typeFilters = [
  { value: "ALL", label: "全部层级" },
  { value: "ROOT", label: "主评论" },
  { value: "REPLY", label: "回复" },
]

const pageSizeOptions = [20, 50, 100]
export function AdminCommentList({ data }: AdminCommentListProps) {
  const [filters, setFilters] = useState({
    keyword: data.filters.keyword,
    status: data.filters.status,
    board: data.filters.board,
    sort: data.filters.sort,
    review: data.filters.review,
    type: data.filters.type,
    god: data.filters.god,
    pageSize: String(data.pagination.pageSize),
  })

  useEffect(() => {
    setFilters({
      keyword: data.filters.keyword,
      status: data.filters.status,
      board: data.filters.board,
      sort: data.filters.sort,
      review: data.filters.review,
      type: data.filters.type,
      god: data.filters.god,
      pageSize: String(data.pagination.pageSize),
    })
  }, [data])

  const router = useRouter()
  const [selectedCommentIdsState, setSelectedCommentIds] = useState<string[]>([])
  const [isBatchPending, startBatchTransition] = useTransition()

  const groupedBoardOptions = useMemo(() => {
    const groups = new Map<string, Array<{ value: string; label: string }>>()

    for (const board of data.boardOptions) {
      const zoneName = board.zoneName ?? "未分区"
      const currentItems = groups.get(zoneName) ?? []
      currentItems.push({ value: board.slug, label: board.name })
      groups.set(zoneName, currentItems)
    }

    return Array.from(groups.entries()).map(([zone, items]) => ({ zone, items }))
  }, [data.boardOptions])

  const visibleCommentIds = useMemo(() => new Set(data.comments.map((comment) => comment.id)), [data.comments])
  const selectedCommentIds = useMemo(
    () => selectedCommentIdsState.filter((commentId) => visibleCommentIds.has(commentId)),
    [selectedCommentIdsState, visibleCommentIds],
  )
  const selectedCount = selectedCommentIds.length
  const allCurrentPageSelected = data.comments.length > 0 && selectedCount === data.comments.length
  const someCurrentPageSelected = selectedCount > 0 && !allCurrentPageSelected

  const buildStatHref = useCallback((updates: Record<string, string>) => {
    const query = new URLSearchParams({
      tab: "comments",
      keyword: "",
      status: "ALL",
      board: "",
      sort: data.filters.sort,
      review: "ALL",
      type: "ALL",
      god: "ALL",
      commentPage: "1",
      commentPageSize: String(data.pagination.pageSize),
    })

    for (const [key, value] of Object.entries(updates)) {
      query.set(key, value)
    }

    return `/admin?${query.toString()}`
  }, [data.filters.sort, data.pagination.pageSize])

  function toggleSelectComment(commentId: string, checked: boolean) {
    setSelectedCommentIds((current) => {
      if (checked) {
        return current.includes(commentId) ? current : [...current, commentId]
      }

      return current.filter((item) => item !== commentId)
    })
  }

  function toggleSelectCurrentPage(checked: boolean) {
    const currentPageIds = data.comments.map((comment) => comment.id)
    setSelectedCommentIds((current) => {
      if (checked) {
        return [...new Set([...current, ...currentPageIds])]
      }

      return current.filter((commentId) => !visibleCommentIds.has(commentId))
    })
  }

  async function confirmBatchAction(action: string, title: string, description: string, confirmText: string, danger = false) {
    if (selectedCount === 0) {
      toast.warning("请先选择要处理的评论", "批量操作")
      return
    }

    const confirmed = await showConfirm({
      title,
      description,
      confirmText,
      cancelText: "取消",
      variant: danger ? "danger" : "default",
    })

    if (!confirmed) {
      return
    }

    submitBatchAction(action)
  }

  function submitBatchAction(action: string) {
    if (selectedCount === 0) {
      toast.warning("请先选择要处理的评论", "批量操作")
      return
    }

    startBatchTransition(async () => {
      try {
        const response = await fetch("/api/admin/comments/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            commentIds: selectedCommentIds,
          }),
        })
        const result = await response.json().catch(() => null) as { message?: string; data?: { failedCount?: number } } | null

        if (!response.ok) {
          throw new Error(result?.message ?? "批量操作失败")
        }

        if (result?.data?.failedCount && result.data.failedCount > 0) {
          toast.warning(result.message ?? "部分评论处理失败", "批量操作完成")
        } else {
          toast.success(result?.message ?? "批量操作已完成", "操作成功")
        }

        setSelectedCommentIds([])
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "批量操作失败", "操作失败")
      }
    })
  }

  const statCards = useMemo(
    () => [
      {
        label: "评论总数",
        value: data.summary.total,
        icon: <MessageSquare className="h-4 w-4" />,
        hint: `当前结果 ${formatNumber(data.pagination.total)} 条`,
        href: buildStatHref({}),
        active: data.filters.keyword === "" && data.filters.status === "ALL" && data.filters.board === "" && data.filters.review === "ALL" && data.filters.type === "ALL" && data.filters.god === "ALL",
      },
      {
        label: "待审核",
        value: data.summary.pending,
        icon: <ShieldCheck className="h-4 w-4" />,
        hint: "优先处理命中规则或待人工复核的内容",
        tone: "amber" as const,
        href: buildStatHref({ status: "PENDING" }),
        active: data.filters.keyword === "" && data.filters.status === "PENDING" && data.filters.board === "" && data.filters.review === "ALL" && data.filters.type === "ALL" && data.filters.god === "ALL",
      },
      {
        label: "已下线",
        value: data.summary.hidden,
        icon: <ShieldX className="h-4 w-4" />,
        hint: "包含手动下线和风控隐藏",
        tone: "slate" as const,
        href: buildStatHref({ status: "HIDDEN" }),
        active: data.filters.keyword === "" && data.filters.status === "HIDDEN" && data.filters.board === "" && data.filters.review === "ALL" && data.filters.type === "ALL" && data.filters.god === "ALL",
      },
      {
        label: "主评论",
        value: data.summary.root,
        icon: <Sparkles className="h-4 w-4" />,
        hint: "直接挂在帖子下的楼层评论",
        tone: "sky" as const,
        href: buildStatHref({ type: "ROOT" }),
        active: data.filters.keyword === "" && data.filters.status === "ALL" && data.filters.board === "" && data.filters.review === "ALL" && data.filters.type === "ROOT" && data.filters.god === "ALL",
      },
      {
        label: "神评",
        value: data.summary.god,
        icon: <Sparkles className="h-4 w-4" />,
        hint: "评论区优先展示的高亮评论",
        tone: "orange" as const,
        href: buildStatHref({ god: "god" }),
        active: data.filters.keyword === "" && data.filters.status === "ALL" && data.filters.board === "" && data.filters.review === "ALL" && data.filters.type === "ALL" && data.filters.god === "god",
      },
      {
        label: "回复数",
        value: data.summary.reply,
        icon: <ThumbsUp className="h-4 w-4" />,
        hint: "评论树中的回复节点",
        tone: "emerald" as const,
        href: buildStatHref({ type: "REPLY" }),
        active: data.filters.keyword === "" && data.filters.status === "ALL" && data.filters.board === "" && data.filters.review === "ALL" && data.filters.type === "REPLY" && data.filters.god === "ALL",
      },
    ],
    [buildStatHref, data.filters, data.pagination, data.summary],
  )

  const activeFilterBadges = useMemo(() => {
    const badges: string[] = []

    if (filters.keyword.trim()) {
      badges.push(`关键词: ${filters.keyword.trim()}`)
    }
    if (filters.status !== "ALL") {
      badges.push(`状态: ${statusFilters.find((item) => item.value === filters.status)?.label ?? filters.status}`)
    }
    if (filters.board) {
      badges.push(`节点: ${data.boardOptions.find((item) => item.slug === filters.board)?.name ?? filters.board}`)
    }
    if (filters.sort !== "newest") {
      badges.push(`排序: ${sortFilters.find((item) => item.value === filters.sort)?.label ?? filters.sort}`)
    }
    if (filters.review !== "ALL") {
      badges.push(`备注: ${reviewFilters.find((item) => item.value === filters.review)?.label ?? filters.review}`)
    }
    if (filters.type !== "ALL") {
      badges.push(`层级: ${typeFilters.find((item) => item.value === filters.type)?.label ?? filters.type}`)
    }
    if (filters.god !== "ALL") {
      badges.push(`神评: ${filters.god === "god" ? "仅神评" : "非神评"}`)
    }
    if (filters.pageSize !== "20") {
      badges.push(`每页: ${filters.pageSize} 条`)
    }

    return badges
  }, [data.boardOptions, filters])

  const baseQuery = new URLSearchParams({
    tab: "comments",
    keyword: data.filters.keyword,
    status: data.filters.status,
    board: data.filters.board,
    sort: data.filters.sort,
    review: data.filters.review,
    type: data.filters.type,
    god: data.filters.god,
    commentPageSize: String(data.pagination.pageSize),
  })

  function buildPageHref(page: number) {
    const query = new URLSearchParams(baseQuery)
    query.set("commentPage", String(page))
    return `/admin?${query.toString()}`
  }

  return (
    <div className="space-y-4">
      <AdminSummaryStrip items={statCards} />

      <AdminFilterCard
        title="评论筛选"
        description="按状态、节点、层级和审核备注快速定位待处理评论。"
        badge={<Badge variant="secondary" className="rounded-full">已命中 {formatNumber(data.pagination.total)} 条</Badge>}
        activeBadges={activeFilterBadges}
      >
        <form action="/admin" className="grid gap-2 xl:grid-cols-[minmax(176px,1.55fr)_repeat(6,minmax(84px,1fr))_auto] xl:items-end">
          <input type="hidden" name="tab" value="comments" />
          <input type="hidden" name="commentPage" value="1" />
          <input type="hidden" name="status" value={filters.status} />
          <input type="hidden" name="board" value={filters.board} />
          <input type="hidden" name="sort" value={filters.sort} />
          <input type="hidden" name="review" value={filters.review} />
          <input type="hidden" name="type" value={filters.type} />
          <input type="hidden" name="god" value={filters.god} />
          <input type="hidden" name="commentPageSize" value={filters.pageSize} />

          <AdminFilterSearchField
            label="搜索评论"
            name="keyword"
            value={filters.keyword}
            onChange={(value) => setFilters((current) => ({ ...current, keyword: value }))}
            placeholder="评论内容 / 帖子 / 作者"
          />

          <AdminFilterSelectField
            label="状态"
            value={filters.status}
            onValueChange={(value) => setFilters((current) => ({ ...current, status: value }))}
            options={statusFilters}
          />
          <AdminFilterGroupedSelectField
            label="节点"
            value={filters.board}
            groups={groupedBoardOptions.map((group) => ({ label: group.zone, items: group.items }))}
            onValueChange={(value) => setFilters((current) => ({ ...current, board: value }))}
            allLabel="全部节点"
          />
          <AdminFilterSelectField
            label="排序"
            value={filters.sort}
            onValueChange={(value) => setFilters((current) => ({ ...current, sort: value }))}
            options={sortFilters}
          />
          <AdminFilterSelectField
            label="备注"
            value={filters.review}
            onValueChange={(value) => setFilters((current) => ({ ...current, review: value }))}
            options={reviewFilters}
          />
          <AdminFilterSelectField
            label="层级"
            value={filters.type}
            onValueChange={(value) => setFilters((current) => ({ ...current, type: value }))}
            options={typeFilters}
          />
          <AdminFilterSelectField
            label="每页"
            value={filters.pageSize}
            onValueChange={(value) => setFilters((current) => ({ ...current, pageSize: value }))}
            options={pageSizeOptions.map((item) => ({ value: String(item), label: `${item} 条` }))}
          />

          <AdminFilterActions
            submitLabel="筛选评论"
            resetHref="/admin?tab=comments"
            submitIcon={<Filter className="h-3.5 w-3.5" />}
          />
        </form>
      </AdminFilterCard>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>评论列表</CardTitle>
          <CardDescription>在同一视图里查看内容、帖子归属、审核状态和处理动作。</CardDescription>
          <CardAction>
            <OverviewActionLink href="/admin?tab=comments&status=PENDING" label="查看待审核" />
          </CardAction>
        </CardHeader>
        {data.comments.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={allCurrentPageSelected || someCurrentPageSelected}
                  onCheckedChange={(checked) => toggleSelectCurrentPage(checked === true)}
                  aria-label="全选本页评论"
                />
                <span>全选本页</span>
              </label>
              <span>已选 {selectedCount} 条</span>
              {selectedCount > 0 ? (
                <Button type="button" variant="ghost" size="sm" className="rounded-full px-3 text-xs" disabled={isBatchPending} onClick={() => setSelectedCommentIds([])}>
                  清空选择
                </Button>
              ) : null}
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
              <Button type="button" variant="outline" size="sm" className="min-h-9 rounded-full px-3 text-xs" disabled={selectedCount === 0 || isBatchPending} onClick={() => void confirmBatchAction("comment.approve", "批量通过评论", `确认通过已选中的 ${selectedCount} 条评论吗？`, "批量通过")}>批量通过</Button>
              <Button type="button" variant="outline" size="sm" className="min-h-9 rounded-full px-3 text-xs" disabled={selectedCount === 0 || isBatchPending} onClick={() => void confirmBatchAction("comment.show", "批量恢复评论", `确认恢复已选中的 ${selectedCount} 条评论吗？`, "批量恢复")}>批量恢复</Button>
              <Button type="button" variant="outline" size="sm" className="min-h-9 rounded-full border-rose-200 px-3 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={selectedCount === 0 || isBatchPending} onClick={() => void confirmBatchAction("comment.reject", "批量驳回评论", `确认驳回已选中的 ${selectedCount} 条评论吗？驳回后将下线评论。`, "批量驳回", true)}>批量驳回</Button>
              <Button type="button" variant="outline" size="sm" className="min-h-9 rounded-full border-rose-200 px-3 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={selectedCount === 0 || isBatchPending} onClick={() => void confirmBatchAction("comment.hide", "批量隐藏评论", `确认隐藏已选中的 ${selectedCount} 条评论吗？隐藏后前台不再展示。`, "批量隐藏", true)}>批量隐藏</Button>
              <Button type="button" variant="outline" size="sm" className="min-h-9 rounded-full border-rose-200 px-3 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:col-auto" disabled={selectedCount === 0 || isBatchPending} onClick={() => void confirmBatchAction("comment.delete", "批量删除评论", `确认删除已选中的 ${selectedCount} 条评论吗？此操作不可撤销。`, "批量删除", true)}>批量删除</Button>
            </div>
          </div>
        ) : null}
        {data.comments.length > 0 ? (
          <AdminPaginationBar
            pagination={data.pagination}
            buildPageHref={buildPageHref}
            itemLabel="条评论"
            className="border-b border-border px-4 py-3"
          />
        ) : null}
        <CardContent className="px-0 py-0">
          {data.comments.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <p className="text-sm font-medium">当前筛选条件下没有评论</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                试试放宽节点、状态或关键词，或者重置筛选后重新查看。
              </p>
              <OverviewActionLink href="/admin?tab=comments" label="重置筛选" />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 p-3 md:hidden">
                {data.comments.map((comment) => (
                  <CommentMobileCard
                    key={comment.id}
                    comment={comment}
                    selected={selectedCommentIds.includes(comment.id)}
                    onSelect={(checked) => toggleSelectComment(comment.id, checked)}
                  />
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[1040px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[52px]">
                        <Checkbox
                          checked={allCurrentPageSelected || someCurrentPageSelected}
                          onCheckedChange={(checked) => toggleSelectCurrentPage(checked === true)}
                          aria-label="全选本页评论"
                        />
                      </TableHead>
                      <TableHead>评论</TableHead>
                      <TableHead className="w-[220px]">帖子</TableHead>
                      <TableHead className="w-[150px]">作者</TableHead>
                      <TableHead className="w-[120px]">状态</TableHead>
                      <TableHead className="w-[200px]">审核</TableHead>
                      <TableHead className="w-[90px]">点赞</TableHead>
                      <TableHead className="w-[120px]">更新时间</TableHead>
                      <TableHead className="w-[120px] text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.comments.map((comment) => (
                      <TableRow key={comment.id} data-state={selectedCommentIds.includes(comment.id) ? "selected" : undefined}>
                        <TableCell className="align-top">
                          <Checkbox
                            checked={selectedCommentIds.includes(comment.id)}
                            onCheckedChange={(checked) => toggleSelectComment(comment.id, checked === true)}
                            aria-label={`选择评论 ${formatAdminCommentPreview(comment.content).slice(0, 24)}`}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <CommentContentCell comment={comment} />
                        </TableCell>
                        <TableCell className="align-top">
                          <CommentPostCell comment={comment} />
                        </TableCell>
                        <TableCell className="align-top">
                          <CommentAuthorCell comment={comment} />
                        </TableCell>
                        <TableCell className="align-top">
                          <CommentStatusCell comment={comment} />
                        </TableCell>
                        <TableCell className="align-top">
                          <CommentReviewCell comment={comment} />
                        </TableCell>
                        <TableCell className="align-top">
                          <CommentLikeCell comment={comment} />
                        </TableCell>
                        <TableCell className="align-top">
                          <CommentUpdateCell comment={comment} />
                        </TableCell>
                        <TableCell className="align-top">
                          <CommentActionsCell comment={comment} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter>
          <AdminPaginationBar
            pagination={data.pagination}
            buildPageHref={buildPageHref}
            itemLabel="条评论"
            className="w-full"
          />
        </CardFooter>
      </Card>
    </div>
  )
}

function CommentContentCell({ comment }: { comment: AdminCommentListItem }) {
  const content = formatAdminCommentPreview(comment.content)

  return (
    <div className="flex items-start gap-3">
      <UserAvatar name={comment.authorName} avatarPath={comment.authorAvatarPath} size="xs" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge className={getCommentStatusBadgeClassName(comment.status)}>
            {comment.statusLabel}
          </Badge>
          <Badge variant="outline">{comment.parentId ? "回复" : "主评论"}</Badge>
          <span className="text-[11px] text-muted-foreground">
            {formatMonthDayTime(comment.createdAt)}
          </span>
        </div>
        <Tooltip content={content} className="w-full" disabled={content.length < 28}>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground/90">
            {content}
          </p>
        </Tooltip>
      </div>
    </div>
  )
}

function CommentMobileCard({
  comment,
  selected,
  onSelect,
}: {
  comment: AdminCommentListItem
  selected: boolean
  onSelect: (checked: boolean) => void
}) {
  const content = formatAdminCommentPreview(comment.content)

  return (
    <article
      data-state={selected ? "selected" : undefined}
      className="rounded-[18px] border border-border/80 bg-card p-3 shadow-xs transition-colors active:bg-muted/50 data-[state=selected]:border-primary/45 data-[state=selected]:bg-primary/5"
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(checked === true)}
          aria-label={`选择评论 ${content.slice(0, 24)}`}
          className="mt-1 shrink-0"
        />
        <UserAvatar name={comment.authorName} avatarPath={comment.authorAvatarPath} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{comment.authorName}</p>
              <p className="mt-1 text-xs text-muted-foreground">@{comment.authorUsername}</p>
            </div>
            <CommentActionsCell comment={comment} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-foreground/90 [overflow-wrap:anywhere]">
        {content}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Badge className={getCommentStatusBadgeClassName(comment.status)}>
          {comment.statusLabel}
        </Badge>
        <Badge variant="outline">{comment.parentId ? "回复" : "主评论"}</Badge>
        {comment.isGodComment ? <Badge variant="default">神评</Badge> : null}
      </div>

      <div className="mt-3 rounded-[14px] bg-muted/45 px-3 py-2 text-xs">
        <Link
          href={getPostCommentPath({ id: comment.postId, slug: comment.postSlug }, comment.id)}
          className="line-clamp-2 font-medium text-foreground transition-colors hover:text-primary"
        >
          {comment.postTitle}
        </Link>
        <p className="mt-1 text-muted-foreground">
          {comment.boardName}
          {comment.zoneName ? ` · ${comment.zoneName}` : ""}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted/60 px-2.5 py-1">点赞 {formatNumber(comment.likeCount)}</span>
        <span className="rounded-full bg-muted/60 px-2.5 py-1">创建 {formatMonthDayTime(comment.createdAt)}</span>
        <span className="rounded-full bg-muted/60 px-2.5 py-1">{comment.updatedAt === comment.createdAt ? "原始" : "已编辑"}</span>
      </div>

      {comment.reviewNote ? (
        <p className="mt-3 rounded-[14px] border border-dashed border-border/80 bg-background/70 px-3 py-2 text-xs leading-5 text-muted-foreground">
          审核备注：{comment.reviewNote}
        </p>
      ) : null}
    </article>
  )
}

function CommentPostCell({ comment }: { comment: AdminCommentListItem }) {
  return (
    <div className="space-y-2 text-xs">
      <Tooltip content={comment.postTitle} className="w-full" disabled={comment.postTitle.length < 20}>
        <Link
          href={getPostCommentPath({ id: comment.postId, slug: comment.postSlug }, comment.id)}
          className="block line-clamp-1 font-medium text-foreground transition-colors hover:text-primary"
        >
          {comment.postTitle}
        </Link>
      </Tooltip>
      <p className="text-muted-foreground">
        {comment.boardName}
        {comment.zoneName ? ` · ${comment.zoneName}` : ""}
      </p>
      <p className="line-clamp-1 text-muted-foreground">/posts/{comment.postSlug}</p>
    </div>
  )
}

function CommentAuthorCell({ comment }: { comment: AdminCommentListItem }) {
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p className="font-medium text-foreground">{comment.authorName}</p>
      <p>@{comment.authorUsername}</p>
    </div>
  )
}

function CommentStatusCell({ comment }: { comment: AdminCommentListItem }) {
  return (
    <div className="space-y-1.5 text-xs text-muted-foreground">
      <Badge className={getCommentStatusBadgeClassName(comment.status)}>
        {comment.statusLabel}
      </Badge>
      <p>{comment.parentId ? "回复评论" : "楼层评论"}</p>
    </div>
  )
}

function CommentReviewCell({ comment }: { comment: AdminCommentListItem }) {
  return (
    <div className="space-y-1.5 text-xs text-muted-foreground">
      {comment.reviewNote ? (
        <Tooltip content={`审核备注：${comment.reviewNote}`} className="w-full">
          <p className="line-clamp-2 leading-5">审核备注：{comment.reviewNote}</p>
        </Tooltip>
      ) : (
        <p>暂无审核备注</p>
      )}
      {comment.reviewedAt ? (
        <p>
          处理于 {formatDateTime(comment.reviewedAt)}
          {comment.reviewedByName ? ` · ${comment.reviewedByName}` : ""}
        </p>
      ) : null}
    </div>
  )
}

function CommentLikeCell({ comment }: { comment: AdminCommentListItem }) {
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>点赞 {formatNumber(comment.likeCount)}</p>
      {comment.isGodComment ? <Badge variant="default">神评</Badge> : null}
    </div>
  )
}

function CommentUpdateCell({ comment }: { comment: AdminCommentListItem }) {
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>创建 {formatMonthDayTime(comment.createdAt)}</p>
      <p>{comment.updatedAt === comment.createdAt ? "原始" : "已编辑"}</p>
    </div>
  )
}

function CommentActionsCell({ comment }: { comment: AdminCommentListItem }) {
  const router = useRouter()
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const commentPath = getPostCommentPath(
    { id: comment.postId, slug: comment.postSlug },
    comment.id
  )

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger className="min-h-9 rounded-full border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted">
          操作
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => router.push(commentPath)}>
            前台
            <ExternalLink className="ml-auto h-3.5 w-3.5" />
          </DropdownMenuItem>
          {!comment.parentId && comment.status === "NORMAL" ? (
            <DropdownMenuItem onClick={() => setActiveAction(comment.isGodComment ? "unmark-god" : "mark-god")}>
              {comment.isGodComment ? "取消神评" : "设为神评"}
            </DropdownMenuItem>
          ) : null}
          {comment.status === "PENDING" ? (
            <>
              <DropdownMenuItem onClick={() => setActiveAction("approve")}>
                通过
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveAction("reject")} variant="destructive">
                驳回
              </DropdownMenuItem>
            </>
          ) : comment.status === "HIDDEN" ? (
            <>
              <DropdownMenuItem onClick={() => setActiveAction("show")}>
                恢复
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveAction("delete")} variant="destructive">
                删除
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => setActiveAction("hide")} variant="destructive">
                下线
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveAction("delete")} variant="destructive">
                删除
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {comment.status === "NORMAL" && !comment.parentId ? (
        <AdminPostActionButton
          action={comment.isGodComment ? "comment.unmarkGod" : "comment.markGod"}
          targetId={comment.id}
          label={comment.isGodComment ? "取消神评" : "设为神评"}
          modalTitle={comment.isGodComment ? "确认取消神评" : "确认设为神评"}
          modalDescription={`帖子：${comment.postTitle}`}
          confirmText={comment.isGodComment ? "确认取消" : "确认设为神评"}
          className="h-7 rounded-full px-2.5 text-xs"
          hideTrigger
          open={activeAction === "mark-god" || activeAction === "unmark-god"}
          onOpenChange={(open) => setActiveAction(open ? (comment.isGodComment ? "unmark-god" : "mark-god") : null)}
        />
      ) : null}
      {comment.status === "PENDING" ? (
        <>
          <AdminPostActionButton
            action="comment.approve"
            targetId={comment.id}
            label="通过"
            modalTitle="确认通过评论审核"
            modalDescription={`帖子：${comment.postTitle}`}
            placeholder="填写审核备注（可选）"
            confirmText="确认通过"
            className="h-7 rounded-full px-2.5 text-xs"
            hideTrigger
            open={activeAction === "approve"}
            onOpenChange={(open) => setActiveAction(open ? "approve" : null)}
          />
          <AdminPostActionButton
            action="comment.reject"
            targetId={comment.id}
            label="驳回"
            tone="danger"
            modalTitle="确认驳回评论"
            modalDescription={`帖子：${comment.postTitle}`}
            placeholder="填写驳回原因"
            confirmText="确认驳回"
            className="h-7 rounded-full bg-red-600 px-2.5 text-xs text-white hover:bg-red-500"
            hideTrigger
            open={activeAction === "reject"}
            onOpenChange={(open) => setActiveAction(open ? "reject" : null)}
          />
          <AdminPostActionButton
            action="comment.delete"
            targetId={comment.id}
            label="删除"
            tone="danger"
            modalTitle="确认删除评论"
            modalDescription={`帖子：${comment.postTitle}`}
            placeholder="填写删除原因（可选）"
            confirmText="确认删除"
            className="h-7 rounded-full bg-red-700 px-2.5 text-xs text-white hover:bg-red-600"
            hideTrigger
            open={activeAction === "delete"}
            onOpenChange={(open) => setActiveAction(open ? "delete" : null)}
          />
        </>
      ) : comment.status === "HIDDEN" ? (
        <>
          <AdminPostActionButton
            action="comment.show"
            targetId={comment.id}
            label="恢复"
            modalTitle="确认恢复评论"
            modalDescription={`帖子：${comment.postTitle}`}
            placeholder="填写恢复说明（可选）"
            confirmText="确认恢复"
            className="h-7 rounded-full px-2.5 text-xs"
            hideTrigger
            open={activeAction === "show"}
            onOpenChange={(open) => setActiveAction(open ? "show" : null)}
          />
          <AdminPostActionButton
            action="comment.delete"
            targetId={comment.id}
            label="删除"
            tone="danger"
            modalTitle="确认删除评论"
            modalDescription={`帖子：${comment.postTitle}`}
            placeholder="填写删除原因（可选）"
            confirmText="确认删除"
            className="h-7 rounded-full bg-red-700 px-2.5 text-xs text-white hover:bg-red-600"
            hideTrigger
            open={activeAction === "delete"}
            onOpenChange={(open) => setActiveAction(open ? "delete" : null)}
          />
        </>
      ) : (
        <>
          <AdminPostActionButton
            action="comment.hide"
            targetId={comment.id}
            label="下线"
            tone="danger"
            modalTitle="确认下线评论"
            modalDescription={`帖子：${comment.postTitle}`}
            placeholder="填写下线原因（可选）"
            confirmText="确认下线"
            className="h-7 rounded-full bg-red-600 px-2.5 text-xs text-white hover:bg-red-500"
            hideTrigger
            open={activeAction === "hide"}
            onOpenChange={(open) => setActiveAction(open ? "hide" : null)}
          />
          <AdminPostActionButton
            action="comment.delete"
            targetId={comment.id}
            label="删除"
            tone="danger"
            modalTitle="确认删除评论"
            modalDescription={`帖子：${comment.postTitle}`}
            placeholder="填写删除原因（可选）"
            confirmText="确认删除"
            className="h-7 rounded-full bg-red-700 px-2.5 text-xs text-white hover:bg-red-600"
            hideTrigger
            open={activeAction === "delete"}
            onOpenChange={(open) => setActiveAction(open ? "delete" : null)}
          />
        </>
      )}
    </div>
  )
}

function OverviewActionLink({
  href,
  label,
}: {
  href: string
  label: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "rounded-full shadow-xs"
      )}
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  )
}

function getCommentStatusBadgeClassName(
  status: AdminCommentListResult["comments"][number]["status"]
) {
  if (status === "PENDING") {
    return "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
  }
  if (status === "HIDDEN") {
    return "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200"
  }
  return "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
}

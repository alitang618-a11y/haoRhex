"use client"

import Link from "next/link"
import { Filter, Inbox, MailOpen, MessageSquare, RotateCcw, Trash2, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import {
  AdminFilterActions,
  AdminFilterCard,
  AdminFilterSearchField,
  AdminFilterSelectField,
} from "@/components/admin/admin-filter-card"
import { AdminPaginationBar } from "@/components/admin/admin-pagination-bar"
import { AdminSummaryStrip } from "@/components/admin/admin-summary-strip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type {
  AdminMessageConversationDetail,
  AdminMessageConversationItem,
  AdminMessageListResult,
  AdminMessageParticipantItem,
  AdminMessageRecordItem,
} from "@/lib/admin-message-management"
import { getAvatarFallback } from "@/lib/avatar"
import { formatNumber } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface AdminMessageRecordsProps {
  data: AdminMessageListResult
}

const sortOptions = [
  { value: "newest", label: "最近更新" },
  { value: "oldest", label: "最早更新" },
]

const pageSizeOptions = [20, 50, 100]

export function AdminMessageRecords({ data }: AdminMessageRecordsProps) {
  const router = useRouter()
  const [filters, setFilters] = useState({
    keyword: data.filters.keyword,
    sort: data.filters.sort,
    pageSize: String(data.pagination.pageSize),
    detailPageSize: String(data.filters.detailPageSize),
  })

  useEffect(() => {
    setFilters({
      keyword: data.filters.keyword,
      sort: data.filters.sort,
      pageSize: String(data.pagination.pageSize),
      detailPageSize: String(data.filters.detailPageSize),
    })
  }, [data])

  const [isDeletingReadSystemNotifications, setIsDeletingReadSystemNotifications] = useState(false)
  const [deleteReadSystemNotificationsMessage, setDeleteReadSystemNotificationsMessage] = useState("")

  const activeFilterBadges = useMemo(() => {
    const badges: string[] = []

    if (filters.keyword.trim()) {
      badges.push(`关键词: ${filters.keyword.trim()}`)
    }
    if (filters.sort !== "newest") {
      badges.push(`排序: ${sortOptions.find((item) => item.value === filters.sort)?.label ?? filters.sort}`)
    }
    if (filters.pageSize !== "20") {
      badges.push(`会话每页: ${filters.pageSize} 条`)
    }
    if (filters.detailPageSize !== "20") {
      badges.push(`聊天每页: ${filters.detailPageSize} 条`)
    }

    return badges
  }, [filters])

  const statCards = useMemo(
    () => [
      {
        label: "匹配会话",
        value: data.summary.conversationTotal,
        icon: <Inbox />,
        hint: `当前页 ${formatNumber(data.conversations.length)} 个`,
      },
      {
        label: "会话消息",
        value: data.summary.messageTotal,
        icon: <MessageSquare />,
        hint: "匹配会话内的消息总数",
        tone: "sky" as const,
      },
      {
        label: "未读累积",
        value: data.summary.unreadTotal,
        icon: <MailOpen />,
        hint: "按参与方未读数汇总",
        tone: "amber" as const,
      },
      {
        label: "已归档参与方",
        value: data.summary.archivedParticipantCount,
        icon: <Users />,
        hint: "用户侧已删除或归档的会话参与记录",
        tone: "slate" as const,
      },
    ],
    [data],
  )

  const baseQuery = new URLSearchParams({
    tab: "messages",
    messageKeyword: data.filters.keyword,
    messageSort: data.filters.sort,
    messagePageSize: String(data.pagination.pageSize),
    messageDetailPageSize: String(data.filters.detailPageSize),
  })

  function buildConversationHref(conversationId: string, page = data.pagination.page) {
    const query = new URLSearchParams(baseQuery)
    query.set("messagePage", String(page))
    query.set("messageDetailPage", "1")
    query.set("messageConversationId", conversationId)
    return `/admin?${query.toString()}`
  }

  function buildPageHref(page: number) {
    const query = new URLSearchParams(baseQuery)
    query.set("messagePage", String(page))
    query.set("messageDetailPage", "1")
    if (data.activeConversation?.id) {
      query.set("messageConversationId", data.activeConversation.id)
    }
    return `/admin?${query.toString()}`
  }

  function buildDetailPageHref(page: number) {
    const query = new URLSearchParams(baseQuery)
    query.set("messagePage", String(data.pagination.page))
    query.set("messageDetailPage", String(page))
    if (data.activeConversation?.id) {
      query.set("messageConversationId", data.activeConversation.id)
    }
    return `/admin?${query.toString()}`
  }

  async function handleDeleteReadSystemNotifications() {
    if (isDeletingReadSystemNotifications) {
      return
    }

    const confirmed = window.confirm("确定删除所有成员已读的系统消息吗？未读系统消息不会被删除。")
    if (!confirmed) {
      return
    }

    setIsDeletingReadSystemNotifications(true)
    setDeleteReadSystemNotificationsMessage("")

    try {
      const response = await fetch("/api/admin/notifications/read-system/delete", {
        method: "POST",
      })
      const payload = await response.json().catch(() => null) as { message?: string; data?: { deletedCount?: number } } | null

      if (!response.ok) {
        setDeleteReadSystemNotificationsMessage(payload?.message ?? "删除失败，请稍后重试")
        return
      }

      const deletedCount = payload?.data?.deletedCount ?? 0
      setDeleteReadSystemNotificationsMessage(`已删除 ${formatNumber(deletedCount)} 条成员已读系统消息`)
      router.refresh()
    } finally {
      setIsDeletingReadSystemNotifications(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminFilterCard
        title="私信筛选"
        description="按会话 ID、用户 ID、用户名、昵称或消息内容定位私信会话。"
        badge={<Badge variant="secondary" className="rounded-full">已命中 {formatNumber(data.pagination.total)} 个会话</Badge>}
        activeBadges={activeFilterBadges}
      >
        <form action="/admin" className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_minmax(120px,150px)_minmax(120px,150px)_minmax(120px,150px)_auto] xl:items-end">
          <input type="hidden" name="tab" value="messages" />
          <input type="hidden" name="messagePage" value="1" />
          <input type="hidden" name="messageDetailPage" value="1" />
          <input type="hidden" name="messageSort" value={filters.sort} />
          <input type="hidden" name="messagePageSize" value={filters.pageSize} />
          <input type="hidden" name="messageDetailPageSize" value={filters.detailPageSize} />

          <AdminFilterSearchField
            label="搜索私信"
            name="messageKeyword"
            value={filters.keyword}
            onChange={(value) => setFilters((current) => ({ ...current, keyword: value }))}
            placeholder="内容 / 用户 / 会话 ID"
          />
          <AdminFilterSelectField
            label="排序"
            value={filters.sort}
            onValueChange={(value) => setFilters((current) => ({ ...current, sort: value }))}
            options={sortOptions}
          />
          <AdminFilterSelectField
            label="会话每页"
            value={filters.pageSize}
            onValueChange={(value) => setFilters((current) => ({ ...current, pageSize: value }))}
            options={pageSizeOptions.map((item) => ({ value: String(item), label: `${item} 条` }))}
          />
          <AdminFilterSelectField
            label="聊天每页"
            value={filters.detailPageSize}
            onValueChange={(value) => setFilters((current) => ({ ...current, detailPageSize: value }))}
            options={pageSizeOptions.map((item) => ({ value: String(item), label: `${item} 条` }))}
          />
          <AdminFilterActions
            submitLabel="筛选私信"
            resetHref="/admin?tab=messages"
            submitIcon={<Filter data-icon="inline-start" />}
          />
        </form>
      </AdminFilterCard>

      <AdminSummaryStrip items={statCards} />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>系统消息清理</CardTitle>
            <CardDescription>一键删除所有成员已经读过的系统通知，保留未读系统通知和回复、提及等互动通知。</CardDescription>
          </div>
          <Button type="button" variant="destructive" disabled={isDeletingReadSystemNotifications} onClick={handleDeleteReadSystemNotifications}>
            <Trash2 data-icon="inline-start" />
            {isDeletingReadSystemNotifications ? "删除中..." : "删除已读系统消息"}
          </Button>
        </CardHeader>
        {deleteReadSystemNotificationsMessage ? (
          <CardContent className="pt-0 text-sm text-muted-foreground">
            {deleteReadSystemNotificationsMessage}
          </CardContent>
        ) : null}
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.35fr)]">
        <ConversationListCard
          conversations={data.conversations}
          activeConversationId={data.activeConversation?.id ?? null}
          pagination={data.pagination}
          buildConversationHref={buildConversationHref}
          buildPageHref={buildPageHref}
        />
        <ConversationDetailCard conversation={data.activeConversation} buildDetailPageHref={buildDetailPageHref} />
      </div>
    </div>
  )
}

function ConversationListCard({
  conversations,
  activeConversationId,
  pagination,
  buildConversationHref,
  buildPageHref,
}: {
  conversations: AdminMessageConversationItem[]
  activeConversationId: string | null
  pagination: AdminMessageListResult["pagination"]
  buildConversationHref: (conversationId: string, page?: number) => string
  buildPageHref: (page: number) => string
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>会话列表</CardTitle>
        <CardDescription>按最近更新时间展示匹配的私信会话。</CardDescription>
      </CardHeader>
      {conversations.length > 0 ? (
        <AdminPaginationBar
          pagination={pagination}
          buildPageHref={buildPageHref}
          itemLabel="个会话"
          className="border-b border-border px-4 py-3"
        />
      ) : null}
      <CardContent className="p-0">
        {conversations.length === 0 ? (
          <EmptyState
            title="没有匹配的私信会话"
            description="放宽关键词后重新筛选，或重置后查看全部会话。"
            href="/admin?tab=messages"
          />
        ) : (
          <div className="flex max-h-[720px] flex-col overflow-y-auto">
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                active={conversation.id === activeConversationId}
                href={buildConversationHref(conversation.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <AdminPaginationBar
          pagination={pagination}
          buildPageHref={buildPageHref}
          itemLabel="个会话"
          className="w-full"
        />
      </CardFooter>
    </Card>
  )
}

function ConversationListItem({
  conversation,
  active,
  href,
}: {
  conversation: AdminMessageConversationItem
  active: boolean
  href: string
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col gap-2 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent/50",
        active && "bg-accent text-accent-foreground",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <ParticipantAvatars participants={conversation.participants} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{conversation.title}</p>
            <p className="truncate text-[11px] text-muted-foreground">{conversation.subtitle}</p>
          </div>
        </div>
        <Badge variant={conversation.unreadTotal > 0 ? "default" : "outline"} className="shrink-0 rounded-full">
          {formatNumber(conversation.messageCount)} 条
        </Badge>
      </div>
      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
        {conversation.latestSenderName ? `${conversation.latestSenderName}: ` : ""}
        {conversation.preview}
      </p>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span>{conversation.lastMessageAt}</span>
        {conversation.unreadTotal > 0 ? <Badge variant="secondary" className="rounded-full">未读 {conversation.unreadTotal}</Badge> : null}
        {conversation.archivedParticipantCount > 0 ? <Badge variant="outline" className="rounded-full">已归档 {conversation.archivedParticipantCount}</Badge> : null}
      </div>
    </Link>
  )
}

function ConversationDetailCard({
  conversation,
  buildDetailPageHref,
}: {
  conversation: AdminMessageConversationDetail | null
  buildDetailPageHref: (page: number) => string
}) {
  if (!conversation) {
    return (
      <Card>
        <CardHeader className="border-b">
          <CardTitle>聊天记录</CardTitle>
          <CardDescription>选择左侧会话后查看消息内容。</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState title="暂无会话" description="当前筛选条件下没有可查看的私信记录。" href="/admin?tab=messages" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{conversation.title}</CardTitle>
        <CardDescription>{conversation.subtitle}</CardDescription>
        <CardAction className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full">
            第 {conversation.messagePagination.page} / {conversation.messagePagination.totalPages} 页
          </Badge>
          <Badge variant="outline" className="rounded-full">
            {formatNumber(conversation.messageCount)} 条消息
          </Badge>
        </CardAction>
      </CardHeader>
      <AdminPaginationBar
        pagination={conversation.messagePagination}
        buildPageHref={buildDetailPageHref}
        itemLabel="条消息"
        className="border-b border-border px-4 py-3"
        previousLabel="较新"
        nextLabel="更早"
      />
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          {conversation.participants.map((participant) => (
            <ParticipantBadge key={participant.id} participant={participant} />
          ))}
        </div>

        <div className="flex max-h-[680px] flex-col gap-3 overflow-y-auto pr-1">
          {conversation.messages.map((message) => (
            <MessageRecord key={message.id} message={message} />
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>会话 ID: {conversation.id}</span>
          <span>创建 {conversation.createdAt}</span>
          <span>更新 {conversation.updatedAt}</span>
          <span>共 {formatNumber(conversation.messagePagination.total)} 条</span>
        </div>
        <AdminPaginationBar
          pagination={conversation.messagePagination}
          buildPageHref={buildDetailPageHref}
          itemLabel="条消息"
          className="w-full"
          previousLabel="较新"
          nextLabel="更早"
        />
      </CardFooter>
    </Card>
  )
}

function ParticipantAvatars({ participants }: { participants: AdminMessageParticipantItem[] }) {
  return (
    <div className="flex shrink-0 -space-x-2">
      {participants.slice(0, 2).map((participant) => (
        <Avatar key={participant.id} size="sm" className="ring-2 ring-background">
          <AvatarFallback>{getInitials(participant.displayName)}</AvatarFallback>
        </Avatar>
      ))}
    </div>
  )
}

function ParticipantBadge({ participant }: { participant: AdminMessageParticipantItem }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
      <Avatar size="sm">
        <AvatarFallback>{getInitials(participant.displayName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium">{participant.displayName}</span>
          <Badge variant="secondary" className="rounded-full">{getRoleLabel(participant.role)}</Badge>
          <Badge variant={participant.status === "ACTIVE" ? "outline" : "secondary"} className="rounded-full">{getStatusLabel(participant.status)}</Badge>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          @{participant.username} · ID {participant.id}
          {participant.unreadCount > 0 ? ` · 未读 ${participant.unreadCount}` : ""}
          {participant.archivedAt ? ` · 归档 ${participant.archivedAt}` : ""}
        </p>
      </div>
    </div>
  )
}

function MessageRecord({ message }: { message: AdminMessageRecordItem }) {
  return (
    <article className="rounded-lg border border-border bg-background px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar size="sm">
            <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{message.senderName}</p>
            <p className="truncate text-[11px] text-muted-foreground">@{message.senderUsername} · ID {message.senderId}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{message.createdAt}</span>
          <Badge variant="outline" className="rounded-full">#{message.id.slice(-8)}</Badge>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
        {message.body || message.preview}
      </p>
    </article>
  )
}

function EmptyState({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button variant="outline" size="sm" className="rounded-full" nativeButton={false} render={<Link href={href} />}>
        <RotateCcw data-icon="inline-start" />
        重置筛选
      </Button>
    </div>
  )
}

function getInitials(name: string) {
  return getAvatarFallback(name)
}

function getRoleLabel(role: string) {
  if (role === "ADMIN") {
    return "管理员"
  }
  if (role === "MODERATOR") {
    return "版主"
  }
  return "用户"
}

function getStatusLabel(status: string) {
  if (status === "ACTIVE") {
    return "正常"
  }
  if (status === "MUTED") {
    return "禁言"
  }
  if (status === "BANNED") {
    return "拉黑"
  }
  if (status === "INACTIVE") {
    return "未激活"
  }
  return status
}

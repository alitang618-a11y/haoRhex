"use client"

import Link from "next/link"
import { ExternalLink, FileArchive, Filter, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import {
  AdminFilterActions,
  AdminFilterCard,
  AdminFilterSearchField,
  AdminFilterSelectField,
} from "@/components/admin/admin-filter-card"
import { AdminPaginationBar } from "@/components/admin/admin-pagination-bar"
import { AdminSummaryStrip } from "@/components/admin/admin-summary-strip"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAdminMutation } from "@/hooks/use-admin-mutation"
import { adminPost } from "@/lib/admin-client"
import type {
  AdminAttachmentJobEnqueueResult,
  AdminAttachmentJobRepairResult,
  AdminAttachmentManagementResult,
  AdminAttachmentReferenceScanJobSummary,
} from "@/lib/admin-attachments"
import type { AdminAttachmentReferenceFilter } from "@/lib/admin-attachments"
import { formatDateTime, formatNumber } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface AdminAttachmentManagerProps {
  data: AdminAttachmentManagementResult
}

const referenceOptions = [
  { value: "ALL", label: "全部引用状态" },
  { value: "REFERENCED", label: "已引用" },
  { value: "ORPHAN", label: "无引用" },
]
const pageSizeOptions = [20, 50, 100]

function formatFileSize(fileSize: number) {
  if (!fileSize || fileSize <= 0) {
    return "-"
  }

  if (fileSize >= 1024 * 1024 * 1024) {
    return `${(fileSize / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  if (fileSize >= 1024 * 1024) {
    return `${(fileSize / (1024 * 1024)).toFixed(2)} MB`
  }

  return `${Math.max(1, Math.round(fileSize / 1024))} KB`
}

function isJobEnqueueResult(value: unknown): value is AdminAttachmentJobEnqueueResult {
  if (!value || typeof value !== "object") {
    return false
  }

  const item = value as Partial<AdminAttachmentJobEnqueueResult>
  return !!item.job
    && typeof item.job === "object"
    && typeof item.job.id === "string"
    && typeof item.job.status === "string"
}

function isJobRepairResult(value: unknown): value is AdminAttachmentJobRepairResult {
  if (!value || typeof value !== "object") {
    return false
  }

  const item = value as Partial<AdminAttachmentJobRepairResult>
  return Array.isArray(item.repairedJobs) && Array.isArray(item.removedBackgroundJobs)
}

function normalizeReferenceFilter(value: string): AdminAttachmentReferenceFilter {
  return value === "REFERENCED" || value === "ORPHAN" ? value : "ALL"
}

export function AdminAttachmentManager({ data }: AdminAttachmentManagerProps) {
  const [filters, setFilters] = useState({
    keyword: data.filters.keyword,
    bucketType: data.filters.bucketType,
    referenceStatus: data.filters.referenceStatus,
    pageSize: String(data.pagination.pageSize),
  })

  useEffect(() => {
    setFilters({
      keyword: data.filters.keyword,
      bucketType: data.filters.bucketType,
      referenceStatus: data.filters.referenceStatus,
      pageSize: String(data.pagination.pageSize),
    })
  }, [data])

  const { isPending, runMutation } = useAdminMutation()
  const activeScan = data.scan.activeScan
  const activeCleanup = data.scan.activeCleanup
  const hasSnapshot = data.scan.snapshot.total > 0
  const scanInProgress = !!activeScan
  const cleanupInProgress = !!activeCleanup
  const canStartScan = !scanInProgress && !cleanupInProgress
  const canStartCleanup = hasSnapshot && canStartScan
  const hasQueuedJob = activeScan?.status === "QUEUED" || activeCleanup?.status === "QUEUED"

  const bucketOptions = useMemo(() => [
    { value: "ALL", label: "全部目录" },
    ...data.bucketOptions.map((item) => ({ value: item.value, label: `${item.label} (${item.count})` })),
  ], [data.bucketOptions])

  const activeFilterBadges = useMemo(() => {
    const badges: string[] = []
    if (filters.keyword.trim()) {
      badges.push(`关键词: ${filters.keyword.trim()}`)
    }
    if (filters.bucketType !== "ALL") {
      badges.push(`目录: ${filters.bucketType}`)
    }
    if (filters.referenceStatus !== "ALL") {
      badges.push(`引用: ${referenceOptions.find((item) => item.value === filters.referenceStatus)?.label ?? filters.referenceStatus}`)
    }
    if (filters.pageSize !== "20") {
      badges.push(`每页: ${filters.pageSize} 条`)
    }

    return badges
  }, [filters])

  const baseQuery = new URLSearchParams({
    tab: "attachments",
    attachmentKeyword: data.filters.keyword,
    attachmentBucketType: data.filters.bucketType,
    attachmentReferenceStatus: data.filters.referenceStatus,
    attachmentPageSize: String(data.pagination.pageSize),
  })

  function buildHref(next: Partial<Record<string, string>>) {
    const query = new URLSearchParams(baseQuery)
    Object.entries(next).forEach(([key, value]) => {
      query.set(key, value ?? "")
    })

    return `/admin?${query.toString()}`
  }

  function buildPageHref(page: number) {
    return buildHref({ attachmentPage: String(page) })
  }

  function startReferenceScan() {
    runMutation({
      mutation: () => adminPost<AdminAttachmentJobEnqueueResult>("/api/admin/attachments", {
        action: "start-reference-scan",
        keyword: data.filters.keyword,
        bucketType: data.filters.bucketType,
      }, {
        validateData: isJobEnqueueResult,
        invalidDataMessage: "后台任务返回格式不正确",
        defaultErrorMessage: "附件引用深度扫描启动失败",
      }),
      successTitle: "扫描已入队",
      errorTitle: "启动失败",
      refreshRouter: true,
    })
  }

  function runCleanup() {
    runMutation({
      mutation: () => adminPost<AdminAttachmentJobEnqueueResult>("/api/admin/attachments", {
        action: "cleanup-orphans",
        limit: 100,
        keyword: data.filters.keyword,
        bucketType: data.filters.bucketType,
      }, {
        validateData: isJobEnqueueResult,
        invalidDataMessage: "后台任务返回格式不正确",
        defaultErrorMessage: "无引用资源清理启动失败",
      }),
      successTitle: "清理已入队",
      errorTitle: "启动失败",
      refreshRouter: true,
    })
  }

  function repairStuckJobs() {
    runMutation({
      mutation: () => adminPost<AdminAttachmentJobRepairResult>("/api/admin/attachments", {
        action: "repair-stuck-jobs",
      }, {
        validateData: isJobRepairResult,
        invalidDataMessage: "后台任务恢复返回格式不正确",
        defaultErrorMessage: "解除卡住任务失败",
      }),
      successTitle: "任务已解除",
      errorTitle: "解除失败",
      refreshRouter: true,
    })
  }

  function deleteOne(uploadId: string) {
    runMutation({
      mutation: () => adminPost("/api/admin/attachments", {
        action: "delete-orphan",
        uploadId,
      }, {
        defaultErrorMessage: "删除资源失败",
      }),
      successTitle: "删除成功",
      errorTitle: "删除失败",
      refreshRouter: true,
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <AdminSummaryStrip
        items={[
          { label: "上传资源", value: data.summary.total, icon: <FileArchive className="h-4 w-4" /> },
          { label: "快照已引用", value: data.summary.referenced, tone: "emerald", hint: "来自最近一次后台扫描" },
          { label: "快照无引用", value: data.summary.orphan, tone: data.summary.orphan > 0 ? "amber" : "slate", hint: "筛选和批量清理读取快照" },
          { label: "占用空间", value: formatFileSize(data.summary.totalBytes), tone: "sky", hint: "当前筛选结果合计" },
        ]}
      />

      <AdminFilterCard
        title="附件管理"
        description="集中查看上传记录和引用来源；当前列表实时识别当前页，已引用/无引用筛选读取后台扫描快照。"
        badge={<Badge variant="secondary" className="rounded-full">当前 {formatNumber(data.pagination.total)} 条</Badge>}
        activeBadges={activeFilterBadges}
      >
        <form className="grid gap-2 xl:grid-cols-[minmax(176px,1.7fr)_140px_140px_96px_auto] xl:items-end">
          <input type="hidden" name="tab" value="attachments" />
          <input type="hidden" name="attachmentPage" value="1" />
          <input type="hidden" name="attachmentBucketType" value={filters.bucketType} />
          <input type="hidden" name="attachmentReferenceStatus" value={filters.referenceStatus} />
          <input type="hidden" name="attachmentPageSize" value={filters.pageSize} />

          <AdminFilterSearchField
            label="关键词"
            name="attachmentKeyword"
            value={filters.keyword}
            onChange={(value) => setFilters((current) => ({ ...current, keyword: value }))}
            placeholder="文件名 / MIME / URL / 用户 / ID"
          />
          <AdminFilterSelectField
            label="上传目录"
            value={filters.bucketType}
            onValueChange={(value) => setFilters((current) => ({ ...current, bucketType: value }))}
            options={bucketOptions}
          />
          <AdminFilterSelectField
            label="引用状态"
            value={filters.referenceStatus}
            onValueChange={(value) => setFilters((current) => ({ ...current, referenceStatus: normalizeReferenceFilter(value) }))}
            options={referenceOptions}
          />
          <AdminFilterSelectField
            label="每页"
            value={filters.pageSize}
            onValueChange={(value) => setFilters((current) => ({ ...current, pageSize: value }))}
            options={pageSizeOptions.map((item) => ({ value: String(item), label: `${item} 条` }))}
          />
          <AdminFilterActions
            submitLabel="筛选"
            submitIcon={<Filter className="h-3.5 w-3.5" />}
            resetHref="/admin?tab=attachments"
          />
        </form>
      </AdminFilterCard>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>引用扫描与清理</CardTitle>
          <CardDescription>深度引用扫描和批量清理都在后台执行；清理会基于快照取候选，并在删除每个资源前再次深度校验。</CardDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="outline" className="rounded-full" disabled={isPending || !canStartScan} onClick={startReferenceScan}>
              {isPending && !cleanupInProgress ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <RefreshCw data-icon="inline-start" />}
              开始深度扫描
            </Button>
            <Button type="button" variant="destructive" className="rounded-full" disabled={isPending || !canStartCleanup} onClick={runCleanup}>
              {isPending && !scanInProgress ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Trash2 data-icon="inline-start" />}
              后台清理无引用
            </Button>
            <Button type="button" variant="outline" className="rounded-full" disabled={isPending || !hasQueuedJob} onClick={repairStuckJobs}>
              {isPending && hasQueuedJob ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <RefreshCw data-icon="inline-start" />}
              解除卡住任务
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 py-3 md:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">引用快照</span>
              <Badge variant={hasSnapshot ? "secondary" : "outline"} className="rounded-full">
                {hasSnapshot ? "可用" : "未生成"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="rounded-full">总计 {formatNumber(data.scan.snapshot.total)}</Badge>
              <Badge variant="outline" className="rounded-full">已引用 {formatNumber(data.scan.snapshot.referenced)}</Badge>
              <Badge variant="outline" className="rounded-full">无引用 {formatNumber(data.scan.snapshot.orphan)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {data.scan.snapshot.latestScannedAtText ? `最近扫描 ${data.scan.snapshot.latestScannedAtText}` : "先启动一次后台深度扫描，再使用已引用/无引用筛选和批量清理。"}
            </p>
          </div>
          <AttachmentJobCard title="扫描任务" job={activeScan ?? data.scan.latestScan} emptyText="暂无扫描任务" />
          <AttachmentJobCard title="清理任务" job={activeCleanup ?? data.scan.latestCleanup} emptyText="暂无清理任务" />
        </CardContent>
      </Card>

      <Card>
        {data.rows.length > 0 ? (
          <AdminPaginationBar
            pagination={data.pagination}
            buildPageHref={buildPageHref}
            itemLabel="条资源"
            className="border-b border-border px-4 py-3"
          />
        ) : null}
        <CardContent className="px-0 py-0">
          {data.rows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {data.filters.referenceStatus !== "ALL" && !hasSnapshot
                ? "还没有引用快照。请先启动后台深度扫描，扫描完成后再筛选已引用或无引用。"
                : "当前筛选条件下没有上传资源。"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[220px]">文件</TableHead>
                  <TableHead className="w-[140px]">目录 / 类型</TableHead>
                  <TableHead className="w-[160px]">上传人</TableHead>
                  <TableHead className="w-[160px]">引用</TableHead>
                  <TableHead>路径</TableHead>
                  <TableHead className="w-[120px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="align-top">
                      <div className="min-w-0 space-y-1">
                        <div className="line-clamp-1 text-sm font-medium">{item.originalName}</div>
                        <div className="truncate text-xs text-muted-foreground">{item.fileName}</div>
                        <div className="text-xs text-muted-foreground">{formatFileSize(item.fileSize)} · {formatDateTime(item.createdAt)}</div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <Badge variant="secondary" className="rounded-full">{item.bucketType}</Badge>
                        <div className="truncate text-xs text-muted-foreground">{item.mimeType}</div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="min-w-0 space-y-1">
                        <div className="truncate text-sm font-medium">{item.userName}</div>
                        <div className="truncate text-xs text-muted-foreground">{item.userHandle}</div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <Badge className={item.referenceStatus === "REFERENCED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"}>
                          {item.referenceStatus === "REFERENCED" ? `已引用 ${item.referenceCount}` : "无引用"}
                        </Badge>
                        <div className="line-clamp-2 text-xs text-muted-foreground">
                          {item.referenceSources.length > 0 ? item.referenceSources.join(" / ") : "暂无引用来源"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="min-w-0 space-y-1">
                        <Link href={item.urlPath} target="_blank" className="line-clamp-1 text-sm font-medium hover:underline">
                          {item.urlPath}
                        </Link>
                        <div className="line-clamp-1 text-xs text-muted-foreground">{item.storagePath}</div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={item.urlPath} target="_blank" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full px-2")}>
                          <ExternalLink />
                        </Link>
                        <Button type="button" variant="destructive" size="sm" className="rounded-full px-2" disabled={isPending || item.referenceStatus !== "ORPHAN"} onClick={() => deleteOne(item.id)}>
                          <Trash2 />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter>
          <AdminPaginationBar
            pagination={data.pagination}
            buildPageHref={buildPageHref}
            itemLabel="条资源"
            className="w-full"
          />
        </CardFooter>
      </Card>
    </div>
  )
}

function AttachmentJobCard({
  title,
  job,
  emptyText,
}: {
  title: string
  job: AdminAttachmentReferenceScanJobSummary | null
  emptyText: string
}) {
  if (!job) {
    return (
      <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{title}</span>
          <Badge variant="outline" className="rounded-full">空闲</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <Badge variant={getJobStatusBadgeVariant(job.status)} className="rounded-full">
          {getJobStatusLabel(job.status)}
        </Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(job.progressPercent, job.status === "RUNNING" ? 4 : 0)}%` }} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="rounded-full">进度 {formatNumber(job.progressPercent)}%</Badge>
        <Badge variant="outline" className="rounded-full">已扫 {formatNumber(job.scanned)} / {formatNumber(job.total)}</Badge>
        {job.kind === "SCAN" ? (
          <>
            <Badge variant="outline" className="rounded-full">已引用 {formatNumber(job.referenced)}</Badge>
            <Badge variant="outline" className="rounded-full">无引用 {formatNumber(job.orphan)}</Badge>
          </>
        ) : (
          <>
            <Badge variant="outline" className="rounded-full">删除记录 {formatNumber(job.deletedRecords)}</Badge>
            <Badge variant="outline" className="rounded-full">删除文件 {formatNumber(job.deletedFiles)}</Badge>
            {job.failed > 0 ? <Badge variant="destructive" className="rounded-full">跳过/失败 {formatNumber(job.failed)}</Badge> : null}
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {job.errorMessage
          ? job.errorMessage
          : job.finishedAtText
            ? `完成于 ${job.finishedAtText}`
            : job.startedAtText
              ? `开始于 ${job.startedAtText}`
              : `创建于 ${job.createdAtText}`}
      </p>
    </div>
  )
}

function getJobStatusLabel(status: AdminAttachmentReferenceScanJobSummary["status"]) {
  return {
    QUEUED: "排队中",
    RUNNING: "运行中",
    COMPLETED: "已完成",
    FAILED: "失败",
  }[status]
}

function getJobStatusBadgeVariant(status: AdminAttachmentReferenceScanJobSummary["status"]) {
  return status === "FAILED"
    ? "destructive"
    : status === "COMPLETED"
      ? "secondary"
      : "outline"
}

"use client"

import {
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import {
  GripVertical,
  ImageIcon,
  Info,
  Loader2,
  MessageSquareLock,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/rbutton"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useEditorFullscreen } from "@/hooks/use-editor-fullscreen"
import { cn } from "@/lib/utils"
import { formatCompactPointValue } from "@/lib/formatters"
import { getPostRewardPoolModeLabel } from "@/lib/post-reward-pool-config"

const DESKTOP_PANEL_COLLAPSED_STORAGE_KEY = "post-enhancements-panel-collapsed"
const DESKTOP_PANEL_WIDTH = 202

function DesktopActionCard({
  icon,
  title,
  summary,
  active = false,
  onClick,
  onClear,
  disabled = false,
}: {
  icon: ReactNode
  title: string
  summary: string
  active?: boolean
  onClick: () => void
  onClear?: () => void
  disabled?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-[16px] border bg-background/92 p-2 shadow-xs transition-colors",
        active ? "border-foreground/25" : "border-border",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="flex min-w-0 flex-1 items-center gap-2 text-left transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <span
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px]",
              active
                ? "bg-accent text-foreground"
                : "bg-secondary/70 text-muted-foreground",
            )}
          >
            {icon}
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-medium leading-4 text-foreground">
              {title}
            </span>
            <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">
              {summary}
            </span>
          </span>
        </button>
        {active && onClear && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            className="h-7 shrink-0 rounded-lg px-2 text-[10px]"
            onClick={onClear}
          >
            清空
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function DesktopToggleCard({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-2 rounded-[16px] border px-2.5 py-2.5 shadow-xs transition-colors",
        checked
          ? "border-foreground/25 bg-accent/70"
          : "border-border bg-background/90",
      )}
    >
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px]",
          checked
            ? "bg-background text-foreground"
            : "bg-secondary/70 text-muted-foreground",
        )}
      >
        <MessageSquareLock className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium leading-4 text-foreground">
          评论仅楼主可见
        </span>
        <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">
          {checked ? "已开启，仅楼主和管理员可见" : "默认公开显示"}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-border"
      />
    </label>
  )
}

function RewardPoolSummary({
  pointName,
  redPacketMode,
  redPacketGrantMode,
  redPacketTriggerType,
  jackpotInitialPoints,
  fixedRedPacketTotalPoints,
  postJackpotMinInitialPoints,
  postJackpotReplyIncrementPoints,
  postJackpotHitProbability,
}: {
  pointName: string
  redPacketMode: "RED_PACKET" | "JACKPOT"
  redPacketGrantMode: "FIXED" | "RANDOM"
  redPacketTriggerType: "REPLY" | "LIKE" | "FAVORITE"
  jackpotInitialPoints: string
  fixedRedPacketTotalPoints: number | null
  postJackpotMinInitialPoints: number
  postJackpotReplyIncrementPoints: number
  postJackpotHitProbability: number
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/25 px-4 py-3 text-xs leading-6 text-muted-foreground">
      {redPacketMode === "JACKPOT" ? (
        <>
          <p>
            当前已配置为聚宝盆：发帖时投入{" "}
            {formatCompactPointValue(Number(jackpotInitialPoints) || postJackpotMinInitialPoints)} {pointName}{" "}
            作为初始积分。
          </p>
          <p>
            首个有效回复会追加 {formatCompactPointValue(postJackpotReplyIncrementPoints)} {pointName}
            并按 {postJackpotHitProbability}% 概率抽奖{postJackpotHitProbability >= 100 ? "，有效回复会必中。" : "，后续回复改为随机小额追加且中奖概率递减。"}
          </p>
        </>
      ) : (
        <>
          <p>
            当前已配置为帖子红包：
            {redPacketTriggerType === "REPLY"
              ? "回复"
              : redPacketTriggerType === "LIKE"
                ? "点赞"
                : "收藏"}
            后触发发放。
          </p>
          <p>
            {redPacketGrantMode === "FIXED"
              ? `固定红包总计需要 ${formatCompactPointValue(fixedRedPacketTotalPoints ?? 0)} ${pointName}。`
              : "拼手气红包要求总积分不小于份数。"}
          </p>
        </>
      )}
    </div>
  )
}

export function DesktopResultsSummary({
  pointName,
  finalTags,
  onRemoveManualTag,
  redPacketEnabled,
  redPacketMode,
  redPacketGrantMode,
  redPacketTriggerType,
  jackpotInitialPoints,
  fixedRedPacketTotalPoints,
  postJackpotMinInitialPoints,
  postJackpotReplyIncrementPoints,
  postJackpotHitProbability,
}: {
  pointName: string
  finalTags: string[]
  onRemoveManualTag: (tag: string) => void
  redPacketEnabled: boolean
  redPacketMode: "RED_PACKET" | "JACKPOT"
  redPacketGrantMode: "FIXED" | "RANDOM"
  redPacketTriggerType: "REPLY" | "LIKE" | "FAVORITE"
  jackpotInitialPoints: string
  fixedRedPacketTotalPoints: number | null
  postJackpotMinInitialPoints: number
  postJackpotReplyIncrementPoints: number
  postJackpotHitProbability: number
}) {
  return (
    <>
      {finalTags.length > 0 ? (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {finalTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1"
            >
              <span>#{tag}</span>
              <button
                type="button"
                onClick={() => onRemoveManualTag(tag)}
                className="transition-opacity hover:opacity-70"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {redPacketEnabled ? (
        <RewardPoolSummary
          pointName={pointName}
          redPacketMode={redPacketMode}
          redPacketGrantMode={redPacketGrantMode}
          redPacketTriggerType={redPacketTriggerType}
          jackpotInitialPoints={jackpotInitialPoints}
          fixedRedPacketTotalPoints={fixedRedPacketTotalPoints}
          postJackpotMinInitialPoints={postJackpotMinInitialPoints}
          postJackpotReplyIncrementPoints={postJackpotReplyIncrementPoints}
          postJackpotHitProbability={postJackpotHitProbability}
        />
      ) : null}
    </>
  )
}

interface PostEnhancementsSectionProps {
  pointName: string
  rewardPoolEnabled: boolean
  collapsed?: boolean
  panelSide?: "left" | "right"
  stickyTop?: number
  onCollapseChange?: (collapsed: boolean) => void
  onPanelSideChange?: (side: "left" | "right") => void
  settings: {
    finalTags: string[]
    autoExtractedTags: string[]
    coverUploading: boolean
    coverPath: string
    commentsVisibleToAuthorOnly: boolean
    loginUnlockContent: string
    replyUnlockContent: string
    purchaseUnlockContent: string
    purchasePrice: string
    minViewLevel: string
    minViewVipLevel: string
    redPacketEnabled: boolean
    redPacketMode: "RED_PACKET" | "JACKPOT"
    redPacketGrantMode: "FIXED" | "RANDOM"
    redPacketTriggerType: "REPLY" | "LIKE" | "FAVORITE"
    jackpotInitialPoints: string
    fixedRedPacketTotalPoints: number | null
    postJackpotMinInitialPoints: number
    postJackpotReplyIncrementPoints: number
    postJackpotHitProbability: number
    rewardPoolEditable: boolean
    showAttachmentEntry: boolean
    attachmentCount: number
  }
  actions: {
    onOpenTagModal: () => void
    onOpenCoverModal: () => void
    onRemoveManualTag: (tag: string) => void
    onCoverClear: () => void
    onCommentsVisibleToAuthorOnlyChange: (checked: boolean) => void
    onOpenLoginModal: () => void
    onClearLoginUnlock: () => void
    onOpenReplyModal: () => void
    onClearReplyUnlock: () => void
    onOpenPurchaseModal: () => void
    onClearPurchaseUnlock: () => void
    onOpenViewLevelModal: () => void
    onClearViewLevel: () => void
    onOpenRewardPoolModal: () => void
    onClearRewardPool: () => void
    onRedPacketEnabledChange: (checked: boolean) => void
    onRedPacketModeChange: (mode: "RED_PACKET" | "JACKPOT") => void
    onRedPacketGrantModeChange: (mode: "FIXED" | "RANDOM") => void
    onRedPacketClaimOrderModeChange: (
      mode: "FIRST_COME_FIRST_SERVED" | "RANDOM",
    ) => void
    onRedPacketTriggerTypeChange: (type: "REPLY" | "LIKE" | "FAVORITE") => void
    onJackpotInitialPointsChange: (value: string) => void
    onRedPacketValueChange: (value: string) => void
    onRedPacketPacketCountChange: (value: string) => void
    onOpenAttachmentModal: () => void
  }
}

export function PostEnhancementsSection({
  pointName,
  rewardPoolEnabled,
  collapsed: externalCollapsed,
  panelSide: externalPanelSide = "right",
  stickyTop,
  onCollapseChange: externalOnCollapseChange,
  onPanelSideChange: externalOnPanelSideChange,
  settings,
  actions,
}: PostEnhancementsSectionProps) {
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [localCollapsed, setLocalCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const editorFullscreen = useEditorFullscreen()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isExternalControlled = externalCollapsed !== undefined
  const collapsed = isExternalControlled ? externalCollapsed : localCollapsed
  const panelSide = externalPanelSide
  const handleCollapseChange = isExternalControlled 
    ? (externalOnCollapseChange || (() => {})) 
    : setLocalCollapsed
  const handlePanelSideChange = externalOnPanelSideChange || (() => {})

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const viewportCenter = window.innerWidth / 2
      if (moveEvent.clientX < viewportCenter && panelSide === "right") {
        handlePanelSideChange("left")
      } else if (moveEvent.clientX > viewportCenter && panelSide === "left") {
        handlePanelSideChange("right")
      }
    }
    
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
    
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const {
    finalTags,
    autoExtractedTags,
    coverUploading,
    coverPath,
    commentsVisibleToAuthorOnly,
    loginUnlockContent,
    replyUnlockContent,
    purchaseUnlockContent,
    purchasePrice,
    minViewLevel,
    minViewVipLevel,
    redPacketEnabled,
    redPacketMode,
    redPacketGrantMode,
    redPacketTriggerType,
    jackpotInitialPoints,
    fixedRedPacketTotalPoints,
    postJackpotMinInitialPoints,
    postJackpotReplyIncrementPoints,
    postJackpotHitProbability,
    rewardPoolEditable,
    showAttachmentEntry,
    attachmentCount,
  } = settings

  const hasDesktopSummary = finalTags.length > 0 || redPacketEnabled
  const rewardPoolDesktopSummary = redPacketEnabled
    ? redPacketMode === "JACKPOT"
      ? `${getPostRewardPoolModeLabel(redPacketMode)} / 初始 ${
          formatCompactPointValue(Number(jackpotInitialPoints) || postJackpotMinInitialPoints)
        }`
      : `${getPostRewardPoolModeLabel(redPacketMode)} / ${
          redPacketTriggerType === "REPLY"
            ? "回复"
            : redPacketTriggerType === "LIKE"
              ? "点赞"
              : "收藏"
        }`
    : "未配置"
  const tagSummary =
    finalTags.length > 0
      ? `已选 ${finalTags.length} 个`
      : autoExtractedTags.length > 0
        ? `候选 ${autoExtractedTags.length} 个`
        : "提取候选标签"
  const attachmentSummary =
    attachmentCount > 0 ? `已添加 ${attachmentCount} 项` : "未配置附件"
  const coverSummary = coverUploading
    ? "上传中..."
    : coverPath.trim()
      ? "已设置"
      : "自动提取"
  const loginSummary = loginUnlockContent.trim() ? "已配置" : "未配置"
  const replySummary = replyUnlockContent.trim() ? "已配置" : "未配置"
  const purchaseSummary = purchaseUnlockContent.trim()
    ? `${formatCompactPointValue(Number(purchasePrice) || 0)} / ${pointName}`
    : "未配置"
  const viewLevelSummary = Number(minViewVipLevel) > 0
    ? `VIP${Number(minViewVipLevel)}${
        Number(minViewLevel) > 0 ? ` / Lv.${Number(minViewLevel)}` : ""
      }`
    : Number(minViewLevel) > 0
      ? `Lv.${Number(minViewLevel)}`
      : "公开可见"
  const configuredCount = [
    finalTags.length > 0,
    redPacketEnabled,
    attachmentCount > 0,
    Boolean(coverPath.trim()),
    commentsVisibleToAuthorOnly,
    Boolean(loginUnlockContent.trim()),
    Boolean(replyUnlockContent.trim()),
    Boolean(purchaseUnlockContent.trim()),
    Number(minViewLevel) > 0 || Number(minViewVipLevel) > 0,
  ].filter(Boolean).length
  const openMobilePanelAction = (action: () => void) => () => {
    setMobilePanelOpen(false)
    action()
  }

  useEffect(() => {
    const storedCollapsed = window.localStorage.getItem(DESKTOP_PANEL_COLLAPSED_STORAGE_KEY)
    if (!isExternalControlled) {
      setLocalCollapsed(storedCollapsed === "true")
    }
  }, [isExternalControlled])

  useEffect(() => {
    if (!isExternalControlled && collapsed) {
      window.localStorage.setItem(DESKTOP_PANEL_COLLAPSED_STORAGE_KEY, "true")
      return
    }

    window.localStorage.removeItem(DESKTOP_PANEL_COLLAPSED_STORAGE_KEY)
  }, [collapsed, isExternalControlled])

  const desktopPanelContent = (
    <div className="flex max-h-[calc(100vh-10rem)] flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-background/88 p-2.5 shadow-[0_20px_48px_rgba(0,0,0,0.18)] backdrop-blur-md">
        <DesktopActionCard
          icon={<Sparkles className="h-4 w-4" />}
          title="标签提取"
          summary={
            finalTags.length > 0
              ? `已选 ${finalTags.length} 个`
              : autoExtractedTags.length > 0
                ? `候选 ${autoExtractedTags.length} 个`
                : "提取候选标签"
          }
          active={finalTags.length > 0}
          onClick={actions.onOpenTagModal}
        />

      {rewardPoolEnabled ? (
        <DesktopActionCard
          icon={<Sparkles className="h-4 w-4" />}
          title="帖子激励池"
          summary={rewardPoolDesktopSummary}
          active={redPacketEnabled}
          onClick={actions.onOpenRewardPoolModal}
          onClear={actions.onClearRewardPool}
          disabled={!rewardPoolEditable}
        />
      ) : null}

      {showAttachmentEntry ? (
        <DesktopActionCard
          icon={<Paperclip className="h-4 w-4" />}
          title="帖子附件"
          summary={attachmentCount > 0 ? `已添加 ${attachmentCount} 项` : "未配置附件"}
          active={attachmentCount > 0}
          onClick={actions.onOpenAttachmentModal}
        />
      ) : null}

      <DesktopActionCard
        icon={
          coverUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )
        }
        title="封面图"
        summary={coverUploading ? "上传中..." : coverPath.trim() ? "已设置" : "自动提取"}
        active={Boolean(coverPath.trim())}
        onClick={actions.onOpenCoverModal}
        onClear={actions.onCoverClear}
      />

      <DesktopToggleCard
        checked={commentsVisibleToAuthorOnly}
        onChange={actions.onCommentsVisibleToAuthorOnlyChange}
      />

      <DesktopActionCard
        icon={<MessageSquareLock className="h-4 w-4" />}
        title="登录后可看"
        summary={loginUnlockContent.trim() ? "已配置" : "未配置"}
        active={Boolean(loginUnlockContent.trim())}
        onClick={actions.onOpenLoginModal}
        onClear={actions.onClearLoginUnlock}
      />

      <DesktopActionCard
        icon={<MessageSquareLock className="h-4 w-4" />}
        title="回复后可看"
        summary={replyUnlockContent.trim() ? "已配置" : "未配置"}
        active={Boolean(replyUnlockContent.trim())}
        onClick={actions.onOpenReplyModal}
        onClear={actions.onClearReplyUnlock}
      />

      <DesktopActionCard
        icon={<Info className="h-4 w-4" />}
        title="购买后可看"
        summary={
          purchaseUnlockContent.trim() ? `${formatCompactPointValue(Number(purchasePrice) || 0)} / ${pointName}` : "未配置"
        }
        active={Boolean(purchaseUnlockContent.trim())}
        onClick={actions.onOpenPurchaseModal}
        onClear={actions.onClearPurchaseUnlock}
      />

      <DesktopActionCard
        icon={<Info className="h-4 w-4" />}
        title="整帖门槛"
        summary={
          Number(minViewVipLevel) > 0
            ? `VIP${Number(minViewVipLevel)}${
                Number(minViewLevel) > 0 ? ` / Lv.${Number(minViewLevel)}` : ""
              }`
            : Number(minViewLevel) > 0
              ? `Lv.${Number(minViewLevel)}`
              : "公开可见"
        }
        active={Number(minViewLevel) > 0 || Number(minViewVipLevel) > 0}
        onClick={actions.onOpenViewLevelModal}
        onClear={actions.onClearViewLevel}
      />
    </div>
  )

  return (
    <>
      {mounted ? createPortal(
        <div className="min-[1240px]:hidden">
          <button
            type="button"
            aria-label="打开功能区"
            title="打开功能区"
            onClick={() => setMobilePanelOpen(true)}
            className="fixed right-3 top-1/2 z-[10000] inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/92 text-foreground shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-md transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
          <PanelRightOpen className="h-5 w-5" />
          {configuredCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background">
              {configuredCount > 9 ? "9+" : configuredCount}
            </span>
          ) : null}
        </button>

        <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
          <SheetContent
            side="right"
            className="border-border bg-background p-0 text-foreground sm:max-w-md"
          >
            <SheetHeader className="border-b border-border/70 pr-12">
              <SheetTitle>功能区</SheetTitle>
            </SheetHeader>

            <div className="flex h-full flex-col overflow-y-auto px-4 pb-6">
              <div className="space-y-2 pt-4">
                <DesktopActionCard
                  icon={<Sparkles className="h-4 w-4" />}
                  title="标签提取"
                  summary={tagSummary}
                  active={finalTags.length > 0}
                  onClick={openMobilePanelAction(actions.onOpenTagModal)}
                />

                {rewardPoolEnabled ? (
                  <DesktopActionCard
                    icon={<Sparkles className="h-4 w-4" />}
                    title="帖子激励池"
                    summary={rewardPoolDesktopSummary}
                    active={redPacketEnabled}
                    onClick={openMobilePanelAction(actions.onOpenRewardPoolModal)}
                    onClear={actions.onClearRewardPool}
                    disabled={!rewardPoolEditable}
                  />
                ) : null}

                {showAttachmentEntry ? (
                  <DesktopActionCard
                    icon={<Paperclip className="h-4 w-4" />}
                    title="帖子附件"
                    summary={attachmentSummary}
                    active={attachmentCount > 0}
                    onClick={openMobilePanelAction(actions.onOpenAttachmentModal)}
                  />
                ) : null}

                <DesktopActionCard
                  icon={
                    coverUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImageIcon className="h-4 w-4" />
                    )
                  }
                  title="封面图"
                  summary={coverSummary}
                  active={Boolean(coverPath.trim())}
                  onClick={openMobilePanelAction(actions.onOpenCoverModal)}
                  onClear={actions.onCoverClear}
                />

                <DesktopToggleCard
                  checked={commentsVisibleToAuthorOnly}
                  onChange={actions.onCommentsVisibleToAuthorOnlyChange}
                />

                <DesktopActionCard
                  icon={<MessageSquareLock className="h-4 w-4" />}
                  title="登录后可看"
                  summary={loginSummary}
                  active={Boolean(loginUnlockContent.trim())}
                  onClick={openMobilePanelAction(actions.onOpenLoginModal)}
                  onClear={actions.onClearLoginUnlock}
                />

                <DesktopActionCard
                  icon={<MessageSquareLock className="h-4 w-4" />}
                  title="回复后可看"
                  summary={replySummary}
                  active={Boolean(replyUnlockContent.trim())}
                  onClick={openMobilePanelAction(actions.onOpenReplyModal)}
                  onClear={actions.onClearReplyUnlock}
                />

                <DesktopActionCard
                  icon={<Info className="h-4 w-4" />}
                  title="购买后可看"
                  summary={purchaseSummary}
                  active={Boolean(purchaseUnlockContent.trim())}
                  onClick={openMobilePanelAction(actions.onOpenPurchaseModal)}
                  onClear={actions.onClearPurchaseUnlock}
                />

                <DesktopActionCard
                  icon={<Info className="h-4 w-4" />}
                  title="整帖门槛"
                  summary={viewLevelSummary}
                  active={Number(minViewLevel) > 0 || Number(minViewVipLevel) > 0}
                  onClick={openMobilePanelAction(actions.onOpenViewLevelModal)}
                  onClear={actions.onClearViewLevel}
                />
              </div>

              {finalTags.length > 0 ? (
                <div className="mt-5 rounded-[18px] border border-border bg-card/60 p-3">
                  <p className="text-xs font-medium text-foreground">当前标签</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {finalTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1"
                      >
                        <span>#{tag}</span>
                        <button
                          type="button"
                          onClick={() => actions.onRemoveManualTag(tag)}
                          className="transition-opacity hover:opacity-70"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {redPacketEnabled ? (
                <div className="mt-5">
                  <RewardPoolSummary
                    pointName={pointName}
                    redPacketMode={redPacketMode}
                    redPacketGrantMode={redPacketGrantMode}
                    redPacketTriggerType={redPacketTriggerType}
                    jackpotInitialPoints={jackpotInitialPoints}
                    fixedRedPacketTotalPoints={fixedRedPacketTotalPoints}
                    postJackpotMinInitialPoints={postJackpotMinInitialPoints}
                    postJackpotReplyIncrementPoints={postJackpotReplyIncrementPoints}
                    postJackpotHitProbability={postJackpotHitProbability}
                  />
                </div>
              ) : null}
            </div>
          </SheetContent>
          </Sheet>
        </div>,
        document.body
      ) : null}

      {collapsed ? (
        mounted ? createPortal(
          <button
            type="button"
            aria-label="展开功能区"
            title="展开功能区"
            onClick={() => handleCollapseChange(false)}
            className={cn(
              "hidden min-[1220px]:flex min-[1220px]:fixed min-[1220px]:top-1/2 min-[1220px]:-translate-y-1/2 min-[1220px]:z-[10000] h-12 w-12 items-center justify-center rounded-full border border-border bg-background/92 text-foreground shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-md transition-transform hover:scale-[1.03] active:scale-[0.98]",
              panelSide === "left" ? "left-[max(1rem,calc(50%-648px))]" : "right-[max(1rem,calc(50%-648px))]",
            )}
          >
            <PanelRightOpen className="size-5" />
            {configuredCount > 0 ? (
              <span className={cn(
                "absolute inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background",
                panelSide === "left" ? "-right-1 -top-1" : "-left-1 -top-1",
              )}>
                {configuredCount > 9 ? "9+" : configuredCount}
              </span>
            ) : null}
          </button>,
          document.body
        ) : null
      ) : editorFullscreen ? (
        mounted ? createPortal(
          <div
            className={cn(
              "hidden min-[1220px]:block min-[1220px]:fixed min-[1220px]:top-1/2 min-[1220px]:-translate-y-1/2 min-[1220px]:z-[10000] w-[200px]",
              panelSide === "left" ? "left-[max(1rem,calc(50%-792px))]" : "right-[max(1rem,calc(50%-792px))]",
            )}
          >
          <div className="rounded-xl border border-border bg-background/92 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <button
                type="button"
                aria-label="拖拽移动功能区"
                title="拖拽移动功能区"
                className="cursor-grab active:cursor-grabbing opacity-60 hover:opacity-100"
                onMouseDown={handleDragStart}
              >
                <GripVertical className="size-4" />
              </button>
              <span className="text-xs font-medium">{configuredCount > 0 ? `功能区 (${configuredCount})` : "功能区"}</span>
              <button
                type="button"
                onClick={() => handlePanelSideChange(panelSide === "left" ? "right" : "left")}
                className="ml-auto transition-transform hover:rotate-180"
              >
                {panelSide === "left" ? <PanelRightOpen className="size-4" /> : <PanelRightClose className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => handleCollapseChange(true)}
              >
                <X className="size-4" />
              </button>
            </div>
            
            {hasDesktopSummary ? (
              <div className="mb-4 space-y-4 p-3">
                <DesktopResultsSummary
                  pointName={pointName}
                  finalTags={finalTags}
                  onRemoveManualTag={actions.onRemoveManualTag}
                  redPacketEnabled={redPacketEnabled}
                  redPacketMode={redPacketMode}
                  redPacketGrantMode={redPacketGrantMode}
                  redPacketTriggerType={redPacketTriggerType}
                  jackpotInitialPoints={jackpotInitialPoints}
                  fixedRedPacketTotalPoints={fixedRedPacketTotalPoints}
                  postJackpotMinInitialPoints={postJackpotMinInitialPoints}
                  postJackpotReplyIncrementPoints={postJackpotReplyIncrementPoints}
                  postJackpotHitProbability={postJackpotHitProbability}
                />
              </div>
            ) : null}

            {desktopPanelContent}
          </div>
          </div>,
          document.body
        ) : null
      ) : (
        <div className="w-[200px]">
          <div className="rounded-xl border border-border bg-background/92 shadow-[0_16px_40px_rgba(0,0,0,0.18)] backdrop-blur-md">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <button
                type="button"
                aria-label="拖拽移动功能区"
                title="拖拽移动功能区"
                className="cursor-grab active:cursor-grabbing opacity-60 hover:opacity-100"
                onMouseDown={handleDragStart}
              >
                <GripVertical className="size-4" />
              </button>
              <span className="text-xs font-medium">{configuredCount > 0 ? `功能区 (${configuredCount})` : "功能区"}</span>
              <button
                type="button"
                onClick={() => handlePanelSideChange(panelSide === "left" ? "right" : "left")}
                className="ml-auto transition-transform hover:rotate-180"
              >
                {panelSide === "left" ? <PanelRightOpen className="size-4" /> : <PanelRightClose className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => handleCollapseChange(true)}
              >
                <X className="size-4" />
              </button>
            </div>

            {desktopPanelContent}
          </div>
        </div>
      )}
    </>
  )
}
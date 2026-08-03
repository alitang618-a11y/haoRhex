import { getCurrentUserRecord } from "@/db/current-user"
import { incrementPostAttachmentDownloadCount } from "@/db/post-attachment-queries"
import { apiError, createRouteHandler, requireSearchParam } from "@/lib/api-route"
import { requireAccessiblePostAttachment } from "@/lib/post-attachments"
import { createDownloadResponseFromStoredUpload } from "@/lib/upload"
import { executeAddonActionHook } from "@/addons-host/runtime/hooks"

export const GET = createRouteHandler(async ({ request, currentUser }: {
  request: Request
  currentUser: Awaited<ReturnType<typeof getCurrentUserRecord>>
}) => {
  const attachmentId = requireSearchParam(request, "attachmentId", "缺少附件参数")
  const result = await requireAccessiblePostAttachment({
    attachmentId,
    currentUser,
  })

  if (result.attachment.sourceType !== "UPLOAD" || !result.attachment.upload?.storagePath) {
    apiError(400, "当前附件不是站内上传类型")
  }

  const viewerId = currentUser?.id != null ? String(currentUser.id) : null

  // 新增：下载前置钩子。activity_download 等插件可以在这里做额外校验（例如活跃度余额不足），
  // 抛出异常会被 createRouteHandler 捕获并转成错误响应，直接阻断本次下载。
  // 注意：插件如果想返回精确的 HTTP 状态码，需要抛出 @/lib/api-route 里 apiError() 产生的错误；
  // 普通 Error 会被兜底成 500 + "下载附件失败"。
  await executeAddonActionHook("postAttachment.download.before", {
    attachmentId: result.attachment.id,
    postId: result.attachment.postId,
    viewerId,
  }, { throwOnError: true })

  const response = await createDownloadResponseFromStoredUpload({
    storagePath: result.attachment.upload.storagePath,
    mimeType: result.attachment.mimeType ?? result.attachment.upload.mimeType,
    fileSize: result.attachment.fileSize ?? result.attachment.upload.fileSize,
    fileName: result.attachment.name,
    // 改动：原来是"构造完 Response 就立即计数"，现在挪到"文件流真正完整传输结束"才执行，
    // 客户端中断下载 / 连接异常关闭不会触发这里。
    onDownloadComplete: async () => {
      const updated = await incrementPostAttachmentDownloadCount(result.attachment.id)

      await executeAddonActionHook("postAttachment.download.success", {
        attachmentId: result.attachment.id,
        postId: result.attachment.postId,
        viewerId,
        downloadCount: updated.downloadCount,
      })
    },
  })

  return response
}, {
  errorMessage: "下载附件失败",
  logPrefix: "[api/post-attachments/download] unexpected error",
  buildContext: async (request) => ({
    request,
    currentUser: await getCurrentUserRecord(),
  }),
})

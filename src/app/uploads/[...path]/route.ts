import { createReadStream } from "fs"
import { stat } from "fs/promises"
import { Readable } from "stream"

import { notFound } from "next/navigation"

import { getSiteSettings } from "@/lib/site-settings"
import { buildUploadStoragePath } from "@/lib/upload-path"
import { getUploadMimeType, isSafeUploadPathSegments } from "@/lib/upload-rules"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

// ============================================================
// 安全加固：禁止付费附件目录走静态直链
// 目的：修复"附件裸直链绕过活跃度/付费校验、免费下载"漏洞。
// 说明：uploads 根目录下按 folder 分类存放（avatars / attachments / posts / comments / post-covers ...），
// 这个 [...path] 路由此前对所有子目录一视同仁、零鉴权地读盘吐流。
// 现在只把 attachments 目录（付费附件的实际存储目录，见 src/app/api/attachments/upload/route.ts 中 folder: "attachments"）
// 从这条静态直出通道里摘除，其余目录（头像、帖子图片等）行为完全不变。
// 风险点：
//   1) 如果站点上传目录被人为改成非 "attachments" 的自定义名字存放付费附件，这里的拦截会失效——
//      需要和 src/app/api/attachments/upload/route.ts 里的 folder 常量保持一致。
//   2) 拦截判断只看路径的第一段（BLOCKED_UPLOAD_FOLDERS.has(pathSegments[0])），
//      不会影响 /uploads/avatars/**、/uploads/posts/**、/uploads/comments/** 等其他目录的公开访问。
// 自测方法：
//   1) 部署后，登录一个没有购买/没有达到等级的账号，直接在浏览器地址栏访问
//      http://<host>/uploads/attachments/<任意已知附件文件名>
//      期望：返回 404（而不是文件内容）。
//   2) 访问 http://<host>/uploads/avatars/<任意头像文件名>，期望：正常显示图片，不受影响。
//   3) 通过正常业务流程（帖子详情页点击下载按钮，走 /api/post-attachments/download 接口）下载附件，
//      期望：满足购买/等级条件时能正常下载成功。
// ============================================================
const BLOCKED_UPLOAD_FOLDERS = new Set(["attachments"])

function isBlockedUploadPath(pathSegments: readonly string[]) {
  const firstSegment = pathSegments[0]
  return typeof firstSegment === "string" && BLOCKED_UPLOAD_FOLDERS.has(firstSegment)
}

async function resolveUploadFilePath(pathSegments: readonly string[]) {
  const settings = await getSiteSettings()

  try {
    const filePath = buildUploadStoragePath(settings.uploadLocalPath, ...pathSegments)
    const fileStat = await stat(filePath)

    if (!fileStat.isFile()) {
      return null
    }

    return {
      filePath,
      fileStat,
    }
  } catch {
    return null
  }
}

function buildUploadHeaders(fileName: string, fileSize: number, lastModified: Date) {
  return {
    "Content-Type": getUploadMimeType(fileName),
    "Content-Length": String(fileSize),
    "Cache-Control": "public, max-age=31536000, immutable",
    "Last-Modified": lastModified.toUTCString(),
  }
}

async function readUploadResponse(pathSegments: readonly string[]) {
  if (!isSafeUploadPathSegments(pathSegments)) {
    notFound()
  }

  // 新增：付费附件目录直接拒绝静态直链，强制走 /api/post-attachments/download 鉴权接口
  if (isBlockedUploadPath(pathSegments)) {
    notFound()
  }

  const resolvedFilePath = await resolveUploadFilePath(pathSegments)

  if (!resolvedFilePath) {
    notFound()
  }

  const fileName = pathSegments[pathSegments.length - 1]!

  return new Response(Readable.toWeb(createReadStream(resolvedFilePath.filePath)) as ReadableStream<Uint8Array>, {
    headers: buildUploadHeaders(fileName, resolvedFilePath.fileStat.size, resolvedFilePath.fileStat.mtime),
  })
}

interface UploadRouteProps {
  params: Promise<{
    path: string[]
  }>
}

export async function GET(_request: Request, props: UploadRouteProps) {
  const params = await props.params
  return readUploadResponse(params.path)
}

export async function HEAD(_request: Request, props: UploadRouteProps) {
  const params = await props.params
  if (!isSafeUploadPathSegments(params.path)) {
    notFound()
  }

  // 新增：与 GET 保持一致，HEAD 探测也不能泄露付费附件文件的存在性/大小
  if (isBlockedUploadPath(params.path)) {
    notFound()
  }

  const resolvedFilePath = await resolveUploadFilePath(params.path)

  if (!resolvedFilePath) {
    notFound()
  }

  const fileName = params.path[params.path.length - 1]!

  return new Response(null, {
    headers: buildUploadHeaders(fileName, resolvedFilePath.fileStat.size, resolvedFilePath.fileStat.mtime),
  })
}

import { createHash } from "crypto"
import { createReadStream, createWriteStream } from "fs"
import { mkdir, writeFile } from "fs/promises"
import path from "path"
import { Readable } from "stream"
import { pipeline } from "stream/promises"

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"

import { getServerSiteSettings } from "@/lib/site-settings"
import { resolveUploadBaseUrl } from "@/lib/upload-path"
import { normalizeUploadProvider } from "@/lib/upload-provider"
import { buildUploadStoragePath } from "@/lib/upload-path"
import { getPrimaryUploadExtensionForMimeType, getUploadMimeType } from "@/lib/upload-rules"
import { applyTextWatermarkToBuffer } from "@/lib/watermark-lib.server"
import {
  saveWithAddonUploadProvider,
  transformWithAddonUploadProviders,
} from "@/lib/addon-upload-providers"
import type { AddonUploadActor } from "@/addons-host/upload-types"
import { resolveWatermarkLogoBuffer } from "@/lib/watermark-logo.server"

export interface SavedUploadFile {
  fileName: string
  storagePath: string
  urlPath: string
  fileExt: string
  fileSize: number
  mimeType: string
  fileHash: string
}

export interface PreparedUploadFile {
  buffer: Buffer | null
  fileHash: string
  detectedMime: string
  fileSize: number
}

export interface SaveUploadedFileOptions {
  request?: Request
  actor?: AddonUploadActor | null
}

export interface PrepareUploadedFileOptions extends SaveUploadedFileOptions {
  folder?: string
  maxFileSizeBytes?: number
  settings?: WatermarkUploadSettings
}

type UploadSettings = Awaited<ReturnType<typeof getServerSiteSettings>>
type ImageWatermarkConfig = Pick<
  UploadSettings,
  "imageWatermarkEnabled"
  | "imageWatermarkTextEnabled"
  | "imageWatermarkText"
  | "imageWatermarkTextPosition"
  | "imageWatermarkTextTiled"
  | "imageWatermarkTextOpacity"
  | "imageWatermarkTextFontSize"
  | "imageWatermarkTextFontFamily"
  | "imageWatermarkFontAssets"
  | "imageWatermarkTextMargin"
  | "imageWatermarkTextColor"
  | "imageWatermarkLogoEnabled"
  | "imageWatermarkLogoPath"
  | "imageWatermarkLogoPosition"
  | "imageWatermarkLogoTiled"
  | "imageWatermarkLogoOpacity"
  | "imageWatermarkLogoMargin"
  | "imageWatermarkLogoScalePercent"
  | "imageWatermarkPosition"
  | "imageWatermarkTiled"
  | "imageWatermarkOpacity"
  | "imageWatermarkFontSize"
  | "imageWatermarkFontFamily"
  | "imageWatermarkMargin"
  | "imageWatermarkColor"
>
type WatermarkUploadSettings = ImageWatermarkConfig & Pick<
  UploadSettings,
  "uploadLocalPath"
>

const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
])
type WatermarkSupportedMimeType = "image/jpeg" | "image/png" | "image/webp" | "image/avif"
const WATERMARK_SUPPORTED_MIME_TYPES = new Set<WatermarkSupportedMimeType>(["image/jpeg", "image/png", "image/webp", "image/avif"])
const WATERMARK_APPLICABLE_FOLDERS = new Set(["posts", "comments", "post-covers"])
const DEFAULT_IMAGE_MAX_WIDTH = 16_384
const DEFAULT_IMAGE_MAX_HEIGHT = 16_384
const DEFAULT_IMAGE_MAX_PIXELS = 40_000_000

function readPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number.parseInt(process.env[name]?.trim() ?? "", 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function readUint24Le(buffer: Buffer, offset: number) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16)
}

function detectJpegDimensions(buffer: Buffer) {
  let offset = 2

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }

    const marker = buffer[offset + 1]
    offset += 2
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue
    }

    if (offset + 2 > buffer.length) {
      break
    }

    const segmentLength = buffer.readUInt16BE(offset)
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      break
    }

    if (
      (marker >= 0xc0 && marker <= 0xc3)
      || (marker >= 0xc5 && marker <= 0xc7)
      || (marker >= 0xc9 && marker <= 0xcb)
      || (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      }
    }

    offset += segmentLength
  }

  return null
}

function detectWebpDimensions(buffer: Buffer) {
  const chunkType = buffer.subarray(12, 16).toString("ascii")
  if (chunkType === "VP8X" && buffer.length >= 30) {
    return {
      width: readUint24Le(buffer, 24) + 1,
      height: readUint24Le(buffer, 27) + 1,
    }
  }

  if (chunkType === "VP8 " && buffer.length >= 30 && buffer[23] === 0x9d && buffer[24] === 0x01 && buffer[25] === 0x2a) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    }
  }

  if (chunkType === "VP8L" && buffer.length >= 25 && buffer[20] === 0x2f) {
    return {
      width: 1 + buffer[21] + ((buffer[22] & 0x3f) << 8),
      height: 1 + (buffer[22] >> 6) + (buffer[23] << 2) + ((buffer[24] & 0x0f) << 10),
    }
  }

  return null
}

function detectAvifDimensions(buffer: Buffer) {
  const marker = Buffer.from("ispe")
  let offset = buffer.indexOf(marker)

  while (offset >= 4) {
    const boxSize = buffer.readUInt32BE(offset - 4)
    if (boxSize >= 20 && offset + 16 <= buffer.length) {
      const width = buffer.readUInt32BE(offset + 8)
      const height = buffer.readUInt32BE(offset + 12)
      if (width > 0 && height > 0) {
        return { width, height }
      }
    }

    offset = buffer.indexOf(marker, offset + marker.length)
  }

  return null
}

function detectSvgDimensions(buffer: Buffer) {
  const svgTag = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("utf8").match(/<svg\b[^>]*>/i)?.[0]
  if (!svgTag) {
    return null
  }

  const readDimension = (name: string) => {
    const matched = svgTag.match(new RegExp(`\\b${name}\\s*=\\s*["']\\s*([0-9]+(?:\\.[0-9]+)?)`, "i"))
    return matched ? Number.parseFloat(matched[1]) : null
  }
  const width = readDimension("width")
  const height = readDimension("height")
  if (width && height) {
    return { width, height }
  }

  const viewBox = svgTag.match(/\bviewBox\s*=\s*["']\s*[-+]?\d+(?:\.\d+)?(?:\s+|,)\s*[-+]?\d+(?:\.\d+)?(?:\s+|,)\s*([0-9]+(?:\.\d+)?)(?:\s+|,)\s*([0-9]+(?:\.\d+)?)/i)
  return viewBox
    ? { width: Number.parseFloat(viewBox[1]), height: Number.parseFloat(viewBox[2]) }
    : null
}

function detectImageDimensions(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/png" && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }
  if (mimeType === "image/gif" && buffer.length >= 10) {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) }
  }
  if (mimeType === "image/jpeg") return detectJpegDimensions(buffer)
  if (mimeType === "image/webp") return detectWebpDimensions(buffer)
  if (mimeType === "image/avif") return detectAvifDimensions(buffer)
  if (mimeType === "image/svg+xml") return detectSvgDimensions(buffer)
  return null
}

function assertSafeImageDimensions(buffer: Buffer, mimeType: string) {
  const dimensions = detectImageDimensions(buffer, mimeType)
  if (!dimensions || !Number.isFinite(dimensions.width) || !Number.isFinite(dimensions.height) || dimensions.width <= 0 || dimensions.height <= 0) {
    throw new Error("无法读取图片尺寸，文件可能已损坏或格式不受支持")
  }

  const maxWidth = readPositiveIntegerEnv("UPLOAD_IMAGE_MAX_WIDTH", DEFAULT_IMAGE_MAX_WIDTH)
  const maxHeight = readPositiveIntegerEnv("UPLOAD_IMAGE_MAX_HEIGHT", DEFAULT_IMAGE_MAX_HEIGHT)
  const maxPixels = readPositiveIntegerEnv("UPLOAD_IMAGE_MAX_PIXELS", DEFAULT_IMAGE_MAX_PIXELS)
  const pixels = dimensions.width * dimensions.height

  if (dimensions.width > maxWidth || dimensions.height > maxHeight || pixels > maxPixels) {
    throw new Error(`图片尺寸过大，最大允许 ${maxWidth}×${maxHeight} 且不超过 ${maxPixels} 像素`)
  }
}

/**
 * 通过文件头魔数（magic bytes）检测真实 MIME 类型。
 * 不信任客户端传入的 file.type，防止伪造 Content-Type 绕过类型限制。
 */
function detectMimeTypeFromBytes(bytes: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg"
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png"
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif"
  // WebP: 52 49 46 46 ?? ?? ?? ?? 57 45 42 50
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp"
  // AVIF / HEIF: ftyp box at offset 4 with brand avif/heic/hei
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11])
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif"
  }
  return null
}

function detectSvgMimeType(buffer: Buffer): string | null {
  const text = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart()

  if (!text) {
    return null
  }

  if (/^(<\?xml[\s\S]*?\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!doctype\s+svg[\s\S]*?>\s*)*<svg\b/i.test(text)) {
    return "image/svg+xml"
  }

  return null
}

function shouldApplyImageWatermark(params: {
  detectedMime: string
  folder?: string
  settings?: ImageWatermarkConfig
}) {
  return Boolean(
    params.settings?.imageWatermarkEnabled
    && (
      (params.settings.imageWatermarkTextEnabled && params.settings.imageWatermarkText.trim())
      || (params.settings.imageWatermarkLogoEnabled && params.settings.imageWatermarkLogoPath.trim())
    )
    && params.folder
    && WATERMARK_APPLICABLE_FOLDERS.has(params.folder)
    && isWatermarkSupportedMimeType(params.detectedMime),
  )
}

function isWatermarkSupportedMimeType(mimeType: string): mimeType is WatermarkSupportedMimeType {
  return WATERMARK_SUPPORTED_MIME_TYPES.has(mimeType as WatermarkSupportedMimeType)
}

function resolveStoredFileExtension(fileName: string, mimeType: string) {
  const canonicalExtension = getPrimaryUploadExtensionForMimeType(mimeType)

  if (canonicalExtension) {
    return `.${canonicalExtension}`
  }

  return path.extname(fileName) || ".bin"
}

async function applyImageWatermarkToBuffer(params: {
  buffer: Buffer
  detectedMime: string
  folder?: string
  settings?: WatermarkUploadSettings
}) {
  if (!shouldApplyImageWatermark(params)) {
    return params.buffer
  }

  try {
    if (!isWatermarkSupportedMimeType(params.detectedMime)) {
      return params.buffer
    }

    return await applyTextWatermarkToBuffer({
      buffer: params.buffer,
      mimeType: params.detectedMime,
      settings: {
        color: params.settings!.imageWatermarkTextColor,
        fontAssets: params.settings!.imageWatermarkFontAssets,
        fontSize: params.settings!.imageWatermarkTextFontSize,
        fontFamily: params.settings!.imageWatermarkTextFontFamily,
        logo: {
          enabled: params.settings!.imageWatermarkLogoEnabled,
          buffer: await resolveWatermarkLogoBuffer({
            logoPath: params.settings!.imageWatermarkLogoPath,
            uploadLocalPath: params.settings!.uploadLocalPath,
          }),
          margin: params.settings!.imageWatermarkLogoMargin,
          opacity: params.settings!.imageWatermarkLogoOpacity,
          position: params.settings!.imageWatermarkLogoPosition,
          scalePercent: params.settings!.imageWatermarkLogoScalePercent,
          tiled: params.settings!.imageWatermarkLogoTiled,
        },
        logoScalePercent: params.settings!.imageWatermarkLogoScalePercent,
        margin: params.settings!.imageWatermarkTextMargin,
        opacity: params.settings!.imageWatermarkTextOpacity,
        position: params.settings!.imageWatermarkTextPosition,
        text: params.settings!.imageWatermarkText,
        textEnabled: params.settings!.imageWatermarkTextEnabled,
        tiled: params.settings!.imageWatermarkTextTiled,
        uploadLocalPath: params.settings!.uploadLocalPath,
      },
    })
  } catch (error) {
    console.warn("[upload] failed to apply image watermark, fallback to original image", error)
    return params.buffer
  }
}

function resolveGenericMimeType(file: File) {
  const browserMimeType = file.type?.trim().toLowerCase()

  if (browserMimeType && browserMimeType !== "application/octet-stream") {
    return browserMimeType
  }

  return getUploadMimeType(file.name)
}

function createNodeReadableFromFile(file: File) {
  return Readable.fromWeb(file.stream() as never)
}

async function readFileStreamToBuffer(file: File) {
  const chunks: Buffer[] = []

  for await (const chunk of createNodeReadableFromFile(file)) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

async function computeFileHash(file: File) {
  const hash = createHash("sha256")

  for await (const chunk of createNodeReadableFromFile(file)) {
    hash.update(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  return hash.digest("hex")
}

/**
 * 单次读取整文件，复用同一块 Buffer 完成哈希计算、类型检测和后续写盘。
 */
function prepareImageBuffer(buffer: Buffer): PreparedUploadFile {
  const detectedMime = detectMimeTypeFromBytes(buffer.subarray(0, 12)) ?? detectSvgMimeType(buffer)

  if (!detectedMime || !IMAGE_MIME_TYPES.has(detectedMime)) {
    throw new Error("图片处理插件返回了不受支持的图片格式")
  }

  assertSafeImageDimensions(buffer, detectedMime)

  return {
    buffer,
    fileHash: createHash("sha256").update(buffer).digest("hex"),
    detectedMime,
    fileSize: buffer.byteLength,
  }
}

export async function prepareUploadedFile(
  file: File,
  options?: PrepareUploadedFileOptions,
): Promise<PreparedUploadFile> {
  const sourceBuffer = await readFileStreamToBuffer(file)
  const detectedMime = detectMimeTypeFromBytes(sourceBuffer.subarray(0, 12)) ?? detectSvgMimeType(sourceBuffer)

  if (!detectedMime || !IMAGE_MIME_TYPES.has(detectedMime)) {
    throw new Error("仅支持上传常见图片格式文件")
  }

  assertSafeImageDimensions(sourceBuffer, detectedMime)

  const buffer = await applyImageWatermarkToBuffer({
    buffer: sourceBuffer,
    detectedMime,
    folder: options?.folder,
    settings: options?.settings,
  })

  const preparedFile = prepareImageBuffer(buffer)
  const transformedFile = await transformWithAddonUploadProviders({
    request: options?.request,
    actor: options?.actor,
    file,
    preparedFile,
    folder: options?.folder || "avatars",
    normalizeTransformedFile: ({ buffer: transformedBuffer }) => {
      const normalized = prepareImageBuffer(Buffer.from(transformedBuffer))
      if (options?.maxFileSizeBytes && normalized.fileSize > options.maxFileSizeBytes) {
        throw new Error("图片处理后的文件大小超过站点上传限制")
      }
      return normalized
    },
  })

  if (
    options?.maxFileSizeBytes
    && transformedFile.fileSize > options.maxFileSizeBytes
  ) {
    throw new Error("图片处理后的文件大小超过站点上传限制")
  }

  return {
    ...transformedFile,
    buffer: transformedFile.buffer ? Buffer.from(transformedFile.buffer) : null,
  }
}

/**
 * 以哈希值命名文件，保证同内容不重复写盘。
 * 文件名格式：{folder}-{hash8}.{ext}
 */
async function saveToLocal(
  file: File,
  preparedFile: PreparedUploadFile,
  folder: string,
  localPath: string,
  baseUrl: string | null | undefined,
): Promise<SavedUploadFile> {
  const ext = resolveStoredFileExtension(file.name, preparedFile.detectedMime)
  const shortHash = preparedFile.fileHash.slice(0, 16)
  const fileName = `${folder}-${shortHash}${ext}`
  const uploadRoot = buildUploadStoragePath(localPath, folder)
  const destinationPath = path.join(uploadRoot, fileName)

  await mkdir(uploadRoot, { recursive: true })

  if (preparedFile.buffer) {
    await writeFile(destinationPath, preparedFile.buffer)
  } else {
    await pipeline(
      createNodeReadableFromFile(file),
      createWriteStream(destinationPath),
    )
  }

  const resolvedBaseUrl = resolveUploadBaseUrl(baseUrl)
  const urlPath = `${resolvedBaseUrl}/${folder}/${fileName}`.replace(/\\/g, "/")

  return {
    fileName,
    storagePath: destinationPath,
    urlPath,
    fileExt: ext,
    fileSize: preparedFile.fileSize,
    mimeType: preparedFile.detectedMime,
    fileHash: preparedFile.fileHash,
  }
}

export async function prepareBinaryUploadedFile(
  file: File,
  options?: PrepareUploadedFileOptions,
): Promise<PreparedUploadFile> {
  const headerBuffer = Buffer.from(await file.slice(0, 4096).arrayBuffer())
  const detectedImageMime = detectMimeTypeFromBytes(headerBuffer.subarray(0, 12))
    ?? detectSvgMimeType(headerBuffer)

  if (detectedImageMime && IMAGE_MIME_TYPES.has(detectedImageMime)) {
    return prepareUploadedFile(file, options)
  }

  return {
    buffer: null,
    fileHash: await computeFileHash(file),
    detectedMime: resolveGenericMimeType(file),
    fileSize: file.size,
  }
}

function resolveS3ObjectKey(folder: string, fileName: string) {
  return `${folder}/${fileName}`.replace(/^\/+|\/+$/g, "")
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/g, "")
}

function resolveS3PublicUrl(settings: UploadSettings, objectKey: string) {
  const normalizedObjectKey = objectKey.replace(/^\/+/, "")
  if (settings.uploadBaseUrl?.trim()) {
    return `${trimTrailingSlash(settings.uploadBaseUrl.trim())}/${normalizedObjectKey}`
  }

  const endpoint = settings.uploadOssEndpoint?.trim()
  const bucket = settings.uploadOssBucket?.trim()
  if (!endpoint || !bucket) {
    throw new Error("对象存储访问地址无法生成，请补充资源访问基础 URL")
  }

  const parsedEndpoint = new URL(endpoint)
  if (settings.uploadS3ForcePathStyle) {
    return `${trimTrailingSlash(parsedEndpoint.toString())}/${bucket}/${normalizedObjectKey}`
  }

  parsedEndpoint.hostname = `${bucket}.${parsedEndpoint.hostname}`
  parsedEndpoint.pathname = `/${normalizedObjectKey}`
  parsedEndpoint.search = ""
  parsedEndpoint.hash = ""
  return parsedEndpoint.toString()
}

function validateOssSettings(settings: UploadSettings) {
  if (!settings.uploadOssBucket || !settings.uploadOssRegion || !settings.uploadOssEndpoint) {
    throw new Error("对象存储配置不完整，请先在后台上传设置中填写 Bucket、Region 和 Endpoint")
  }

  if (!settings.uploadS3AccessKeyId || !settings.uploadS3SecretAccessKey) {
    throw new Error("对象存储密钥不完整，请先在后台上传设置中填写 Access Key ID 和 Secret Access Key")
  }
}

function createS3Client(settings: UploadSettings) {
  validateOssSettings(settings)

  return new S3Client({
    region: settings.uploadOssRegion ?? "auto",
    endpoint: settings.uploadOssEndpoint ?? undefined,
    forcePathStyle: settings.uploadS3ForcePathStyle,
    credentials: {
      accessKeyId: settings.uploadS3AccessKeyId ?? "",
      secretAccessKey: settings.uploadS3SecretAccessKey ?? "",
    },
  })
}

async function saveToOss(
  file: File,
  preparedFile: PreparedUploadFile,
  folder: string,
  settings: UploadSettings,
): Promise<SavedUploadFile> {
  const ext = resolveStoredFileExtension(file.name, preparedFile.detectedMime)
  const shortHash = preparedFile.fileHash.slice(0, 16)
  const fileName = `${folder}-${shortHash}${ext}`
  const objectKey = resolveS3ObjectKey(folder, fileName)
  const client = createS3Client(settings)

  await client.send(new PutObjectCommand({
    Bucket: settings.uploadOssBucket ?? undefined,
    Key: objectKey,
    Body: preparedFile.buffer ?? createNodeReadableFromFile(file),
    ContentType: preparedFile.detectedMime,
    ContentLength: preparedFile.fileSize,
    CacheControl: "public, max-age=31536000, immutable",
  }))

  return {
    fileName,
    storagePath: `s3://${settings.uploadOssBucket}/${objectKey}`,
    urlPath: resolveS3PublicUrl(settings, objectKey),
    fileExt: ext,
    fileSize: preparedFile.fileSize,
    mimeType: preparedFile.detectedMime,
    fileHash: preparedFile.fileHash,
  }
}

export async function saveUploadedFile(
  file: File,
  preparedFile: PreparedUploadFile,
  folder = "avatars",
  options?: SaveUploadedFileOptions,
): Promise<SavedUploadFile> {
  const addonSaved = await saveWithAddonUploadProvider({
    request: options?.request,
    actor: options?.actor,
    file,
    preparedFile,
    folder,
  })

  if (addonSaved) {
    return addonSaved
  }

  const settings = await getServerSiteSettings()
  const uploadProvider = normalizeUploadProvider(settings.uploadProvider)

  if (uploadProvider === "local") {
    return saveToLocal(file, preparedFile, folder, settings.uploadLocalPath || "uploads", settings.uploadBaseUrl)
  }

  if (uploadProvider === "s3") {
    return saveToOss(file, preparedFile, folder, settings)
  }

  throw new Error(`不支持的上传策略：${settings.uploadProvider}`)
}

function parseS3StoragePath(storagePath: string) {
  const matched = storagePath.match(/^s3:\/\/([^/]+)\/(.+)$/i)

  if (!matched) {
    throw new Error("对象存储路径不合法")
  }

  return {
    bucket: matched[1],
    key: matched[2],
  }
}

async function readStoredUploadFile(params: {
  storagePath: string
  fileSize?: number | null
  urlPath?: string | null
}) {
  if (params.storagePath.startsWith("s3://")) {
    const settings = await getServerSiteSettings()
    const { bucket, key } = parseS3StoragePath(params.storagePath)
    const client = createS3Client(settings)
    const result = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }))

    if (!result.Body) {
      throw new Error("附件内容不存在")
    }

    if (typeof result.Body.transformToWebStream === "function") {
      return {
        body: result.Body.transformToWebStream(),
        fileSize: typeof result.ContentLength === "number" ? result.ContentLength : params.fileSize ?? null,
      }
    }

    if (result.Body instanceof Readable) {
      return {
        body: Readable.toWeb(result.Body) as ReadableStream<Uint8Array>,
        fileSize: typeof result.ContentLength === "number" ? result.ContentLength : params.fileSize ?? null,
      }
    }

    if (result.Body instanceof Blob) {
      return {
        body: result.Body.stream(),
        fileSize: typeof result.ContentLength === "number" ? result.ContentLength : params.fileSize ?? null,
      }
    }

    return {
      body: result.Body as ReadableStream<Uint8Array>,
      fileSize: typeof result.ContentLength === "number" ? result.ContentLength : params.fileSize ?? null,
    }
  }

  return {
    body: Readable.toWeb(createReadStream(params.storagePath)) as ReadableStream<Uint8Array>,
    fileSize: params.fileSize ?? null,
  }
}

function buildContentDisposition(fileName: string) {
  const sanitizedFileName = fileName.replace(/["\\\r\n]+/g, "_")
  const asciiFallbackFileName = sanitizedFileName
    .replace(/[^\x20-\x7E]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    || "download"
  const encodedFileName = encodeURIComponent(fileName).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${asciiFallbackFileName}"; filename*=UTF-8''${encodedFileName}`
}

// ============================================================
// 新增：完整传输感知的流包装
// 目的：只有当源文件流被完整读到 EOF（即已完整交给底层 HTTP 层发送）才触发 onDownloadComplete，
//       修复"客户端中断下载/连接异常关闭，仍然计入下载次数、仍然发放活跃度"的问题。
// 风险点：
//   1) onDownloadComplete 在最后一块数据之后、controller.close() 之前 await 执行，
//      会给流的收尾增加一次数据库自增操作的等待（通常个位数毫秒，可忽略）。
//   2) 这里判断的是"服务端把源文件读到 EOF"，并不是"客户端网络层已确认收到全部字节"——
//      这是 HTTP 流式响应在服务端能拿到的最强完整性信号，理论上仍存在极小概率的边界差异
//      （例如最后一个 TCP 包在传输中丢失），但已经比"响应构造后立即计数"精确得多。
//   3) 客户端主动中断（用户取消下载/关闭标签页/断网）会触发 ReadableStream.cancel()，
//      该分支明确跳过 onDownloadComplete，不计数、不发活跃度。
// ============================================================
function createCompletionAwareStream(
  source: ReadableStream<Uint8Array>,
  onDownloadComplete: () => Promise<void> | void,
): ReadableStream<Uint8Array> {
  const reader = source.getReader()
  let completed = false

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read()

      if (done) {
        if (!completed) {
          completed = true
          try {
            await onDownloadComplete()
          } catch (error) {
            console.error("[upload] onDownloadComplete 回调执行失败", error)
          }
        }
        controller.close()
        return
      }

      controller.enqueue(value)
    },
    async cancel(reason) {
      // 客户端提前中断连接：不触发 onDownloadComplete
      await reader.cancel(reason)
    },
  })
}

export async function createDownloadResponseFromStoredUpload(params: {
  storagePath: string
  mimeType?: string | null
  fileSize?: number | null
  fileName: string
  // 新增：可选的"完整下载完成"回调，仅在流被完整读完时触发一次
  onDownloadComplete?: () => Promise<void> | void
}) {
  const storedFile = await readStoredUploadFile({
    storagePath: params.storagePath,
    fileSize: params.fileSize,
  })
  const contentLength = Number.isFinite(params.fileSize)
    ? params.fileSize
    : storedFile.fileSize

  const responseBody = params.onDownloadComplete
    ? createCompletionAwareStream(storedFile.body, params.onDownloadComplete)
    : storedFile.body

  return new Response(responseBody, {
    headers: {
      "Content-Type": params.mimeType?.trim() || "application/octet-stream",
      ...(typeof contentLength === "number" ? { "Content-Length": String(contentLength) } : {}),
      "Content-Disposition": buildContentDisposition(params.fileName),
      "Cache-Control": "private, no-store",
    },
  })
}

export async function deleteStoredUploadFile(storagePath: string) {
  if (storagePath.startsWith("s3://")) {
    const settings = await getServerSiteSettings()
    const { bucket, key } = parseS3StoragePath(storagePath)
    const client = createS3Client(settings)

    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }))
    return
  }

  const { unlink } = await import("fs/promises")
  await unlink(storagePath)
}

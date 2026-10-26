import { auth } from "@/auth"
import { isDevMode } from "@/lib/require-auth"
import { getMailAttachment } from "@/lib/gmail"

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" }
// HTML や SVG は同一オリジンで実行させず、ダウンロードにする。
const INLINE_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "text/plain"])

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ messageId: string; attachmentId: string }> },
) {
  if (!isDevMode() && !(await auth())?.user) {
    return new Response("ログインが必要です", { status: 401, headers: PRIVATE_HEADERS })
  }
  const { messageId, attachmentId } = await params
  if (!/^[a-zA-Z0-9_-]+$/.test(messageId) || !/^0(?:\.\d+)*$/.test(attachmentId)) {
    return new Response("無効な添付ファイルです", { status: 400, headers: PRIVATE_HEADERS })
  }
  try {
    const attachment = await getMailAttachment(messageId, attachmentId)
    if (!attachment) return new Response("添付ファイルが見つかりません", { status: 404, headers: PRIVATE_HEADERS })
    const mimeType = attachment.mimeType.toLowerCase()
    const inline = INLINE_TYPES.has(mimeType)
    const filename = encodeURIComponent(attachment.filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
    return new Response(attachment.bytes, {
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": inline ? mimeType : "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="attachment"; filename*=UTF-8''${filename}`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      },
    })
  } catch (error) {
    console.error("[mail/attachment] 添付ファイル取得失敗", error)
    return new Response("添付ファイルを取得できませんでした。メール画面から再度開いてください。", { status: 502, headers: PRIVATE_HEADERS })
  }
}

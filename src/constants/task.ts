import type { TaskStatus } from "@/types/task"

// 初回レンダで取得するステータス。完了/中止は件数が多くなりがちなので、
// 該当カラムが画面に出たときに別途 fetch するようにし、初回コストを下げる。
export const INITIAL_STATUSES: TaskStatus[] = ["未着手", "進行中", "確認中", "一時中断"]

/** 優先度の並び順(Notion の select オプション順に一致させる) */
export const PRIORITY_ORDER = ["high", "medium", "low"] as const

/** 新規作成フォームで選べるステータス。終端状態は作成時には選ばせない。 */
export const CREATABLE_STATUSES: TaskStatus[] = ["未着手", "進行中", "確認中"]

/** 画像ファイルとみなす拡張子 */
export const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|avif)$/i

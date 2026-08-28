import * as notion from "@/lib/notion"
import type { TaskStore } from "./types"

/**
 * 既存の Notion 実装を TaskStore として見せるアダプタ。
 * ロジックは `src/lib/notion.ts` に置いたまま、呼び出し側だけを store 経由に寄せる。
 */
export const notionTaskStore: TaskStore = {
  getTasks:            notion.getTasks,
  getTask:             notion.getTask,
  createTask:          notion.createTask,
  updateTask:          notion.updateTask,
  getTagOptions:       notion.getTagOptions,
  getLocationOptions:  notion.getLocationOptions,
  getTaskBlocks:       notion.getTaskBlocks,
  updateTaskBlocks:    notion.updateTaskBlocks,
  getTaskComments:     notion.getTaskComments,
  createTaskComment:   notion.createTaskComment,
  uploadTaskAttachment: notion.uploadTaskAttachment,
  removeTaskAttachment: notion.removeTaskAttachment,
}

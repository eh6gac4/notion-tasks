import * as mock from "@/lib/mock-tasks"
import type { TaskStore } from "./types"

export const mockTaskStore: TaskStore = {
  async getTasks(options) { return mock.getMockTasks(options?.statuses) },
  async getTask(id) { return mock.getMockTask(id) ?? null },
  async createTask(input) { return mock.createMockTask(input) },
  async updateTask(id, input) {
    const task = mock.updateMockTask(id, input)
    if (!task) throw new Error(`Task not found: ${id}`)
    return task
  },
  async getTagOptions() { return mock.getMockTagOptions() },
  async getLocationOptions() { return ["自宅", "オフィス", "スーパー"] },
  async getTaskBlocks(id) { return mock.getMockTaskBlocks(id) },
  async updateTaskBlocks(id, markdown) { mock.updateMockTaskBlocks(id, markdown) },
  async getTaskComments(id) { return mock.getMockTaskComments(id) },
  async createTaskComment(id, text) { return mock.addMockTaskComment(id, text) },
  async uploadTaskAttachment(id, file) { return mock.addMockTaskAttachment(id, file) },
  async removeTaskAttachment(id, index) { return mock.removeMockTaskAttachment(id, index) },
}

"use client"

import type { Task } from "@/types/task"
import { TaskItem } from "./TaskItem"
import { TaskCreate } from "./TaskCreate"

export function TaskManager({ tasks }: { tasks: Task[] }) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {tasks.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-20">タスクがありません</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <li key={task.id}>
                  <TaskItem task={task} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-center text-xs text-gray-300 py-4 pb-24">{tasks.length}件</p>
        </div>
      </main>
      <TaskCreate />
    </div>
  )
}

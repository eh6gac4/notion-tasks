"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

const FILTERS = [
  { label: "進行中・未着手", key: "active" },
  { label: "未着手",         key: "todo" },
  { label: "進行中",         key: "doing" },
  { label: "確認中",         key: "review" },
  { label: "一時中断",       key: "paused" },
  { label: "すべて",         key: "all" },
]

export function FilterTabs({ initialFilter }: { initialFilter: string }) {
  const searchParams = useSearchParams()
  const current = searchParams.get("filter") ?? initialFilter

  return (
    <div className="flex gap-2 px-4 py-2.5 overflow-x-auto">
      {FILTERS.map((f) => (
        <Link
          key={f.key}
          href={`/?filter=${f.key}`}
          scroll={false}
          prefetch
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            f.key === current
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 active:bg-gray-200"
          }`}
        >
          {f.label}
        </Link>
      ))}
    </div>
  )
}

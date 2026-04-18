export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </header>

      {/* Filter skeleton */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
        <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>

      {/* Task list skeleton */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-2xl mx-auto">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
              <div
                className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"
                style={{ width: `${65 + (i % 3) * 12}%` }}
              />
              <div className="flex gap-2">
                <div className="h-5 w-14 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                <div className="h-5 w-10 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

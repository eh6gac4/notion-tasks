export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
        </div>
      </header>
      <div className="bg-white border-b border-gray-100 px-4 py-2.5 flex gap-2">
        {[80, 56, 56, 56].map((w, i) => (
          <div key={i} className={`h-8 w-${w} bg-gray-100 rounded-full animate-pulse`} />
        ))}
      </div>
      <main className="flex-1 max-w-2xl mx-auto w-full">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="px-4 py-4 border-b border-gray-100">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-3 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
              <div className="h-6 w-10 bg-gray-100 rounded-full animate-pulse" />
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
      </header>
      <main className="max-w-2xl mx-auto bg-white shadow-sm rounded-lg mt-4 mx-4 sm:mx-auto overflow-hidden">
        <div className="p-3 border-b border-gray-200 flex gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>
        <ul>
          {[...Array(6)].map((_, i) => (
            <li key={i} className="px-4 py-3 border-b border-gray-100">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-3/4" />
              <div className="flex gap-2">
                <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-10 bg-gray-100 rounded animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

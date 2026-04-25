export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-20 bg-[#0d0014] border-b border-[rgba(255,0,204,0.3)]">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="h-3 w-16 bg-[#1e002e] rounded animate-pulse" />
          <div className="h-3 w-20 bg-[#160022] rounded animate-pulse" />
        </div>
      </header>

      <div className="h-0.5 bg-[#ff00cc] animate-pulse w-2/3" style={{ boxShadow: "0 0 8px #ff00cc" }} />

      <div className="bg-[#0d0014] border-b border-[rgba(255,0,204,0.3)] px-4 py-3">
        <div className="h-10 w-full bg-[#160022] rounded-xl animate-pulse" />
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="max-w-2xl mx-auto">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-4 py-4 border-b border-[rgba(255,0,204,0.1)]">
              <div
                className="h-4 bg-[#1e002e] rounded animate-pulse mb-3"
                style={{ width: `${65 + (i % 3) * 12}%` }}
              />
              <div className="flex gap-2">
                <div className="h-5 w-14 bg-[#160022] rounded-full animate-pulse" />
                <div className="h-5 w-10 bg-[#160022] rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

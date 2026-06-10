export default function Loading() {
  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 56px)" }}>
      {/* Sidebar skeleton (desktop) */}
      <aside className="hidden md:block w-[260px] min-w-[260px] bg-white border-r border-[rgba(68,68,65,0.12)] p-[18px]">
        <div className="h-14 bg-gray-50 rounded-md animate-pulse mb-5" />
        <div className="h-3 w-20 bg-gray-50 rounded animate-pulse mb-3" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-50 rounded-md animate-pulse mb-1.5" />
        ))}
      </aside>

      <main className="flex-1 p-4 sm:p-6 bg-bg">
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-[86px] bg-white rounded-md border border-[rgba(68,68,65,0.12)] animate-pulse"
            />
          ))}
        </div>
        {/* Cards skeleton */}
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-36 bg-white rounded-lg border border-[rgba(68,68,65,0.12)] animate-pulse mb-2.5"
          />
        ))}
      </main>
    </div>
  );
}

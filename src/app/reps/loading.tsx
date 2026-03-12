export default function RepsLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 bg-gray-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-4 w-56 bg-gray-100 dark:bg-slate-800 rounded mt-2" />
        </div>
        <div className="h-10 w-10 bg-gray-200 dark:bg-slate-700 rounded-full" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800">
            <div className="h-4 w-16 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
            <div className="h-7 w-20 bg-gray-200 dark:bg-slate-700 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Content cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800">
            <div className="h-5 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }, (_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-gray-100 dark:bg-slate-800 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 w-full bg-gray-100 dark:bg-slate-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

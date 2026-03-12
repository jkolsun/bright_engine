export default function AdminLoading() {
  return (
    <div className="p-8 space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div>
        <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded-lg" />
        <div className="h-4 w-72 bg-gray-100 dark:bg-slate-800 rounded mt-2" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 w-20 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="h-5 w-5 bg-gray-200 dark:bg-slate-700 rounded" />
            </div>
            <div className="h-8 w-28 bg-gray-200 dark:bg-slate-700 rounded-lg" />
            <div className="h-3 w-24 bg-gray-100 dark:bg-slate-800 rounded mt-3" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 p-6">
        <div className="h-6 w-40 bg-gray-200 dark:bg-slate-700 rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-24 bg-gray-100 dark:bg-slate-800 rounded" />
              <div className="h-4 w-32 bg-gray-100 dark:bg-slate-800 rounded" />
              <div className="h-4 w-20 bg-gray-100 dark:bg-slate-800 rounded" />
              <div className="flex-1" />
              <div className="h-4 w-16 bg-gray-100 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

import { Loader2 } from 'lucide-react'

export default function RepsLoading() {
  return (
    <div className="p-8 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 size={48} className="text-gray-400 dark:text-gray-500 mx-auto mb-4 animate-spin" />
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  )
}

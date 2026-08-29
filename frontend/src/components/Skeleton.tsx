
export function SkeletonRow({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className="animate-pulse">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="px-5 py-4">
              <div
                className="h-4 bg-[#EEF0FA] rounded-md"
                style={{
                  width: cIdx === 0 ? '70%' : cIdx === cols - 1 ? '40%' : '85%',
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function SkeletonCard({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden flex flex-col h-full animate-pulse premium-shadow-sm"
        >
          {/* Card Image Area placeholder */}
          <div className="aspect-[4/3] bg-[#EEF0FA] w-full relative" />
          
          {/* Card Body */}
          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <div className="h-4 bg-[#EEF0FA] rounded w-3/4" />
              <div className="h-3 bg-[#EEF0FA] rounded w-1/3" />
            </div>
            
            <div className="pt-2 border-t border-[#E2E8F0]/50 flex justify-between items-center">
              <div className="h-4 bg-[#EEF0FA] rounded-full w-20" />
              <div className="w-6 h-6 rounded-full bg-[#EEF0FA]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonMetrics({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm flex items-center justify-between animate-pulse"
        >
          <div className="space-y-2.5 flex-1">
            <div className="h-3 bg-[#EEF0FA] rounded w-24" />
            <div className="h-6 bg-[#EEF0FA] rounded w-36" />
            <div className="h-3 bg-[#EEF0FA] rounded w-20" />
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#EEF0FA] shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart() {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-sm animate-pulse space-y-4">
      <div className="h-4 bg-[#EEF0FA] rounded w-44" />
      <div className="flex items-end justify-between gap-4 pt-4 border-b border-[#E2E8F0]" style={{ height: '180px' }}>
        {[75, 45, 90, 60, 80, 50, 70].map((h, i) => (
          <div key={i} className="flex-1 flex justify-center items-end gap-1 h-full">
            <div className="w-5 bg-[#EEF0FA] rounded-t-sm" style={{ height: `${h}%` }} />
            <div className="w-3 bg-[#EEF0FA]/70 rounded-t-sm" style={{ height: `${h * 0.7}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-2 bg-[#EEF0FA] rounded w-8" />
        ))}
      </div>
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E2E8F0] animate-pulse"
        >
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-[#EEF0FA] rounded w-1/2" />
            <div className="h-3 bg-[#EEF0FA] rounded w-1/4" />
          </div>
          <div className="h-5 bg-[#EEF0FA] rounded w-16" />
        </div>
      ))}
    </div>
  )
}

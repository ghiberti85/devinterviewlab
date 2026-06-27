export default function StatsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-32 bg-muted rounded" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border rounded-xl p-4 space-y-2">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-8 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="border rounded-xl p-5 space-y-4">
        <div className="h-5 w-40 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-lg" />
      </div>
      <div className="border rounded-xl p-5 space-y-3">
        <div className="h-5 w-36 bg-muted rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  )
}

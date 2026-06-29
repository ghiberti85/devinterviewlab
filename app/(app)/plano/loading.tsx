export default function PlanoLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-muted rounded" />
      <div className="h-4 w-72 bg-muted rounded" />
      <div className="border rounded-xl p-6 space-y-4">
        <div className="h-5 w-40 bg-muted rounded" />
        <div className="h-24 bg-muted rounded-lg" />
        <div className="h-10 w-36 bg-muted rounded-md" />
      </div>
      {[...Array(2)].map((_, i) => (
        <div key={i} className="border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-56 bg-muted rounded" />
            <div className="h-5 w-16 bg-muted rounded" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

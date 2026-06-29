export default function RevisarLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-36 bg-muted rounded" />
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-9 w-28 bg-muted rounded-md" />
        ))}
      </div>
      <div className="flex gap-3">
        <div className="h-9 flex-1 bg-muted rounded-md" />
        <div className="h-9 w-32 bg-muted rounded-md" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-16 bg-muted rounded-full" />
              <div className="h-5 w-24 bg-muted rounded" />
            </div>
            <div className="h-5 w-3/4 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

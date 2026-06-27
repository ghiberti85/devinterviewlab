export default function LiveCodingLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-48 bg-muted rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="border rounded-xl p-4 space-y-3">
            <div className="h-5 w-24 bg-muted rounded" />
            <div className="flex gap-1">
              <div className="h-9 flex-1 bg-muted rounded-md" />
              <div className="h-9 flex-1 bg-muted rounded-md" />
            </div>
          </div>
          <div className="border rounded-xl p-4 space-y-3">
            <div className="h-5 w-20 bg-muted rounded" />
            <div className="flex gap-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 flex-1 bg-muted rounded-md" />
              ))}
            </div>
            <div className="h-5 w-16 bg-muted rounded" />
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 flex-1 bg-muted rounded-md" />
              ))}
            </div>
            <div className="h-10 w-full bg-muted rounded-md" />
          </div>
        </div>
        <div className="lg:col-span-2 border rounded-xl overflow-hidden">
          <div className="h-10 bg-muted/50 border-b" />
          <div className="h-[400px] bg-[#1e1e1e]/20" />
        </div>
      </div>
    </div>
  )
}

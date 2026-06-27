export default function SimularLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-7 w-52 bg-muted rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-4">
          <div className="border rounded-xl p-4 space-y-3">
            <div className="h-5 w-32 bg-muted rounded" />
            <div className="h-9 bg-muted rounded-md" />
            <div className="h-9 bg-muted rounded-md" />
          </div>
          <div className="border rounded-xl p-4 space-y-3">
            <div className="h-5 w-24 bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-5/6 bg-muted rounded" />
            <div className="h-10 w-full bg-muted rounded-md" />
          </div>
        </div>
        <div className="lg:col-span-2 border rounded-xl p-4 space-y-4">
          <div className="h-5 w-28 bg-muted rounded" />
          <div className="h-40 bg-muted rounded-lg" />
          <div className="h-10 w-full bg-muted rounded-md" />
        </div>
      </div>
    </div>
  )
}
